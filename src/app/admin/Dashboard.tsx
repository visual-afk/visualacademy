"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useToast } from "@/components/common/useToast";
import { ROUTES } from "@/data/site";
import { getClasses } from "@/lib/api";
import { dayLabel, ddayLabel, today, won } from "@/lib/format";
import { CATEGORY_LABELS, computeStatus, stepLabel } from "@/lib/status";
import type { AcademyClass, ClassStatus } from "@/lib/types";

const STATUS_FILTERS = ["all", "모집중", "마감임박", "마감", "개설대기", "종료"] as const;
const CAT_FILTERS = ["all", "정석", "특강", "세미나", "경영", "온라인"] as const;
/** 최근 7일 결제 건수 추이 (샘플) — 백엔드: GET /api/admin/stats/daily */
const SPARK_7D = [14, 19, 16, 23, 21, 27, 24];

function computeRevenue(classes: AcademyClass[]) {
  let total = 0;
  let paidCount = 0;
  const catMap: Record<string, number> = {};
  for (const c of classes) {
    if (c.type === "waitlist" || c.type === "upcoming") continue; // 개설 대기·예정은 아직 결제 전
    const amt = (c.price ?? 0) * (c.applied ?? 0);
    total += amt;
    paidCount += c.applied ?? 0;
    catMap[c.cat] = (catMap[c.cat] ?? 0) + amt;
  }
  return { total, paidCount, catMap };
}

