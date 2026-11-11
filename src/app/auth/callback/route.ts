import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, adminCookieOptions, signAdminSession } from "@/lib/adminSession";
import { ensureProfile, findKakaoAdmin } from "@/lib/auth";
import { safeNext } from "@/lib/safeNext";
import { getServerSupabase } from "@/lib/supabase/server";

/** 카카오 로그인이 끝나고 Supabase 가 돌려보내는 곳 — 세션을 만들고 회원 행을 준비한다 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeNext(searchParams.get("next"));
  const code = searchParams.get("code");
  const fail = (msg: string) => NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(msg)}&next=${encodeURIComponent(next)}`);
  if (!code) return fail("로그인이 취소됐어요");

  const supabase = await getServerSupabase();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) return fail("로그인에 실패했어요. 다시 시도해 주세요.");
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

  // 고객 — 회원 행 준비, 휴대폰이 없으면(카카오 전화번호 동의 전) 한 번 입력받는다
  const profile = await ensureProfile(user);
  if (!profile.phone || !profile.name) {
    return NextResponse.redirect(`${origin}/signup?next=${encodeURIComponent(next)}`);
  }
  return NextResponse.redirect(`${origin}${next}`);
}
