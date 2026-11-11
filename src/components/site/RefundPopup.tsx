"use client";

import { Fragment, useEffect, useState } from "react";
import { getMainContent } from "@/data/siteContent";

/*
 * 환불 규정 팝업 — 모든 페이지 공통. 푸터의 '환불 규정', 신청·결제의 '보기',
 * /guide?tab=refund 링크가 openRefund()로 연다. 내용은 디자인 모드 › 메인 페이지 › 푸터에서 편집.
 */
const EVT = "va-open-refund";
/** 팝업이 아직 이벤트를 듣기 전에 열기 요청이 오면 기억해 둔다 (페이지 effect가 레이아웃 effect보다 먼저 실행됨) */
let pending = false;

export function openRefund() {
  pending = true;
  window.dispatchEvent(new Event(EVT));
}

/** 링크처럼 보이는 여는 버튼 */
export function RefundLink({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <a
      href="#refund"
      className={className}
      onClick={(e) => {
        e.preventDefault();
        openRefund();
      }}
    >
      {children}
    </a>
  );
}

/** 마운트되자마자 팝업을 연다 (/guide?tab=refund 호환) */
export function RefundAutoOpen() {
  useEffect(() => {
    openRefund();
  }, []);
  return null;
}

export default function RefundPopup() {
  const [open, setOpen] = useState(false);
  const { footer: f } = getMainContent();

  useEffect(() => {
    const onOpen = () => {
      pending = false;
      setOpen(true);
    };
    window.addEventListener(EVT, onOpen);
    if (pending) queueMicrotask(onOpen);
    return () => window.removeEventListener(EVT, onOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="rf-bg" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
      <div className="rf-box" role="dialog" aria-modal="true" aria-label={f.rfTitle}>
        <div className="rf-head">
          <h2>{f.rfTitle}</h2>
          <button type="button" className="rf-x" onClick={() => setOpen(false)} aria-label="닫기">×</button>
        </div>
        <div className="rf-scroll">
          <table className="rf-table">
            <thead>
              <tr>
                {f.rfTh.map((h, i) => (
                  <th key={i} style={i === 0 ? { width: "22%" } : i === 2 ? { width: "20%" } : undefined}>{h.t}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {f.rfCats.map((c) => (
                <Fragment key={c.name}>
                  {c.rows.map((r, i) => (
                    <tr key={i}>
                      {i === 0 && (
                        <td className="cat" rowSpan={c.rows.length}>
                          {c.name}
                          {c.sub && <><br /><span>{c.sub}</span></>}
                        </td>
                      )}
                      <td>{r.c}</td>
                      <td className="hl">{r.r}</td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
        <div className="rf-note">
          <b>{f.rfNoteTitle}</b>
          {f.rfNote}
        </div>
        <button type="button" className="rf-close" onClick={() => setOpen(false)}>확인했어요</button>
      </div>
    </div>
  );
}
