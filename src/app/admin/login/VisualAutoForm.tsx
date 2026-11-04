"use client";

import { useActionState } from "react";
import { loginWithVisualAuto, type AdminLoginState } from "./actions";

export default function VisualAutoForm() {
  const [state, action, pending] = useActionState<AdminLoginState, FormData>(loginWithVisualAuto, { error: "" });
  return (
    <form action={action} className="auth-form">
      <label>
        visual-auto 아이디
        <input name="loginId" placeholder="휴대폰 번호 또는 아이디" autoComplete="username" required />
      </label>
      <label>
        비밀번호
        <input name="password" type="password" autoComplete="current-password" required />
      </label>
      {state.error && <p className="auth-error">{state.error}</p>}
      <button type="submit" className="btn btn-mint" disabled={pending}>
        {pending ? "확인 중…" : "visual-auto 계정으로 로그인"}
      </button>
    </form>
  );
}
