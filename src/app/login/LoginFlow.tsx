"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/common/useToast";
import SiteHeader from "@/components/site/SiteHeader";
import { ROUTES } from "@/data/site";
import { getLoginContent } from "@/data/siteContent";
import { login } from "@/lib/loginState";
import { getBrowserSupabase } from "@/lib/supabase/client";

/*
 * 카카오 로그인 · 가입 (일반 회원가입 없음)
 * 카카오로 시작하기 → 카카오 동의 화면 → 처음 오는 회원: 정보 확인 + 약관 동의 → 가입 완료
 *                                     → 이미 가입한 회원: 바로 로그인
 * real(Supabase 키 있음): 카카오 → /auth/callback → 처음이면 /signup(정보·약관) → next 로 이동
 * 목업: 동의 화면과 회원 정보는 예시. 실제 버튼은 카카오 디자인 가이드를 따라야 한다.
 */

type Who = "new" | "old";
type Screen = { kind: "start" } | { kind: "loading" } | { kind: "profile" } | { kind: "done"; who: Who; name: string };

const KAKAO_NAME = "김민지";
const KAKAO_PHONE = "010-1234-5678";

function KakaoIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#191919" aria-hidden>
      <path d="M12 3C6.5 3 2 6.5 2 10.8c0 2.8 1.8 5.2 4.6 6.6l-1 3.6c-.1.3.2.5.5.4l4.2-2.8c.6.1 1.1.1 1.7.1 5.5 0 10-3.5 10-7.8S17.5 3 12 3z" />
    </svg>
  );
}

