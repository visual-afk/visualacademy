"use client";

import { useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";

/** 카카오 로그인 시작 — 카카오 → Supabase → /auth/callback?next= 순서로 돌아온다 */
export default function KakaoLoginButton({ next, label = "카카오로 시작하기" }: { next: string; label?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const start = async () => {
    setBusy(true);
    setError("");
    const { error } = await getBrowserSupabase().auth.signInWithOAuth({
      provider: "kakao",
      options: { redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (error) {
      setBusy(false);
      setError("카카오 로그인을 시작하지 못했어요. 잠시 후 다시 시도해 주세요.");
    }
  };

  return (
    <>
      <button type="button" className="kakao-btn" onClick={start} disabled={busy}>
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
          <path fill="currentColor" d="M12 3C6.48 3 2 6.58 2 11c0 2.84 1.86 5.33 4.66 6.75l-.95 3.48c-.08.3.26.54.52.37l4.15-2.75c.53.06 1.07.1 1.62.1 5.52 0 10-3.58 10-8s-4.48-7.95-10-7.95z" />
        </svg>
        {busy ? "카카오로 이동 중…" : label}
      </button>
      {error && <p className="auth-error">{error}</p>}
    </>
  );
}
