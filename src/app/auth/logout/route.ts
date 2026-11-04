import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE } from "@/lib/adminSession";
import { safeNext } from "@/lib/safeNext";
import { supabaseConfigured } from "@/lib/supabase/env";
import { getServerSupabase } from "@/lib/supabase/server";

/** 로그아웃 — 고객 세션과 관리자 쿠키를 함께 지운다 (POST 폼으로 호출) */
export async function POST(request: NextRequest) {
  if (supabaseConfigured()) await (await getServerSupabase()).auth.signOut();
  const next = safeNext(request.nextUrl.searchParams.get("next"));
  const res = NextResponse.redirect(new URL(next, request.url), { status: 303 });
  res.cookies.delete(ADMIN_COOKIE);
  return res;
}