export default function LoginFlow({ next, real = false, error = "" }: { next: string | null; real?: boolean; error?: string }) {
  const C = getLoginContent();
  const [who, setWho] = useState<Who>("new");
  const [screen, setScreen] = useState<Screen>({ kind: "start" });
  const [consent, setConsent] = useState(false);
  const [name, setName] = useState(KAKAO_NAME);
  const [shop, setShop] = useState("");
  const [agree, setAgree] = useState<boolean[]>(() => C.profile.agree.map(() => false));
  const { toast, showToast } = useToast(2400);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const show = (s: Screen) => {
    setScreen(s);
    window.scrollTo(0, 0);
  };
  const finish = (w: Who, n: string) => {
    login(n);
    show({ kind: "done", who: w, name: n });
  };
  const restart = () => {
    setConsent(false);
    setAgree(C.profile.agree.map(() => false));
    show({ kind: "start" });
  };

  /** 이미 동의한 계정은 카카오 동의 화면 없이 바로 로그인된다 */
  const startKakao = async () => {
    if (real) {
      show({ kind: "loading" });
      const { error } = await getBrowserSupabase().auth.signInWithOAuth({
        provider: "kakao",
        options: { redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next ?? "/mypage")}` },
      });
      if (error) {
        show({ kind: "start" });
        showToast("카카오 로그인을 시작하지 못했어요. 잠시 후 다시 시도해 주세요.");
      }
      return;
    }
    if (who === "old") {
      show({ kind: "loading" });
      timer.current = setTimeout(() => finish("old", KAKAO_NAME), 1100);
      return;
    }
    setConsent(true);
  };

  /* 약관: 앞 3개 필수, 마지막 1개 선택 */
  const required = agree.slice(0, 3);
  const canJoin = name.trim().length >= 2 && required.every(Boolean);

  let body: React.ReactNode;
  if (screen.kind === "start") {
    body = (
      <>
        <div className="lg-hero">
          <div className="big"><KakaoIcon size={34} /></div>
          <h1>{C.start.title}</h1>
          <p className="lead">{C.start.lead}</p>
        </div>
        <div className="card">
          <button type="button" className="kbtn" onClick={startKakao}>
            <KakaoIcon />
            {C.start.btn}
          </button>
          <ul className="notes">
            {C.start.notes.map((n) => <li key={n.t}>{n.t}</li>)}
          </ul>
        </div>
        <p className="small">{C.start.small}<br />처음이라면 <Link href={next ? ROUTES.signup(next) : ROUTES.signup()}>회원가입</Link></p>
        {error && <p className="small" role="alert" style={{ color: "#d33" }}>{error}</p>}
        {!real && <div className="test-who" role="group" aria-label="테스트용 회원 상태">
          <span>(테스트)</span>
          <button type="button" className={who === "new" ? "on" : ""} onClick={() => setWho("new")}>처음 오는 회원</button>
          <button type="button" className={who === "old" ? "on" : ""} onClick={() => setWho("old")}>이미 가입한 회원</button>
        </div>}
      </>
    );
  } else if (screen.kind === "loading") {
    body = (
      <div className="card">
        <div className="done">
          <div className="ic kakao"><KakaoIcon size={30} /></div>
          <h2>카카오로 로그인하고 있어요</h2>
          <p>잠시만 기다려주세요.</p>
        </div>
      </div>
    );
  } else if (screen.kind === "profile") {
    body = (
      <>
        <h1>{C.profile.title}</h1>
        <p className="lead">{C.profile.lead}</p>
        <div className="card">
          <div className="field">
            <label htmlFor="lg-name">이름</label>
            <input id="lg-name" type="text" value={name} onChange={(e) => setName(e.target.value)} />
            <div className="pre-note">{C.profile.nameNote}</div>
          </div>
          <div className="field">
            <label htmlFor="lg-phone">휴대폰 번호</label>
            <input id="lg-phone" type="text" value={KAKAO_PHONE} disabled />
            <div className="pre-note">{C.profile.phoneNote}</div>
          </div>
          <div className="field">
            <label htmlFor="lg-shop">{C.profile.shop}<span className="opt">(선택)</span></label>
            <input id="lg-shop" type="text" placeholder="매장명을 입력해주세요" value={shop} onChange={(e) => setShop(e.target.value)} />
          </div>
          <div className="agree">
            <label className="all">
              <input type="checkbox" checked={agree.every(Boolean)} onChange={(e) => setAgree(agree.map(() => e.target.checked))} />
              전체 동의
            </label>
            {C.profile.agree.map((a, i) => (
              <label key={i}>
                <input type="checkbox" checked={agree[i]} onChange={(e) => setAgree(agree.map((v, j) => (j === i ? e.target.checked : v)))} />
                <span className={`tag${i < 3 ? "" : " o"}`}>{i < 3 ? "필수" : "선택"}</span>
                {a.t}
                {i < 2 && (
                  <a className="view" href={i === 0 ? ROUTES.terms : ROUTES.privacy} target="_blank" rel="noreferrer">보기</a>
                )}
              </label>
            ))}
          </div>
          <button type="button" className="btn btn-mint submit" disabled={!canJoin} onClick={() => finish("new", name.trim())}>
            {C.profile.btn}
          </button>
        </div>
      </>
    );
  } else {
    const d = C.done;
    const isNew = screen.who === "new";
    body = (
      <div className="card">
        <div className="done">
          <div className="ic">✓</div>
          <h2>{(isNew ? d.newTitle : d.oldTitle).replace("{이름}", screen.name)}</h2>
          <p>{isNew ? d.newDesc : d.oldDesc}</p>
          <div className="btns">
            {/* 신청·결제에서 넘어왔으면 신청 화면으로 돌아간다 */}
            <Link className="btn btn-mint" href={next ?? ROUTES.classes}>{next ? "신청 계속하기" : d.btn1}</Link>
            <Link className="btn btn-ghost" href={ROUTES.mypage}>{d.btn2}</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <SiteHeader
        right={
          <button type="button" className="btn btn-mint btn-sm" onClick={restart}>카카오로 로그인</button>
        }
      />
      <main className="signup">{body}</main>

      {consent && (
        <div className="kmodal" onClick={(e) => e.target === e.currentTarget && setConsent(false)}>
          <div className="kbox" role="dialog" aria-modal="true" aria-label="카카오 로그인 동의">
            <div className="khead"><KakaoIcon size={18} /> 카카오 로그인</div>
            <div className="kbody">
              <h3>비주얼아카데미에서<br />아래 정보를 요청해요</h3>
              <p>동의하면 가입과 로그인이 한 번에 끝나요.</p>
              <div className="kitems">
                <div>이름<span>필수</span></div>
                <div>휴대폰 번호<span>필수</span></div>
                <div>이메일<span>선택</span></div>
              </div>
            </div>
            <div className="kfoot">
              <button type="button" className="btn y" onClick={() => { setConsent(false); show({ kind: "profile" }); }}>동의하고 계속하기</button>
              <button type="button" className="btn btn-ghost" onClick={() => setConsent(false)}>취소</button>
            </div>
          </div>
        </div>
      )}
      {toast}
    </>
  );
}
