"use client";

import Link from "next/link";
import { Fragment, useMemo, useState } from "react";
import { useToast } from "@/components/common/useToast";
import { ROUTES } from "@/data/site";
import { taxBreakdown } from "@/lib/format";
import type { Payment } from "@/lib/types";

const STATUS = ["all", "결제완료", "부분환불", "환불완료", "입금대기"] as const;
const METHODS: { key: string; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "신용카드", label: "신용·체크카드" },
  { key: "간편결제", label: "간편결제" },
  { key: "계좌이체", label: "계좌이체" },
  { key: "가상계좌", label: "가상계좌" },
];
const REASONS = ["단순 변심", "일정 참석 불가", "중복 결제", "강의 내용 불만족", "기타"];

const fmt = (n: number) => n.toLocaleString("ko-KR");
function methodGroup(m: string) {
  if (m === "신용카드" || m === "체크카드") return "신용카드";
  // 토스는 간편결제를 제공사 이름(카카오페이·토스페이·페이코 등)으로 내려준다
  if (m === "간편결제" || m === "페이코" || m.endsWith("페이")) return "간편결제";
  return m;
}
function taxNote(p: Payment) {
  if (p.taxType === "exempt") return "면세";
  const { supply, vat } = taxBreakdown(p.amount, p.taxType);
  return `공급 ${fmt(supply)} + 부가세 ${fmt(vat)}`;
}
/** 고객 신청만 들어온 건(문서번호 없음)은 '신청됨' — 목업 데이터는 문서번호 없이 발행완료로 들어 있다 */
function invoicePill(p: Payment) {
  const i = p.invoice;
  if (!i) return { cls: "p-미발행", label: "미발행" };
  if (i.canceled) return { cls: "p-미발행", label: "발행취소" };
  if (i.requestedAt && !i.mgtKey) return { cls: "p-입금대기", label: "신청됨" };
  return { cls: "p-발행완료", label: "발행완료" };
}
function netAmount(p: Payment) {
  if (p.status === "환불완료") return 0;
  if (p.status === "부분환불") return p.amount - (p.refund?.amount ?? 0);
  return p.amount;
}
function nowStamp() {
  const d = new Date();
  const z = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())} ${z(d.getHours())}:${z(d.getMinutes())}`;
}

/** 지금 필터에 걸린 목록을 엑셀에서 바로 열리는 CSV(UTF-8 BOM)로 내려받는다 */
function downloadCsv(rows: Payment[]) {
  const head = ["주문번호", "클래스", "분류", "신청자", "결제수단", "결제금액", "과세", "공급가액", "부가세", "환불금액", "실수령액", "결제일시", "상태", "세금계산서", "사업자번호", "상호", "국세청 승인번호"];
  const cell = (v: string | number | undefined) => {
    const t = String(v ?? "");
    return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  const lines = rows.map((p) => {
    const { supply, vat } = taxBreakdown(p.amount, p.taxType);
    return [
      p.id, p.className, p.cat, p.applicant, p.method, p.amount, p.taxType === "exempt" ? "면세" : "과세", supply, vat,
      p.status === "환불완료" ? p.amount : p.refund?.amount ?? 0, netAmount(p), p.paidAt, p.status,
      invoicePill(p).label, p.invoice?.bizNo, p.invoice?.bizName, p.invoice?.ntsConfirmNum,
    ].map(cell).join(",");
  });
  const blob = new Blob(["\uFEFF" + [head.join(","), ...lines].join("\r\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `결제내역-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

type RefundDraft = { id: string; type: "full" | "partial"; amount: string; reason: string; memo: string; error: string };
type InvoiceDraft = { id: string; bizNo: string; bizName: string; ceo: string; email: string; error: string };

