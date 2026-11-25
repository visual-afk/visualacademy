"use client";

import Link from "next/link";
import { useState } from "react";
import { ROUTES } from "@/data/site";
import { formatPhone } from "@/lib/format";
import type { Applicant, WaitlistEntry } from "@/lib/applicants";

const ACTIVE = ["입금대기", "수강확정", "수강완료", "취소신청"];
const FILTERS = ["유효 신청", "입금대기", "취소신청", "신청취소", "전체"] as const;
const SOURCE: Record<string, string> = { web: "홈페이지", imweb: "아임웹 이관", manual: "수기 등록" };

const fmt = (n: number) => n.toLocaleString("ko-KR");

function csv(name: string, head: string[], rows: (string | number | null)[][]) {
  const cell = (v: string | number | null) => {
    const t = String(v ?? "");
    return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  const blob = new Blob(["﻿" + [head, ...rows].map((r) => r.map(cell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

type Cls = { name: string; capacity: number | null; date: string | null; type: string };

export default function Applicants({ cls, applicants, waitlist }: { cls: Cls; applicants: Applicant[]; waitlist: WaitlistEntry[] }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("유효 신청");
  const active = applicants.filter((a) => ACTIVE.includes(a.status));
  const list = applicants.filter((a) => (filter === "전체" ? true : filter === "유효 신청" ? ACTIVE.includes(a.status) : a.status === filter));
  const paid = active.filter((a) => a.status !== "입금대기").reduce((s, a) => s + a.amount, 0);
  const isWaitlist = cls.type === "waitlist" || cls.type === "upcoming";

  return (
    <div className="wrap">
      <div className="page-head">
        <div>
          <p className="crumb"><Link href={ROUTES.admin}>관리자</Link> &nbsp;›&nbsp; 신청자 목록</p>
          <h1>{cls.name}</h1>
          <p>{cls.date ? `개강 ${cls.date}` : "일정 미정"}{cls.capacity ? ` · 정원 ${cls.capacity}명` : ""}</p>
        </div>
        <button
          type="button"
          className="btn btn-ghost"
          disabled={list.length === 0}
          onClick={() =>
            csv(`신청자-${cls.name}`, ["주문번호", "이름", "휴대폰", "이메일", "근무 매장", "상태", "금액", "결제수단", "경로", "신청일시"],
              list.map((a) => [a.orderNo, a.name, formatPhone(a.phone), a.email, a.shop, a.status, a.amount, a.method, SOURCE[a.source] ?? a.source, a.appliedAt]))
          }
        >
          CSV 내보내기
        </button>
      </div>

      <div className="summary">
        <div className="sitem mint"><p className="sn">{active.length}{cls.capacity ? ` / ${cls.capacity}` : ""}명</p><p className="sl">유효 신청 (홈페이지 결제 기준)</p></div>
        <div className="sitem"><p className="sn">{fmt(paid)}원</p><p className="sl">결제 완료 금액</p></div>
        <div className="sitem warn"><p className="sn">{active.filter((a) => a.status === "입금대기").length}명</p><p className="sl">입금 대기</p></div>
        <div className="sitem danger"><p className="sn">{active.filter((a) => a.status === "취소신청").length}명</p><p className="sl">취소 요청 (환불 필요)</p></div>
      </div>

      <div className="filters">
        <div className="frow">
          <span className="flabel">상태</span>
          {FILTERS.map((f) => (
            <button key={f} type="button" className={`fchip${filter === f ? " on" : ""}`} onClick={() => setFilter(f)}>{f}</button>
          ))}
        </div>
      </div>

      <div className="table-card">
        <div className="table-scroll">
          <table>
            <thead>
              <tr><th>신청자</th><th>연락처</th><th>근무 매장</th><th>결제</th><th>신청일시</th><th>상태</th></tr>
            </thead>
            <tbody>
              {list.map((a) => (
                <tr key={a.orderNo}>
                  <td><p className="cell-class">{a.name}</p><p className="cell-order">{a.orderNo}</p></td>
                  <td><p className="cell-applicant">{formatPhone(a.phone)}</p><p className="cell-order">{a.email}</p></td>
                  <td className="cell-applicant">{a.shop || "-"}</td>
                  <td><span className="cell-amt">{a.amount ? `${fmt(a.amount)}원` : "무료"}</span><p className="cell-tax">{a.method}{a.source !== "web" ? ` · ${SOURCE[a.source] ?? a.source}` : ""}</p></td>
                  <td className="cell-date">{a.appliedAt}</td>
                  <td><span className={`pill p-${a.status === "수강확정" || a.status === "수강완료" ? "결제완료" : a.status === "신청취소" ? "환불완료" : "입금대기"}`}>{a.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {list.length === 0 && <div className="empty-state">신청자가 없어요</div>}
      </div>

      {(isWaitlist || waitlist.length > 0) && (
        <>
          <div className="page-head" style={{ paddingTop: 8 }}>
            <div>
              <h1 style={{ fontSize: 18 }}>개설 알림 신청 {waitlist.length}명</h1>
              <p>일정이 확정돼 공개하면 알림톡이 한 번 나가요.</p>
            </div>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={waitlist.length === 0}
              onClick={() => csv(`개설알림-${cls.name}`, ["이름", "휴대폰", "신청일시", "알림 발송"], waitlist.map((w) => [w.name, formatPhone(w.phone), w.requestedAt, w.notifiedAt ?? ""]))}
            >
              CSV 내보내기
            </button>
          </div>
          <div className="table-card">
            <div className="table-scroll">
              <table>
                <thead><tr><th>이름</th><th>휴대폰</th><th>신청일시</th><th>알림 발송</th></tr></thead>
                <tbody>
                  {waitlist.map((w) => (
                    <tr key={w.phone}>
                      <td className="cell-class">{w.name || "-"}</td>
                      <td className="cell-applicant">{formatPhone(w.phone)}</td>
                      <td className="cell-date">{w.requestedAt}</td>
                      <td className="cell-date">{w.notifiedAt ?? "아직"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {waitlist.length === 0 && <div className="empty-state">아직 알림 신청자가 없어요</div>}
          </div>
        </>
      )}
    </div>
  );
}
