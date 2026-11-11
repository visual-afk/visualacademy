"use client";

import { useActionState } from "react";
import { saveProfile, type ProfileFormState } from "./actions";

export default function ProfileForm({ next, name }: { next: string; name: string }) {
  const [state, action, pending] = useActionState<ProfileFormState, FormData>(saveProfile, { error: "" });
  return (
    <form action={action} className="auth-form">
      <input type="hidden" name="next" value={next} />
      <label>
        이름
        <input name="name" defaultValue={name} autoComplete="name" required />
      </label>
      <label>
        휴대폰 번호
        <input name="phone" inputMode="tel" placeholder="010-0000-0000" autoComplete="tel" required />
      </label>
      <label>
        근무 매장 <span className="opt">(선택)</span>
        <input name="shop" placeholder="예: 비주얼살롱 성수점" />
      </label>
      {state.error && <p className="auth-error">{state.error}</p>}
      <button type="submit" className="btn btn-mint" disabled={pending}>
        {pending ? "저장 중…" : "시작하기"}
      </button>
    </form>
  );
}