export default function Payments({ initial }: { initial: Payment[] }) {
  const [payments, setPayments] = useState<Payment[]>(() => initial.map((p) => ({ ...p })));
  const periods = useMemo(() => [...new Set(payments.map((p) => p.paidAt.slice(0, 7)))].sort().reverse(), [payments]);
  const [status, setStatus] = useState<string>("all");
  const [method, setMethod] = useState("all");
  const [period, setPeriod] = useState(periods[0] ?? "all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [refund, setRefund] = useState<RefundDraft | null>(null);
  const [invoice, setInvoice] = useState<InvoiceDraft | null>(null);
  const { toast, showToast } = useToast();

  const list = payments.filter((p) => {
    if (status !== "all" && p.status !== status) return false;
    if (method !== "all" && methodGroup(p.method) !== method) return false;
    if (period !== "all" && !p.paidAt.startsWith(period)) return false;
    if (search && !p.id.includes(search) && !p.applicant.includes(search) && !p.className.includes(search)) return false;
    return true;
  });

  const paidLike = list.filter((p) => p.status !== "입금대기");
  const gross = paidLike.reduce((s, p) => s + p.amount, 0);
  const refunded = paidLike.reduce((s, p) => s + (p.status === "환불완료" ? p.amount : p.status === "부분환불" ? p.refund?.amount ?? 0 : 0), 0);
  const refundCount = list.filter((p) => p.status === "환불완료" || p.status === "부분환불").length;
  const pendingCount = list.filter((p) => p.status === "입금대기").length;

  const patch = (id: string, change: Partial<Payment>) => setPayments((ps) => ps.map((p) => (p.id === id ? { ...p, ...change } : p)));

  const [refunding, setRefunding] = useState(false);
  const confirmRefund = async () => {
    if (!refund || refunding) return;
    const p = payments.find((x) => x.id === refund.id)!;
    let amount = p.amount;
    if (refund.type === "partial") {
      amount = parseInt(refund.amount.replace(/[^0-9]/g, ""), 10) || 0;
      if (amount <= 0 || amount >= p.amount) {
        setRefund({ ...refund, error: `환불 금액은 1원 이상 ${fmt(p.amount - 1)}원 이하로 입력해주세요` });
        return;
      }
    }
    setRefunding(true);
    let invoiceNote = "";
    try {
      const res = await fetch(`/api/admin/payments/${encodeURIComponent(p.id)}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: refund.type, amount, reason: refund.reason, memo: refund.memo }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRefund({ ...refund, error: data.error ?? "환불하지 못했어요" });
        return;
      }
      patch(p.id, {
        status: data.status,
        cancelRequested: false,
        refund: { type: data.status === "환불완료" ? "full" : "partial", amount: data.refunded, reason: refund.reason, refundedAt: nowStamp() },
        ...(data.invoice ? { invoice: data.invoice } : {}),
      });
      invoiceNote = data.invoiceNote ?? "";
    } finally {
      setRefunding(false);
    }
    setRefund(null);
    showToast(`${refund.type === "full" ? "전액 환불 처리했어요" : `${fmt(amount)}원 부분 환불 처리했어요`}${invoiceNote ? ` · ${invoiceNote}` : ""}`);
  };

  const [issuing, setIssuing] = useState(false);
  const confirmInvoice = async () => {
    if (!invoice || issuing) return;
    if (invoice.bizNo.replace(/[^0-9]/g, "").length !== 10) {
      setInvoice({ ...invoice, error: "사업자등록번호 10자리를 확인해주세요" });
      return;
    }
    if (!invoice.bizName.trim() || !invoice.ceo.trim() || !invoice.email.includes("@")) {
      setInvoice({ ...invoice, error: "상호·대표자명·이메일을 모두 입력해주세요" });
      return;
    }
    setIssuing(true);
    try {
      const res = await fetch(`/api/admin/payments/${encodeURIComponent(invoice.id)}/invoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bizNo: invoice.bizNo, bizName: invoice.bizName, ceo: invoice.ceo, email: invoice.email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setInvoice({ ...invoice, error: data.error ?? "발행하지 못했어요" });
        return;
      }
      patch(invoice.id, { invoice: data.invoice });
    } finally {
      setIssuing(false);
    }
    setInvoice(null);
    showToast(`발행했어요 · ${invoice.email}로 발송돼요`);
  };

  const formatBizNo = (v: string) => {
    const raw = v.replace(/[^0-9]/g, "").slice(0, 10);
    if (raw.length > 5) return `${raw.slice(0, 3)}-${raw.slice(3, 5)}-${raw.slice(5)}`;
    if (raw.length > 3) return `${raw.slice(0, 3)}-${raw.slice(3)}`;
    return raw;
  };

  const refundTarget = refund ? payments.find((p) => p.id === refund.id) : null;
  const invoiceTarget = invoice ? payments.find((p) => p.id === invoice.id) : null;

  return (
    <div className="wrap">
      <div className="page-head">
        <div>
          <p className="crumb"><Link href={ROUTES.admin}>관리자</Link> &nbsp;›&nbsp; 매출 관리</p>
          <h1>결제 관리</h1>
          <p>모든 결제 내역을 확인하고, 환불을 처리해요.</p>
        </div>
        <button type="button" className="btn btn-ghost" onClick={() => downloadCsv(list)} disabled={list.length === 0}>CSV 내보내기</button>
      </div>

      <div className="summary">
        <div className="sitem mint"><p className="sn">{fmt(gross - refunded)}원</p><p className="sl">순매출 (환불 차감)</p></div>
        <div className="sitem"><p className="sn">{list.length}건</p><p className="sl">전체 결제 건수</p></div>
        <div className="sitem danger"><p className="sn">{refundCount}건</p><p className="sl">환불 처리</p><p className="ssub">환불액 {fmt(refunded)}원</p></div>
        <div className="sitem warn"><p className="sn">{pendingCount}건</p><p className="sl">입금 대기 (가상계좌)</p></div>
      </div>

      <div className="filters">
        <div className="frow">
          <span className="flabel">상태</span>
          {STATUS.map((s) => (
            <button key={s} type="button" className={`fchip${status === s ? " on" : ""}`} onClick={() => setStatus(s)}>{s === "all" ? "전체" : s}</button>
          ))}
          <select className="period-select" aria-label="기간" value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="all">전체 기간</option>
            {periods.map((p) => (
              <option key={p} value={p}>{p.slice(0, 4)}년 {Number(p.slice(5))}월</option>
            ))}
          </select>
          <input className="search" placeholder="주문번호·이름·클래스명 검색" value={search} onChange={(e) => setSearch(e.target.value.trim())} />
        </div>
        <div className="frow">
          <span className="flabel">결제수단</span>
          {METHODS.map((m) => (
            <button key={m.key} type="button" className={`fchip${method === m.key ? " on" : ""}`} onClick={() => setMethod(m.key)}>{m.label}</button>
          ))}
        </div>
      </div>

      <div className="table-card">
        <div className="table-scroll">
          <table>
            <thead>
              <tr><th>주문정보</th><th>결제수단</th><th>금액</th><th>결제일시</th><th>상태</th><th>세금계산서</th><th>관리</th></tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <Fragment key={p.id}>
                  <tr>
                    <td>
                      <p className="cell-order">{p.id}</p>
                      <p className="cell-class">{p.className}</p>
                      <p className="cell-applicant">{p.applicant}</p>
                    </td>
                    <td>{p.method}</td>
                    <td>
                      <span className="cell-amt">{fmt(p.amount)}원</span>
                      <p className="cell-tax">{taxNote(p)}</p>
                    </td>
                    <td className="cell-date">{p.paidAt}</td>
                    <td><span className={`pill p-${p.status}`}>{p.status}</span></td>
                    <td><span className={`pill ${invoicePill(p).cls}`}>{invoicePill(p).label}</span></td>
                    <td>
                      <div className="row-actions">
                        {p.status === "환불완료" ? (
                          <button type="button" className="ca-btn" onClick={() => setExpanded(expanded === p.id ? null : p.id)}>상세</button>
                        ) : (
                          <>
                            <button type="button" className="ca-btn" onClick={() => setExpanded(expanded === p.id ? null : p.id)}>영수증</button>
                            {p.status === "부분환불" ? (
                              <button type="button" className="ca-btn" onClick={() => setExpanded(expanded === p.id ? null : p.id)}>환불 내역</button>
                            ) : p.status === "결제완료" ? (
                              <button type="button" className="ca-btn danger" onClick={() => setRefund({ id: p.id, type: "full", amount: "", reason: REASONS[0], memo: "", error: "" })}>환불 처리</button>
                            ) : null}
                          </>
                        )}
                        {(p.status === "결제완료" || p.status === "부분환불") && (
                          <button
                            type="button"
                            className="ca-btn"
                            onClick={() =>
                              setInvoice({ id: p.id, bizNo: p.invoice?.bizNo ?? "", bizName: p.invoice?.bizName ?? "", ceo: p.invoice?.ceo ?? "", email: p.invoice?.email ?? "", error: "" })
                            }
                          >
                            {invoicePill(p).label === "발행완료" ? "재발행" : "계산서 발행"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expanded === p.id && (
                    <tr className="detail-row">
                      <td colSpan={7}>
                        <div className="detail-inner">
                          <div><b>과세 구분</b><p>{p.taxType === "exempt" ? "면세" : "과세"}</p></div>
                          <div><b>공급가액 · 부가세</b><p>{taxNote(p)}</p></div>
                          <div><b>실수령액 (환불 반영)</b><p>{fmt(netAmount(p))}원</p></div>
                          <div><b>승인번호</b><p>{p.approvedNo ?? "-"}</p></div>
                          <div><b>분류</b><p>{p.cat}</p></div>
                          <div><b>결제일시</b><p>{p.paidAt}</p></div>
                          {p.invoice && (
                            <>
                              <div><b>세금계산서 · 사업자번호</b><p>{p.invoice.bizNo}</p></div>
                              <div><b>상호 · 대표자</b><p>{p.invoice.bizName} · {p.invoice.ceo}</p></div>
                              <div><b>수신 이메일 · 발행일시</b><p>{p.invoice.email}<br /><span className="sub">{p.invoice.issuedAt}</span></p></div>
                              {p.invoice.ntsConfirmNum && (
                                <div>
                                  <b>국세청 승인번호</b>
                                  <p>
                                    {p.invoice.ntsConfirmNum}
                                    <br />
                                    <a className="sub" href={`/api/admin/payments/${encodeURIComponent(p.id)}/invoice/view`} target="_blank" rel="noreferrer">팝빌에서 보기 ↗</a>
                                  </p>
                                </div>
                              )}
                            </>
                          )}
                          {p.refund && (
                            <div className="refund-note">환불 {fmt(p.refund.amount)}원 · 사유: {p.refund.reason} · 처리일시: {p.refund.refundedAt}</div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
        {list.length === 0 && <div className="empty-state">조건에 맞는 결제 내역이 없어요</div>}
      </div>

      {refund && refundTarget && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setRefund(null)}>
          <div className="modal" role="dialog" aria-modal="true">
            <h3>환불 처리</h3>
            <p className="m-sub">{refundTarget.className} · {refundTarget.applicant} · {refundTarget.id}</p>
            <div className="m-amt-row"><span className="lbl">결제 금액</span><span className="amt">{fmt(refundTarget.amount)}원</span></div>
            <div className="field">
              <span className="lbl">환불 유형</span>
              <div className="seg">
                <button type="button" className={refund.type === "full" ? "on" : undefined} onClick={() => setRefund({ ...refund, type: "full", error: "" })}>전액 환불</button>
                <button type="button" className={refund.type === "partial" ? "on" : undefined} onClick={() => setRefund({ ...refund, type: "partial", error: "" })}>부분 환불</button>
              </div>
            </div>
            {refund.type === "partial" && (
              <div className="field">
                <label htmlFor="rm-amt">환불 금액</label>
                <input
                  id="rm-amt"
                  type="text"
                  inputMode="numeric"
                  placeholder="예) 50,000"
                  value={refund.amount}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9]/g, "");
                    setRefund({ ...refund, amount: raw ? parseInt(raw, 10).toLocaleString("ko-KR") : "", error: "" });
                  }}
                />
              </div>
            )}
            <div className="field">
              <label htmlFor="rm-reason">환불 사유</label>
              <select id="rm-reason" value={refund.reason} onChange={(e) => setRefund({ ...refund, reason: e.target.value })}>
                {REASONS.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="rm-memo">메모 (선택, 신청자에게 노출되지 않아요)</label>
              <textarea id="rm-memo" placeholder="내부 확인용 메모" value={refund.memo} onChange={(e) => setRefund({ ...refund, memo: e.target.value })} />
            </div>
            {refund.error && <p className="err">{refund.error}</p>}
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setRefund(null)}>취소</button>
              <button type="button" className="btn btn-mint" onClick={confirmRefund} disabled={refunding}>{refunding ? "환불 중…" : "환불 처리"}</button>
            </div>
          </div>
        </div>
      )}

      {invoice && invoiceTarget && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setInvoice(null)}>
          <div className="modal" role="dialog" aria-modal="true">
            <h3>{invoiceTarget.taxType === "exempt" ? "계산서" : "세금계산서"} {invoicePill(invoiceTarget).label === "발행완료" ? "재발행" : "발행"}</h3>
            <p className="m-sub">{invoiceTarget.className} · {invoiceTarget.applicant} · {invoiceTarget.id}</p>
            <div className="m-amt-row">
              <span className="lbl">{invoiceTarget.taxType === "exempt" ? "면세 공급가액" : "공급가액 · 부가세"}</span>
              {/* 부분 환불된 건은 남은 금액으로 발행된다 */}
              <span className="amt sm">{invoiceTarget.taxType === "exempt" ? `${fmt(netAmount(invoiceTarget))}원` : taxNote({ ...invoiceTarget, amount: netAmount(invoiceTarget) })}</span>
            </div>
            <div className="field"><label htmlFor="im-bizno">사업자등록번호</label><input id="im-bizno" type="text" placeholder="123-45-67890" value={invoice.bizNo} onChange={(e) => setInvoice({ ...invoice, bizNo: formatBizNo(e.target.value), error: "" })} /></div>
            <div className="field"><label htmlFor="im-bizname">상호</label><input id="im-bizname" type="text" placeholder="예) 주식회사 비주얼" value={invoice.bizName} onChange={(e) => setInvoice({ ...invoice, bizName: e.target.value, error: "" })} /></div>
            <div className="field"><label htmlFor="im-ceo">대표자명</label><input id="im-ceo" type="text" placeholder="예) 홍길동" value={invoice.ceo} onChange={(e) => setInvoice({ ...invoice, ceo: e.target.value, error: "" })} /></div>
            <div className="field"><label htmlFor="im-email">수신 이메일 (세금계산서가 발송돼요)</label><input id="im-email" type="text" placeholder="example@company.com" value={invoice.email} onChange={(e) => setInvoice({ ...invoice, email: e.target.value, error: "" })} /></div>
            {invoice.error && <p className="err">{invoice.error}</p>}
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setInvoice(null)}>취소</button>
              <button type="button" className="btn btn-mint" onClick={confirmInvoice} disabled={issuing}>
                {issuing ? "발행 중…" : invoicePill(invoiceTarget).label === "발행완료" ? "재발행하기" : "발행하기"}
              </button>
            </div>
          </div>
        </div>
      )}
      {toast}
    </div>
  );
}
