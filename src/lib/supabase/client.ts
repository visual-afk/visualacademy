"use client";

import { createBrowserClient } from "@supabase/ssr";

/** 브라우저용 — 카카오 로그인 시작(signInWithOAuth)에만 쓴다 */
export function getBrowserSupabase() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}
