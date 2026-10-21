"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ROUTES } from "@/data/site";
import { getClass, getClassDetail } from "@/lib/api";
import { fullDate, taxNote, today, won } from "@/lib/format";
import { CATEGORY_LABELS, computeStatus } from "@/lib/status";
import type { AcademyClass } from "@/lib/types";

type Step = 2 | 3 | 4;
type PayState = "idle" | "processing" | "fail";

const FLOW_LABELS = ["클래스 상세", "신청 정보", "결제", "완료"];
const METHODS = [
  { k: "card", label: "신용·체크카드", sub: "국내 모든 카드사" },
  { k: "easy", label: "간편결제", sub: "카카오페이 · 네이버페이 · 토스페이" },
  { k: "transfer", label: "실시간 계좌이체", sub: "모든 은행" },
  { k: "vaccount", label: "가상계좌", sub: "무통장 입금" },
] as const;
type MethodKey = (typeof METHODS)[number]["k"];

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

function pad(n: number) {
  return String(n).padStart(2, "0");
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

export default function CheckoutFlow({ slug }: { slug: string | null }) {
  const c = getClass(slug);
  const [step, setStep] = useState<Step>(2);
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState({ name: "", phone: "", email: "", shop: "" });
  const [formError, setFormError] = useState("");
  const [method, setMethod] = useState<MethodKey | null>(null);
  const [payState, setPayState] = useState<PayState>("idle");
  const [simulateFail, setSimulateFail] = useState(false);
  const [orderNo, setOrderNo] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

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
  const footer = <footer className="co-footer">비주얼아카데미 프로토타입 화면 — 실제 결제는 진행되지 않아요</footer>;

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
    { k: "refund", label: "환불 규정을 확인했어요", link: ROUTES.guide("refund") },
    { k: "terms", label: "이용약관 및 개인정보 수집에 동의해요", link: ROUTES.guide("faq") },
  ];
  const allChecked = requiredChecks.every((r) => checks[r.k]);
  const isVaccount = method === "vaccount";
  const isOnline = c.type === "online";

  const toPay = () => {
    if (!form.name.trim() || !/^01[0-9]-?\d{3,4}-?\d{4}$/.test(form.phone.trim())) {
      setFormError("이름과 휴대폰 번호(010-0000-0000)를 정확히 입력해주세요");
      return;
    }
    setFormError("");
    go(3);
  };

  /* PG(토스페이먼츠) 연동 전 결제 시뮬레이션 */
  const pay = () => {
    setPayState("processing");
    window.scrollTo(0, 0);
    timer.current = setTimeout(() => {
      if (simulateFail) {
        setPayState("fail");
        return;
      }
      const t = today();
      const ymd = `${t.getFullYear()}${pad(t.getMonth() + 1)}${pad(t.getDate())}`;
      setOrderNo(`VA-${ymd}-${String(Math.floor(Math.random() * 9000) + 1000)}`);
      setPayState("idle");
      go(4);
    }, 1800);
  };

  const vaDeadline = (() => {
    const t = today();
    t.setDate(t.getDate() + 2);
    return `${t.getFullYear()}.${pad(t.getMonth() + 1)}.${pad(t.getDate())} 23:59`;
  })();

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
                    {r.link && <Link className="cr-link" href={r.link} target="_blank">보기</Link>}
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
            <button type="button" className="btn btn-mint" disabled={!allChecked} onClick={toPay}>결제 단계로</button>
          </div>
        </div>
      </div>
    );
  } else if (step === 3 && payState === "processing") {
    body = (
      <div className="center-state">
        <div className="spinner" />
        <h2>결제를 확인하고 있어요</h2>
        <p>잠시만 기다려주세요. 창을 닫지 마세요.</p>
      </div>
    );
  } else if (step === 3 && payState === "fail") {
    body = (
      <div className="center-state">
        <div className="result-icon fail">✕</div>
        <h2>결제가 완료되지 않았어요</h2>
        <p>카드 한도 초과로 결제가 승인되지 않았어요.</p>
        <div className="fail-reason">결제 금액은 청구되지 않았어요. 다시 시도하시거나 다른 결제 수단을 이용해주세요.</div>
        <div className="center-actions">
          <button type="button" className="btn btn-mint" onClick={pay}>다시 결제하기</button>
          <button type="button" className="btn btn-ghost" onClick={() => { setMethod(null); setPayState("idle"); }}>다른 수단으로 결제하기</button>
        </div>
        <p className="refund-note">계속 문제가 있다면 카카오채널로 문의해주세요.</p>
      </div>
    );
  } else if (step === 3) {
    const cur = METHODS.find((m) => m.k === method);
    body = (
      <div className="pay-wrap">
        <h2>결제 수단을 선택해주세요</h2>
        <div className="pay-methods">
          {METHODS.map((m) => (
            <button key={m.k} type="button" className={`pmethod${method === m.k ? " on" : ""}`} onClick={() => setMethod(m.k)}>
              <span className="pm-label">{m.label}</span>
              <span className="pm-sub">{m.sub}</span>
            </button>
          ))}
        </div>
        <div className="pay-panel">
          {cur ? (
            <>
              <div className="pp-icon">{cur.label[0]}</div>
              <p><b>{cur.label}</b>로 결제를 진행해요</p>
              <p>토스페이먼츠 결제창이 연결돼요</p>
            </>
          ) : (
            <p>결제 수단을 선택해주세요</p>
          )}
        </div>
        <div className="pay-total"><span className="lbl">최종 결제 금액</span><span className="amt">{won(price)}</span></div>
        <p className="tax-note">{taxNote(price, c.taxType)}</p>
        <button type="button" className="btn btn-mint" disabled={!method} onClick={pay}>{won(price)} 결제하기</button>
        <button type="button" className="btn btn-ghost" onClick={() => go(2)}>이전 단계로</button>
        <label className="sim">
          <input type="checkbox" checked={simulateFail} onChange={(e) => setSimulateFail(e.target.checked)} />
          (테스트) 결제 실패 시뮬레이션
        </label>
      </div>
    );
  } else {
    const notes = d.doneNotes ?? [];
    body = (
      <div className="done-wrap">
        <div className="result-icon ok">✓</div>
        <h2>{isVaccount ? "신청이 접수됐어요" : "신청이 완료됐어요"}</h2>
        <p className="done-title">{c.name}</p>
        <div className="order-no">주문번호 {orderNo}</div>
        {isVaccount ? (
          <div className="waiting-box">
            입금을 기다리고 있어요
            <div className="wb-sub">가상계좌: 신한은행 110-123-456789 · 입금기한 {vaDeadline}까지 · {won(price)}</div>
          </div>
        ) : (
          <div className="done-panel">
            <h3>안내드려요</h3>
            <ul className="done-list">
              {notes.map((n) => <li key={n}>{n}</li>)}
            </ul>
          </div>
        )}
        <div className="done-cta">
          <Link className="btn btn-mint" href={isOnline && !isVaccount ? "/mypage?tab=online" : ROUTES.mypage}>
            {isOnline && !isVaccount ? "바로 수강하기" : "마이페이지에서 확인하기"}
          </Link>
          <Link className="btn btn-ghost" href={ROUTES.classes}>클래스 목록으로 돌아가기</Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {topbar}
      <Flow step={step} slug={c.slug} />
      {body}
      {footer}
    </>
  );
}
