import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, adminCookieOptions, signAdminSession } from "@/lib/adminSession";
import { ensureProfile, fetchKakaoAccount, findKakaoAdmin } from "@/lib/auth";
import { safeNext } from "@/lib/safeNext";
import { getServerSupabase } from "@/lib/supabase/server";

/** 카카오 로그인이 끝나고 Supabase 가 돌려보내는 곳 — 세션을 만들고 회원 행을 준비한다 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeNext(searchParams.get("next"));
  const code = searchParams.get("code");
  const fail = (msg: string) => NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(msg)}&next=${encodeURIComponent(next)}`);
  // 카카오 동의 실패·Supabase 설정 문제는 code 대신 error_description 으로 돌아온다 — 원인을 화면에 그대로 보여준다
  const reason = searchParams.get("error_description") ?? searchParams.get("error");
  if (reason) {
    console.error("[auth/callback]", searchParams.get("error"), searchParams.get("error_code"), reason);
    return fail(reason === "access_denied" ? "카카오 동의를 취소했어요" : `카카오 로그인 실패: ${reason}`);
  }
  if (!code) return fail("로그인이 취소됐어요");

  const supabase = await getServerSupabase();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    console.error("[auth/callback] exchange", error?.message);
    return fail(`로그인에 실패했어요 (${error?.message ?? "세션 없음"})`);
  }
  const user = data.user;

  // 관리자 화면에서 시작한 카카오 로그인 → 허용 목록 확인 후 관리자 쿠키 발급
  if (next.startsWith("/admin")) {
    const admin = await findKakaoAdmin(user);
    if (!admin) return NextResponse.redirect(`${origin}/admin/login?error=not_admin`);
    const { value, maxAge } = await signAdminSession({ sub: user.id, name: admin.name, via: "kakao" });
    const res = NextResponse.redirect(`${origin}${next}`);
    res.cookies.set(ADMIN_COOKIE, value, adminCookieOptions(maxAge));
    return res;
  }

  // 고객 — 회원 행 준비(카카오 이름·전화번호로 미리 채움). 약관 동의 전이면 가입 화면에서 확인받는다
  const profile = await ensureProfile(user, await fetchKakaoAccount(data.session?.provider_token));
  if (!profile.agreed_at || !profile.phone || !profile.name) {
    return NextResponse.redirect(`${origin}/signup?next=${encodeURIComponent(next)}`);
  }
  return NextResponse.redirect(`${origin}${next}`);
}
