"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { RefundLink } from "@/components/site/RefundPopup";
import { ROUTES } from "@/data/site";
import { getClassDetail } from "@/lib/classes";
import { fullDate, taxNote, won } from "@/lib/format";
import { useLoginName } from "@/lib/loginState";
import { CATEGORY_LABELS, computeStatus } from "@/lib/status";
import type { AcademyClass } from "@/lib/types";
import TossWidget, { type PendingOrder } from "./TossWidget";

/* 4단계(완료)는 토스 결제 후 /checkout/success 에서 서버가 보여준다 */
type Step = 2 | 3 | 4;

const FLOW_LABELS = ["클래스 상세", "신청 정보", "결제", "완료"];
function summaryRows(c: AcademyClass): [string, string][] {
  if (c.type === "online") {
    return [
      ["수강 기간", `결제일로부터 ${c.months}개월`],
      ["진도", "언제든 이어보기 가능"],
      ["형태", "VOD + 실습 자료 다운로드"],
    ];
  }
  return [
    ["개강일", c.date ? fullDate(c.date) : "미정"],
    ["시간", c.time ?? "-"],
    ["정원", `${c.capacity}명 중 ${c.applied}명 신청`],
    ["장소", c.place ?? "-"],
  ];
}

function Flow({ step, slug }: { step: Step; slug: string }) {
  return (
    <div className="flowbar">
      <div className="wrap">
        <div className="flow">
          {FLOW_LABELS.map((l, i) => {
            const n = i + 1;
            const cls = n < step ? "done" : n === step ? "current" : "";
            const inner = (
              <>
                <div className="fnum">{n < step ? "✓" : n}</div>
                <div className="flabel">{l}</div>
              </>
            );
            return (
              <span key={l} style={{ display: "contents" }}>
                {n === 1 && step < 4 ? (
                  <Link className={`flow-step ${cls}`} href={ROUTES.classDetail(slug)}>{inner}</Link>
                ) : (
                  <div className={`flow-step ${cls}`}>{inner}</div>
                )}
                {i < FLOW_LABELS.length - 1 && <div className={`flow-line${n < step ? " done" : ""}`} />}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const noop = () => () => {};
/** 하이드레이션이 끝났는지 — 서버 렌더와 첫 화면에서는 로그인 안내를 띄우지 않기 위해 */
function useHydrated() {
  return useSyncExternalStore(noop, () => true, () => false);
}

export type Prefill = { name: string; phone: string; email: string; shop: string };

/** loggedIn: 서버가 확인한 로그인 여부 (Supabase 키가 없는 목업 단계에선 undefined → 브라우저 표시를 따른다) */
export default function CheckoutFlow({ c, prefill, loggedIn }: { c: AcademyClass | undefined; prefill?: Prefill; loggedIn?: boolean }) {
  const [step, setStep] = useState<Step>(2);
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState(prefill ?? { name: "", phone: "", email: "", shop: "" });
  const [formError, setFormError] = useState("");
  const [order, setOrder] = useState<PendingOrder | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  /* 로그인 전이면 '로그인이 필요해요' 안내 → 카카오 로그인 화면 (로그인 후 이 신청 화면으로 돌아옴) */
  const loginName = useLoginName();
  const hydrated = useHydrated();
  const [gateClosed, setGateClosed] = useState(false);
  const [gateAgain, setGateAgain] = useState(false);
  const needLogin = hydrated && !(loggedIn ?? loginName);
  const showGate = needLogin && (!gateClosed || gateAgain);

  const closeGate = () => {
    setGateClosed(true);
    setGateAgain(false);
  };

  const go = (s: Step) => {
    setStep(s);
    window.scrollTo(0, 0);
  };

  const topbar = (
    <div className="topbar">
      <div className="wrap topbar-inner">
        <Link href={ROUTES.home} className="co-logo"><span className="dot" />비주얼아카데미</Link>
        {c && (
          <div className="crumb">
            <Link href={ROUTES.classes}>클래스</Link> &nbsp;›&nbsp; <Link href={ROUTES.classList(c.cat)}>{CATEGORY_LABELS[c.cat]}</Link> &nbsp;›&nbsp; {c.name}
          </div>
        )}
      </div>
    </div>
  );
  const footer = <footer className="co-footer">결제는 토스페이먼츠로 안전하게 처리돼요 · (주)비주얼뷰티</footer>;

  /* 신청할 수 없는 클래스 */
  const status = c ? computeStatus(c) : null;
  const purchasable = c && c.price !== null && !["종료", "마감", "개설대기", "개설예정"].includes(status!);
  if (!c || !purchasable) {
    return (
      <>
        {topbar}
        <div className="center-state">
          <div className="result-icon fail">!</div>
          <h2>{c ? "지금은 신청할 수 없는 클래스예요" : "클래스를 찾을 수 없어요"}</h2>
          <p>{c ? `현재 상태: ${status}` : "신청할 클래스를 먼저 선택해주세요."}</p>
          <div className="center-actions">
            {c && <Link className="btn btn-mint" href={ROUTES.classDetail(c.slug)}>클래스 상세로 돌아가기</Link>}
            <Link className="btn btn-ghost" href={ROUTES.classes}>클래스 목록 보기</Link>
          </div>
        </div>
        {footer}
      </>
    );
  }

  const d = getClassDetail(c);
  const price = c.price!;
  const requiredChecks = [
    ...(d.needPrereq ? [{ k: "prereq", label: "선수 과정 이수 여부를 확인했어요", link: null }] : []),
    { k: "refund", label: "환불 규정을 확인했어요", link: "refund" },
    { k: "terms", label: "이용약관 및 개인정보 수집에 동의해요", link: ROUTES.privacy },
  ];
  const allChecked = requiredChecks.every((r) => checks[r.k]);

  /* 결제 단계로 — 서버에 주문을 만들어 주문번호·금액을 받는다 (금액은 서버가 정함) */
  const toPay = async () => {
    if (needLogin) {
      setGateAgain(true);
      return;
    }
    if (!form.name.trim() || !/^01[0-9]-?\d{3,4}-?\d{4}$/.test(form.phone.trim())) {
      setFormError("이름과 휴대폰 번호(010-0000-0000)를 정확히 입력해주세요");
      return;
    }
    setFormError("");
    setBusy(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: c.slug, applicant: form, agreements: checks }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(data.error ?? "신청서를 저장하지 못했어요. 잠시 후 다시 시도해주세요.");
        return;
      }
      if (data.free) {
        router.push(`/checkout/success?free=1&orderId=${encodeURIComponent(data.orderNo)}`);
        return;
      }
      setOrder(data as PendingOrder);
      go(3);
    } finally {
      setBusy(false);
    }
  };

  let body: React.ReactNode;
  if (step === 2) {
    body = (
      <div className="wrap">
        <div className="order-grid">
          <div>
            <div className="panel">
              <h3>신청자 정보</h3>
              {(
                [
                  ["name", "이름", "홍길동", "text"],
                  ["phone", "휴대폰 번호", "010-0000-0000", "tel"],
                  ["email", "이메일", "example@email.com", "email"],
                  ["shop", "근무 매장 (선택)", "매장명을 입력해주세요", "text"],
                ] as const
              ).map(([k, label, ph, type]) => (
                <div key={k} className="field">
                  <label htmlFor={`co-${k}`}>{label}</label>
                  <input id={`co-${k}`} type={type} placeholder={ph} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
                </div>
              ))}
              {formError && <div className="field"><p className="err">{formError}</p></div>}
            </div>

            <div className="panel">
              <h3>확인 사항</h3>
              {requiredChecks.map((r) => (
                <label key={r.k} className="check-row">
                  <input type="checkbox" checked={!!checks[r.k]} onChange={(e) => setChecks({ ...checks, [r.k]: e.target.checked })} />
                  <div>
                    <span className="cr-title">{r.label}</span>
                    {r.link === "refund" ? (
                      <RefundLink className="cr-link">보기</RefundLink>
                    ) : (
                      r.link && <Link className="cr-link" href={r.link} target="_blank">보기</Link>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="summary-box">
            <p className="sb-title">{CATEGORY_LABELS[c.cat]}</p>
            <p className="sb-class">{c.name}</p>
            <dl>
              {summaryRows(c).map(([k, v]) => (
                <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
              ))}
            </dl>
            <div className="sb-total"><span className="lbl">결제 예정 금액</span><span className="amt">{won(price)}</span></div>
            <p className="tax-note">{taxNote(price, c.taxType)}</p>
            <button type="button" className="btn btn-mint" disabled={!allChecked || busy} onClick={toPay}>{busy ? "신청서 저장 중…" : price === 0 ? "무료로 신청하기" : "결제 단계로"}</button>
          </div>
        </div>
      </div>
    );
  } else {
    body = order && (
      <TossWidget order={order} customer={form} slug={c.slug} onBack={() => go(2)} taxLine={taxNote(price, c.taxType)} />
    );
  }

  return (
    <>
      {topbar}
      <Flow step={step} slug={c.slug} />
      {body}
      {footer}
      {showGate && (
        <div className="login-gate" onClick={(e) => e.target === e.currentTarget && closeGate()}>
          <div className="lg-box" role="dialog" aria-modal="true" aria-label="로그인이 필요해요">
            <h3>로그인이 필요해요</h3>
            <p>카카오 계정으로 로그인하면 바로 신청할 수 있어요.</p>
            <Link className="lg-kakao" href={ROUTES.login(ROUTES.checkout(c.slug))}>카카오로 로그인</Link>
            <button type="button" className="lg-close" onClick={closeGate}>닫기</button>
          </div>
        </div>
      )}
    </>
  );
}
