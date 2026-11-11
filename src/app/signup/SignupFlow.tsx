"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import SiteHeader from "@/components/site/SiteHeader";
import { ROUTES } from "@/data/site";
import { getLoginContent } from "@/data/siteContent";
import { login } from "@/lib/loginState";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { saveSignup, type SignupState } from "./actions";

/*
 * 회원가입 — 카카오 연결 → 정보 입력·약관 동의 → 완료
 * real(Supabase 키 있음): 1단계는 실제 카카오 로그인 → /auth/callback → 다시 /signup 2단계
 * 목업: 1단계 버튼이 바로 2단계로 넘어가고, 완료 시 브라우저에만 로그인 표시
 */
const STEPS = ["카카오 연결", "정보 입력 · 약관 동의", "가입 완료"];
const AGREE_KEYS = ["terms", "privacy", "age", "marketing"] as const;

function KakaoIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#191919" aria-hidden>
      <path d="M12 3C6.5 3 2 6.5 2 10.8c0 2.8 1.8 5.2 4.6 6.6l-1 3.6c-.1.3.2.5.5.4l4.2-2.8c.6.1 1.1.1 1.7.1 5.5 0 10-3.5 10-7.8S17.5 3 12 3z" />
    </svg>
  );
}

function Steps({ now }: { now: number }) {
  return (
    <ol className="su-steps">
      {STEPS.map((s, i) => (
        <li key={s} className={i < now ? "done" : i === now ? "on" : ""}>
          <span>{i < now ? "✓" : i + 1}</span>
          {s}
        </li>
      ))}
    </ol>
  );
}

export default function SignupFlow({
  next,
  real,
  signedIn,
  prefill,
}: {
  next: string | null;
  real: boolean;
  signedIn: boolean;
  prefill: { name: string; phone: string };
}) {
  const C = getLoginContent();
  const [mockStep, setMockStep] = useState<0 | 1>(0);
  const [mockDone, setMockDone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [kakaoError, setKakaoError] = useState("");
  const [agree, setAgree] = useState<boolean[]>(() => AGREE_KEYS.map(() => false));
  const [state, action, pending] = useActionState<SignupState, FormData>(saveSignup, { error: "" });
  const [mockError, setMockError] = useState("");

  const doneName = state.done?.name ?? mockDone;
  const step = doneName ? 2 : real ? (signedIn ? 1 : 0) : mockStep;

  const startKakao = async () => {
    if (!real) {
      setMockStep(1);
      return;
    }
    setBusy(true);
    setKakaoError("");
    const back = next ? ROUTES.signup(next) : ROUTES.signup();
    const { error } = await getBrowserSupabase().auth.signInWithOAuth({
      provider: "kakao",
      options: { redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(back)}` },
    });
    if (error) {
      setBusy(false);
      setKakaoError("카카오 로그인을 시작하지 못했어요. 잠시 후 다시 시도해 주세요.");
    }
  };

  /* 목업 제출 — 서버 저장 없이 완료 화면으로 */
  const mockSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const name = String(new FormData(e.currentTarget).get("name") ?? "").trim();
    if (name.length < 2) return setMockError("이름을 입력해 주세요");
    if (!agree.slice(0, 3).every(Boolean)) return setMockError("필수 약관에 모두 동의해 주세요");
    login(name);
    setMockDone(name);
  };

  let body: React.ReactNode;
  if (step === 0) {
    body = (
      <>
        <h1>회원가입</h1>
        <p className="lead">카카오 계정으로 1분이면 가입할 수 있어요.</p>
        <div className="card">
          <button type="button" className="kbtn" onClick={startKakao} disabled={busy}>
            <KakaoIcon />
            {busy ? "카카오로 이동 중…" : "카카오로 가입하기"}
          </button>
          <ul className="notes">
            {C.start.notes.map((n) => <li key={n.t}>{n.t}</li>)}
          </ul>
          {kakaoError && <p className="su-error">{kakaoError}</p>}
        </div>
        <p className="small">
          이미 가입했다면 <Link href={next ? ROUTES.login(next) : ROUTES.login()}>로그인</Link>
        </p>
      </>
    );
  } else if (step === 1) {
    const error = real ? state.error : mockError;
    body = (
      <>
        <h1>{C.profile.title}</h1>
        <p className="lead">{C.profile.lead}</p>
        <form className="card" action={real ? action : undefined} onSubmit={real ? undefined : mockSubmit}>
          <div className="field">
            <label htmlFor="su-name">이름</label>
            <input id="su-name" name="name" type="text" defaultValue={prefill.name} autoComplete="name" required />
            {prefill.name && <div className="pre-note">{C.profile.nameNote}</div>}
          </div>
          <div className="field">
            <label htmlFor="su-phone">휴대폰 번호</label>
            <input id="su-phone" name="phone" type="tel" inputMode="tel" placeholder="010-0000-0000" defaultValue={prefill.phone} autoComplete="tel" required />
            <div className="pre-note">수강 안내 알림톡을 이 번호로 보내드려요 · 기존 아카데미 회원은 수강 내역이 이어져요</div>
          </div>
          <div className="field">
            <label htmlFor="su-shop">{C.profile.shop}<span className="opt">(선택)</span></label>
            <input id="su-shop" name="shop" type="text" placeholder="예: 비주얼살롱 성수점" />
          </div>
          <div className="agree">
            <label className="all">
              <input type="checkbox" checked={agree.every(Boolean)} onChange={(e) => setAgree(agree.map(() => e.target.checked))} />
              전체 동의
            </label>
            {C.profile.agree.map((a, i) => (
              <label key={AGREE_KEYS[i] ?? i}>
                <input
                  type="checkbox"
                  name={AGREE_KEYS[i]}
                  checked={agree[i] ?? false}
                  onChange={(e) => setAgree(agree.map((v, j) => (j === i ? e.target.checked : v)))}
                />
                <span className={`tag${i < 3 ? "" : " o"}`}>{i < 3 ? "필수" : "선택"}</span>
                {a.t}
              </label>
            ))}
          </div>
          {error && <p className="su-error">{error}</p>}
          <button type="submit" className="btn btn-mint submit" disabled={pending || !agree.slice(0, 3).every(Boolean)}>
            {pending ? "가입하는 중…" : "가입하기"}
          </button>
        </form>
      </>
    );
  } else {
    const d = C.done;
    body = (
      <div className="card">
        <div className="done">
          <div className="ic">✓</div>
          <h2>{d.newTitle.replace("{이름}", doneName ?? "")}</h2>
          <p>{d.newDesc}</p>
          <div className="btns">
            <Link className="btn btn-mint" href={next ?? ROUTES.classes}>{next ? "신청 계속하기" : d.btn1}</Link>
            <Link className="btn btn-ghost" href={ROUTES.mypage}>{d.btn2}</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <SiteHeader />
      <main className="signup">
        <Steps now={step} />
        {body}
      </main>
    </>
  );
}