export default function Dashboard() {
  const [classes, setClasses] = useState<AcademyClass[]>(() => getClasses().map((c) => ({ ...c })));
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [catFilter, setCatFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [editingDate, setEditingDate] = useState<number | null>(null);
  const [confirmEnd, setConfirmEnd] = useState<AcademyClass | null>(null);
  const { toast, showToast } = useToast();

  const rows = useMemo(() => classes.map((c) => ({ ...c, status: computeStatus(c) as ClassStatus })), [classes]);
  const update = (id: number, patch: Partial<AcademyClass>) =>
    setClasses((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  const { total, paidCount, catMap } = computeRevenue(classes);
  const avg = paidCount ? Math.round(total / paidCount) : 0;
  const prevMonth = Math.round(total / 1.18); // 전월 매출 (샘플 비교값)
  const deltaPct = prevMonth ? Math.round(((total - prevMonth) / prevMonth) * 100) : 0;
  const maxSpark = Math.max(...SPARK_7D);
  const catEntries = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
  const maxCat = catEntries[0]?.[1] || 1;
  const t = today();
  const periodLabel = `${t.getFullYear()}.${String(t.getMonth() + 1).padStart(2, "0")}.01 ~ ${String(t.getMonth() + 1).padStart(2, "0")}.${String(t.getDate()).padStart(2, "0")}`;

  const count = (s: ClassStatus) => rows.filter((r) => r.status === s).length;
  const visible = rows.filter(
    (c) =>
      (statusFilter === "all" || c.status === statusFilter) &&
      (catFilter === "all" || c.cat === catFilter) &&
      (!search || c.name.includes(search)),
  );

  return (
    <div className="wrap">
      <div className="page-head">
        <div>
          <h1>클래스 관리</h1>
          <p>정원과 개강일만 입력하면 상태 배지는 자동으로 계산돼요.</p>
        </div>
        <Link className="btn btn-mint" href={ROUTES.adminNewClass}>+ 새 클래스 등록</Link>
      </div>

      <p className="section-label">매출 현황</p>
      <Link className="revenue-hero" href={ROUTES.adminPayments}>
        <div>
          <p className="rh-label">이번 달 누적 매출 (결제 완료 기준) <span className="rh-goto">결제 내역·환불 처리 보기 ›</span></p>
          <div className="rh-amt-row">
            <p className="rh-amt">{won(total)}</p>
            <span className={`rh-delta ${deltaPct >= 0 ? "up" : "down"}`}>{deltaPct >= 0 ? "▲" : "▼"} 전월 대비 {Math.abs(deltaPct)}%</span>
          </div>
          <p className="rh-period">{periodLabel} 기준 · 개설 대기(미결제) 신청자는 제외돼요</p>
        </div>
        <div className="spark-wrap">
          <p className="spark-label">최근 7일 결제 건수</p>
          <div className="spark">
            {SPARK_7D.map((v, i) => (
              <div key={i} className={`sbar${i === SPARK_7D.length - 1 ? " today" : ""}`} style={{ height: Math.max(8, Math.round((v / maxSpark) * 52)) }} title={`${v}건`} />
            ))}
          </div>
        </div>
      </Link>

      <div className="revenue-stats">
        <div className="sitem mint"><p className="sn">{won(total)}</p><p className="sl">총 결제 금액</p></div>
        <div className="sitem"><p className="sn">{paidCount}건</p><p className="sl">결제 건수</p></div>
        <div className="sitem"><p className="sn">{won(avg)}</p><p className="sl">평균 결제 금액</p></div>
        <div className="sitem"><p className="sn">0건</p><p className="sl">환불·취소</p></div>
      </div>

      <div className="cat-revenue">
        <h3>분류별 매출</h3>
        {catEntries.map(([cat, amt]) => (
          <div key={cat} className="cr-row">
            <span className="cr-label">{CATEGORY_LABELS[cat] ?? cat}</span>
            <div className="cr-track"><div className="cr-fill" style={{ width: `${Math.round((amt / maxCat) * 100)}%` }} /></div>
            <span className="cr-amt">{won(amt)}</span>
          </div>
        ))}
      </div>

      <p className="section-label">클래스 현황</p>
      <div className="summary">
        <div className="sitem"><p className="sn">{rows.length}</p><p className="sl">전체 클래스</p></div>
        <div className="sitem mint"><p className="sn">{count("모집중")}</p><p className="sl">모집중</p></div>
        <div className="sitem warn"><p className="sn">{count("마감임박")}</p><p className="sl">마감임박</p></div>
        <div className="sitem danger"><p className="sn">{count("마감")}</p><p className="sl">마감</p></div>
        <div className="sitem"><p className="sn">{count("개설대기")}</p><p className="sl">개설 대기중</p></div>
      </div>

      <div className="filters">
        <div className="frow">
          <span className="flabel">상태</span>
          {STATUS_FILTERS.map((s) => (
            <button key={s} type="button" className={`fchip${statusFilter === s ? " on" : ""}`} onClick={() => setStatusFilter(s)}>
              {s === "all" ? "전체" : s}
            </button>
          ))}
          <input className="search" placeholder="클래스명 검색" value={search} onChange={(e) => setSearch(e.target.value.trim())} />
        </div>
        <div className="frow">
          <span className="flabel">분류</span>
          {CAT_FILTERS.map((c) => (
            <button key={c} type="button" className={`fchip${catFilter === c ? " on" : ""}`} onClick={() => setCatFilter(c)}>
              {c === "all" ? "전체" : CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid">
        {visible.length === 0 && <div className="empty-grid">조건에 맞는 클래스가 없어요</div>}
        {visible.map((c) => {
          const isPast = c.status === "종료";
          const dated = (c.type === "offline" || c.type === "seminar") && c.date;

          let bignum: React.ReactNode = null;
          if (isPast) {
            bignum = (
              <div className="bignum-wrap neutral-bg">
                <div className="bignum-row">
                  <span className="bignum muted">종료된 클래스</span>
                  <span className="bignum-sub">신청 {c.applied ?? 0} / 정원 {c.capacity ?? "-"}</span>
                </div>
                <p className="bignum-note">
                  {c.manualEnd ? "(수동 종료)" : "(자동 종료 · 개강일 경과)"}
                  {c.manualEnd && (
                    <button type="button" className="editable" style={{ marginLeft: 8, color: "var(--mint-d)" }} onClick={() => { update(c.id, { manualEnd: false }); showToast("종료를 취소했어요 · 다시 노출돼요"); }}>
                      종료 취소
                    </button>
                  )}
                </p>
              </div>
            );
          } else if (dated && c.capacity != null && c.applied != null) {
            const remain = c.capacity - c.applied;
            const ratio = Math.min(100, Math.round((c.applied / c.capacity) * 100));
            const tone = c.status === "마감" ? ["full", "danger", "danger-bg"] : c.status === "마감임박" ? ["warn", "warn", "warn-bg"] : ["", "mint", ""];
            bignum = (
              <div className={`bignum-wrap ${tone[2]}`}>
                <div className="bignum-row">
                  <span className={`bignum ${tone[1]}`}>{c.status === "마감" ? "마감" : `잔여 ${remain}석`}</span>
                  <span className="bignum-sub">신청 {c.applied} / 정원 {c.capacity}</span>
                </div>
                <div className="progress-track"><div className={`progress-fill ${tone[0]}`} style={{ width: `${ratio}%` }} /></div>
                <div className="stepper">
                  <span className="slabel">정원 조정</span>
                  <button type="button" aria-label="정원 줄이기" onClick={() => { const v = Math.max(c.applied!, c.capacity! - 1); update(c.id, { capacity: v }); showToast(`정원을 ${v}명으로 변경했어요`); }}>−</button>
                  <span className="slabel" style={{ minWidth: 16, textAlign: "center" }}>{c.capacity}</span>
                  <button type="button" aria-label="정원 늘리기" onClick={() => { const v = c.capacity! + 1; update(c.id, { capacity: v }); showToast(`정원을 ${v}명으로 변경했어요`); }}>+</button>
                </div>
              </div>
            );
          } else if (c.type === "waitlist") {
            bignum = (
              <div className="bignum-wrap neutral-bg">
                <div className="bignum-row"><span className="bignum">{c.applied}명</span><span className="bignum-sub">개설 알림 신청</span></div>
                <p className="bignum-note">일정이 정해지면 이 목록에 자동으로 알림이 발송돼요</p>
              </div>
            );
          } else if (c.type === "upcoming") {
            bignum = (
              <div className="bignum-wrap neutral-bg">
                <div className="bignum-row"><span className="bignum muted">개설 예정</span><span className="bignum-sub">일정 미정</span></div>
                <p className="bignum-note">기본 정보에서 개강일·정원을 입력하면 모집이 시작돼요</p>
              </div>
            );
          } else if (c.type === "online") {
            bignum = (
              <div className="bignum-wrap">
                <div className="bignum-row"><span className="bignum mint">상시 판매</span><span className="bignum-sub">수강 기간 {c.months}개월 · {c.applied ?? 0}명 수강</span></div>
              </div>
            );
          }

          return (
            <div key={c.id} className={`card${isPast ? " past" : ""}`}>
              <div className="card-top">
                <span className="cat">{c.cat}</span>
                <span className={`status s-${c.status}`}>{c.status}</span>
              </div>
              <p className="ctitle">{c.name}</p>
              <p className="cmeta">
                <span>{dayLabel(c.day)}</span><span className="sep">·</span><span>{c.time ?? "-"}</span><span className="sep">·</span><span>{c.place ?? "장소 미정"}</span>
                {dated && (
                  <>
                    <span className="sep">·</span>
                    {editingDate === c.id ? (
                      <input
                        type="date"
                        autoFocus
                        defaultValue={c.date!}
                        onChange={(e) => {
                          if (!e.target.value) return;
                          update(c.id, { date: e.target.value });
                          showToast("개강일을 변경했어요 · 상태가 자동으로 갱신돼요");
                        }}
                        onBlur={() => setEditingDate(null)}
                      />
                    ) : (
                      <button type="button" className="editable" title="클릭해서 개강일 수정" onClick={() => setEditingDate(c.id)}>
                        {c.date} {!isPast && `(${ddayLabel(c.date!)})`}
                      </button>
                    )}
                  </>
                )}
              </p>
              {c.step != null && <><span className="step-tag">{stepLabel(c.step)}</span><br /></>}
              {bignum}
              <div className="card-actions">
                <Link className="ca-btn" href={ROUTES.adminEditClass(c.id)}>기본 정보</Link>
                <Link className="ca-btn" href={ROUTES.adminClassContent(c.id)}>콘텐츠 관리</Link>
                <Link className="ca-btn primary" href={ROUTES.classDetail(c.slug)} target="_blank">미리보기</Link>
              </div>
              {!isPast && dated && (
                <button type="button" className="force-end" onClick={() => setConfirmEnd(c)}>지금 바로 종료하기</button>
              )}
            </div>
          );
        })}
      </div>

      {confirmEnd && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setConfirmEnd(null)}>
          <div className="modal" role="dialog" aria-modal="true">
            <h3>&ldquo;{confirmEnd.name}&rdquo;를 지금 바로 종료할까요?</h3>
            <p className="m-body">사이트 목록에서 즉시 빠지고, 관리자에는 계속 남아요. 종료 후에도 &lsquo;종료 취소&rsquo;로 되돌릴 수 있어요.</p>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setConfirmEnd(null)}>취소</button>
              <button type="button" className="btn btn-mint" style={{ background: "var(--red)" }} onClick={() => { update(confirmEnd.id, { manualEnd: true }); setConfirmEnd(null); showToast("지금 바로 종료 처리했어요"); }}>
                종료하기
              </button>
            </div>
          </div>
        </div>
      )}
      {toast}
    </div>
  );
}
