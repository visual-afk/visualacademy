import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import KakaoLoginButton from "@/components/auth/KakaoLoginButton";
import { getUser } from "@/lib/auth";
import { safeNext } from "@/lib/safeNext";
import { supabaseConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = { title: "로그인" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = safeNext(typeof sp.next === "string" ? sp.next : null, "/mypage");
  const error = typeof sp.error === "string" ? sp.error : "";
  if (await getUser()) redirect(next);

  return (
    <div className="site pg-auth">
      <main className="auth-card">
        <Link href="/" className="auth-logo">VISUAL ACADEMY</Link>
        <h1>비주얼아카데미 시작하기</h1>
        <p className="auth-sub">카카오 계정으로 수강 신청 · 결제 · 수강 내역을 한 곳에서 관리해요.</p>
        {supabaseConfigured() ? (
          <KakaoLoginButton next={next} />
        ) : (
          <p className="auth-error">로그인 설정이 아직 연결되지 않았어요 (Supabase 키 필요)</p>
        )}
        {error && <p className="auth-error">{error}</p>}
        <p className="auth-foot">
          처음이면 카카오 로그인과 함께 회원가입이 돼요. 기존 아카데미 회원은 같은 휴대폰번호로 수강 내역이 이어져요.
        </p>
      </main>
    </div>
  );
}
