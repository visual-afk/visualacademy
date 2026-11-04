import type { Metadata } from "next";
import KakaoLoginButton from "@/components/auth/KakaoLoginButton";
import { supabaseConfigured } from "@/lib/supabase/env";
import VisualAutoForm from "./VisualAutoForm";

export const metadata: Metadata = { title: "관리자 로그인" };

const ERRORS: Record<string, string> = {
  not_admin: "이 카카오 계정은 관리자로 등록되어 있지 않아요. 본사에 등록을 요청해 주세요.",
};

export default async function AdminLoginPage({ searchParams }: PageProps<"/admin/login">) {
  const err = (await searchParams).error;
  const error = typeof err === "string" ? (ERRORS[err] ?? "") : "";
  return (
    <div className="site pg-auth">
      <main className="auth-card">
        <p className="auth-logo">비주얼아카데미 관리자</p>
        <h1>본사팀 로그인</h1>
        <p className="auth-sub">visual-auto 본사 계정 또는 관리자로 등록된 카카오 계정으로 들어올 수 있어요.</p>
        {error && <p className="auth-error">{error}</p>}
        <VisualAutoForm />
        {supabaseConfigured() && (
          <>
            <div className="auth-or"><span>또는</span></div>
            <KakaoLoginButton next="/admin" label="카카오로 로그인" />
          </>
        )}
      </main>
    </div>
  );
}
