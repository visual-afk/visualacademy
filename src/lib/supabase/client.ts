"use client";

import { createBrowserClient } from "@supabase/ssr";

/** Supabase 기본(닉네임·프로필 사진·이메일)에 더해 요청 — 카카오 동의항목에서 켜져 있어야 한다(꺼져 있으면 KOE205) */
export const KAKAO_EXTRA_SCOPES = "name phone_number";

/** 브라우저용 — 카카오 로그인 시작(signInWithOAuth)에만 쓴다 */
export function getBrowserSupabase() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}
