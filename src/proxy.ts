import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, adminGateEnabled, verifyAdminSession } from "@/lib/adminSession";

/*
 * 요청마다 ① Supabase 로그인 세션 갱신 ② 로그인이 필요한 화면 막기.
 * - /mypage, /checkout: 카카오 로그인 고객
 * - /admin/*, /api/admin/*: 관리자 서명 쿠키 (visual-auto 본사 계정 또는 허용된 카카오 계정)
 * Supabase 키가 아직 없으면(목업 단계) 고객 화면은 막지 않는다.
 */
const CUSTOMER_PATHS = ["/mypage", "/checkout"];
const matches = (path: string, base: string) => path === base || path.startsWith(base + "/");

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if ((matches(path, "/admin") && !matches(path, "/admin/login")) || matches(path, "/api/admin")) {
    if (adminGateEnabled() && !(await verifyAdminSession(request.cookies.get(ADMIN_COOKIE)?.value))) {
      if (path.startsWith("/api/")) return NextResponse.json({ error: "관리자 로그인이 필요해요" }, { status: 401 });
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && CUSTOMER_PATHS.some((p) => matches(path, p))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(path + request.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  // 정적 파일·이미지는 건너뛴다
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images/|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)"],
};
