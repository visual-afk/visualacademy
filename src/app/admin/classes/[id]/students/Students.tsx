"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/common/useToast";
import { ROUTES } from "@/data/site";
import type { ChangeKind, Student } from "@/lib/enrollments";
import { daysLeft, expiryLabel, nextExpiry, type ExpiryChange } from "@/lib/expiry";
import { formatPhone } from "@/lib/format";
import { LEARNING_LABEL, learningStatus, type Learning } from "@/lib/learning";

const FILTERS = ["수강 중", "챙겨야 할 사람", "30일 내 만료", "만료", "전체"] as const;
/** 챙겨야 할 사람 = 7일 이상 안 봄 · 기한 임박인데 진도 낮음 (lib/learning.ts — 알림톡과 같은 기준) */
const NEEDS_CARE: Learning[] = ["warn", "risk", "behind"];
const LEARN_PILL: Record<Learning, string> = { ok: "p-결제완료", done: "p-발행완료", warn: "p-부분환불", risk: "p-입금대기", behind: "p-입금대기", expired: "p-환불완료" };
type Filter = (typeof FILTERS)[number];
const SOURCE: Record<string, string> = { order: "결제", admin: "직접 부여", imweb: "아임웹 이관" };
const KIND: Record<ChangeKind, string> = { grant: "부여", repurchase: "재결제 연장", change: "기한 변경", revoke: "회수" };
const REASONS = ["수강생 요청 연장", "보상 연장 (오류·지연)", "아임웹 이관 기한 맞춤", "본사 지원"];
const MODES: { key: ExpiryChange["mode"]; label: string }[] = [
  { key: "months", label: "+개월" },
  { key: "days", label: "+일" },
  { key: "date", label: "날짜 지정" },
  { key: "unlimited", label: "무제한" },
];

type Form = { mode: ExpiryChange["mode"]; n: string; date: string; reason: string; error: string; notify: boolean };
type Status = "수강 중" | "만료 임박" | "만료" | "무제한";

function status(s: Student): Status {
  if (!s.expiresAt) return "무제한";
  if (new Date(s.expiresAt) <= new Date()) return "만료";
  return (daysLeft(s.expiresAt) ?? 0) <= 30 ? "만료 임박" : "수강 중";
}
const PILL: Record<Status, string> = { "수강 중": "p-결제완료", 무제한: "p-발행완료", "만료 임박": "p-부분환불", 만료: "p-환불완료" };

function toChange(f: Form): ExpiryChange | null {
  if (f.mode === "unlimited") return { mode: "unlimited" };
  if (f.mode === "date") return /^\d{4}-\d{2}-\d{2}$/.test(f.date) ? { mode: "date", date: f.date } : null;
  const n = parseInt(f.n, 10);
  return n > 0 ? { mode: f.mode, n } : null;
}
/** 마지막 시청 → 오늘 · 3일 전 */
function agoLabel(iso: string) {
  const d = -(daysLeft(iso) ?? 0);
  return d <= 0 ? "오늘" : `${d}일 전`;
}
const kstDay = (iso: string) => new Date(new Date(iso).getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10);

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

/** 기한 입력 — 기한 변경 팝업과 직접 부여 팝업이 같이 쓴다 */
function ExpiryFields({ form, set, current, fresh }: { form: Form; set: (f: Form) => void; current: string | null; fresh?: boolean }) {
  const change = toChange(form);
  return (
    <>
      <div className="field">
        <span className="lbl">{fresh ? "수강기한" : "바꿀 방법"}</span>
        <div className="seg">
          {MODES.map((m) => (
            <button key={m.key} type="button" className={form.mode === m.key ? "on" : undefined} onClick={() => set({ ...form, mode: m.key, error: "" })}>
              {fresh && m.key !== "date" && m.key !== "unlimited" ? m.label.slice(1) : m.label}
            </button>
          ))}
        </div>
      </div>
      {(form.mode === "months" || form.mode === "days") && (
        <div className="field">
          <label htmlFor="ex-n">{fresh ? "오늘부터" : "남은 기한에 더할"} {form.mode === "months" ? "개월" : "일"} 수</label>
          <input id="ex-n" type="text" inputMode="numeric" value={form.n} onChange={(e) => set({ ...form, n: e.target.value.replace(/\D/g, ""), error: "" })} />
        </div>
      )}
      {form.mode === "date" && (
        <div className="field">
          <label htmlFor="ex-date">이 날짜까지 (그날 23:59)</label>
          <input id="ex-date" type="date" value={form.date} onChange={(e) => set({ ...form, date: e.target.value, error: "" })} />
        </div>
      )}
      <div className="m-amt-row">
        <span className="lbl">{fresh ? "수강기한" : `${expiryLabel(current)} →`}</span>
        <span className="amt sm">{change ? `${expiryLabel(nextExpiry(current, change))}${change.mode === "unlimited" ? "" : "까지"}` : "-"}</span>
      </div>
      <div className="field">
        <label htmlFor="ex-reason">사유 (변경 이력에 남아요)</label>
        <div className="reason-chips">
          {REASONS.map((r) => (
            <button key={r} type="button" className={`fchip${form.reason === r ? " on" : ""}`} onClick={() => set({ ...form, reason: r, error: "" })}>{r}</button>
          ))}
        </div>
        <textarea id="ex-reason" placeholder="직접 적어도 돼요" value={form.reason} onChange={(e) => set({ ...form, reason: e.target.value, error: "" })} />
      </div>
      <label className="notify-check">
        <input type="checkbox" checked={form.notify} onChange={(e) => set({ ...form, notify: e.target.checked })} />
        수강생에게 바뀐 수강기한을 알림톡으로 알려주기
      </label>
    </>
  );
}

type Cls = { id: number; name: string; months: number | null; wsTotal: number };

export default function Students({ cls, students }: { cls: Cls; students: Student[] }) {
  const router = useRouter();
  const { toast, showToast } = useToast();
  const [rows, setRows] = useState(students);
  const [filter, setFilter] = useState<Filter>("수강 중");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const blank: Form = { mode: "months", n: String(cls.months ?? 1), date: "", reason: "", error: "", notify: true };
  const [edit, setEdit] = useState<(Form & { id: string; note: string; historyOpen: boolean }) | null>(null);
  const [grant, setGrant] = useState<(Form & { phone: string; name: string }) | null>(null);

  const st = rows.map((s) => ({ s, status: status(s), learning: learningStatus(s) }));
  const active = st.filter((r) => r.status !== "만료");
  const list = st.filter(({ s, status: x, learning }) => {
    if (filter === "수강 중" && x === "만료") return false;
    if (filter === "30일 내 만료" && x !== "만료 임박") return false;
    if (filter === "챙겨야 할 사람" && !NEEDS_CARE.includes(learning)) return false;
    if (filter === "만료" && x !== "만료") return false;
    const q = search.replace(/-/g, "");
    return !q || s.name.includes(q) || s.phone.includes(q);
  });
  const avg = active.length ? Math.round(active.reduce((a, r) => a + r.s.progress, 0) / active.length) : 0;
  const target = edit ? rows.find((s) => s.id === edit.id) ?? null : null;

  const patchRow = (id: string, kind: ChangeKind, reason: string, expiresAt: string | null) =>
    setRows((rs) =>
      rs.map((s) =>
        s.id === id ? { ...s, expiresAt, history: [{ kind, prev: s.expiresAt, next: expiresAt, reason, actor: "나", at: new Date().toISOString() }, ...s.history] } : s,
      ),
    );

  const send = async (url: string, method: string, body: unknown) => {
    setBusy(true);
    try {
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      return res.ok ? { ok: true as const, data } : { ok: false as const, error: (data.error as string) ?? "저장하지 못했어요" };
    } finally {
      setBusy(false);
    }
  };

  const saveExpiry = async () => {
    if (!edit || !target || busy) return;
    const change = toChange(edit);
    if (!change) return setEdit({ ...edit, error: "기한을 확인해 주세요" });
    if (!edit.reason.trim()) return setEdit({ ...edit, error: "사유를 적어 주세요" });
    const r = await send(`/api/admin/enrollments/${edit.id}`, "PATCH", { action: "expiry", change, reason: edit.reason, notify: edit.notify });
    if (!r.ok) return setEdit({ ...edit, error: r.error });
    patchRow(edit.id, "change", edit.reason.trim(), r.data.expiresAt);
    setEdit(null);
    showToast(`${target.name} 님 수강기한을 ${expiryLabel(r.data.expiresAt)}${r.data.expiresAt ? "까지로" : "으로"} 바꿨어요`);
  };

  const revoke = async () => {
    if (!edit || !target || busy) return;
    if (!edit.reason.trim()) return setEdit({ ...edit, error: "회수 사유를 적어 주세요" });
    if (!confirm(`${target.name} 님 수강권을 지금 바로 만료시킬까요? 진도는 남아서 나중에 기한을 다시 주면 이어볼 수 있어요.`)) return;
    const r = await send(`/api/admin/enrollments/${edit.id}`, "PATCH", { action: "revoke", reason: edit.reason });
    if (!r.ok) return setEdit({ ...edit, error: r.error });
    patchRow(edit.id, "revoke", edit.reason.trim(), r.data.expiresAt);
    setEdit(null);
    showToast("수강권을 회수했어요");
  };

  const saveNote = async () => {
    if (!edit || busy) return;
    const r = await send(`/api/admin/enrollments/${edit.id}`, "PATCH", { action: "note", note: edit.note });
    if (!r.ok) return setEdit({ ...edit, error: r.error });
    setRows((rs) => rs.map((s) => (s.id === edit.id ? { ...s, note: edit.note.trim() } : s)));
    showToast("메모를 저장했어요");
  };

  const toggleUnlock = async () => {
    if (!target || busy) return;
    const on = !target.unlockAll;
    const r = await send(`/api/admin/enrollments/${target.id}`, "PATCH", { action: "unlock", on });
    if (!r.ok) return edit && setEdit({ ...edit, error: r.error });
    setRows((rs) => rs.map((s) => (s.id === target.id ? { ...s, unlockAll: on } : s)));
    showToast(on ? "순서 잠금을 풀었어요 — 아무 강의나 볼 수 있어요" : "다시 순서대로 듣게 했어요");
  };

  const saveGrant = async () => {
    if (!grant || busy) return;
    const change = toChange(grant);
    if (!/^01\d{8,9}$/.test(grant.phone.replace(/\D/g, ""))) return setGrant({ ...grant, error: "휴대폰 번호를 정확히 입력해 주세요" });
    if (!change) return setGrant({ ...grant, error: "기한을 확인해 주세요" });
    if (!grant.reason.trim()) return setGrant({ ...grant, error: "부여 사유를 적어 주세요" });
    const r = await send(`/api/admin/classes/${cls.id}/students`, "POST", { phone: grant.phone, name: grant.name, change, reason: grant.reason, notify: grant.notify });
    if (!r.ok) return setGrant({ ...grant, error: r.error });
    setGrant(null);
    showToast(r.data.created ? "수강권을 줬어요" : "이미 수강 중이라 기한만 바꿨어요");
    router.refresh();
  };

  // 서버에서 새로 받아온 목록(직접 부여 후 refresh)을 반영한다
  const [seen, setSeen] = useState(students);
  if (seen !== students) {
    setSeen(students);
    setRows(students);
  }

  return (
    <div className="wrap">
      <div className="page-head">
        <div>
          <p className="crumb"><Link href={ROUTES.admin}>관리자</Link> &nbsp;›&nbsp; 수강생 관리</p>
          <h1>{cls.name}</h1>
          <p>기본 수강 기간 결제일로부터 {cls.months ?? 12}개월 · 사람마다 따로 바꿀 수 있어요</p>
        </div>
        <div className="row-actions">
          <button
            type="button"
            className="btn btn-ghost"
            disabled={list.length === 0}
            onClick={() =>
              csv(`수강생-${cls.name}`, ["이름", "휴대폰", "이메일", "근무 매장", "경로", "진도(%)", "수강 시작", "마지막 시청", "수강기한", "상태", "메모"],
                list.map(({ s, status: x }) => [s.name, formatPhone(s.phone), s.email, s.shop, SOURCE[s.source] ?? s.source, s.progress, kstDay(s.startedAt), s.lastWatchedAt ? kstDay(s.lastWatchedAt) : "", expiryLabel(s.expiresAt), x, s.note]))
            }
          >
            CSV 내보내기
          </button>
          <button type="button" className="btn btn-mint" onClick={() => setGrant({ ...blank, phone: "", name: "" })}>수강권 직접 주기</button>
        </div>
      </div>

      <div className="summary">
        <div className="sitem mint"><p className="sn">{active.length}명</p><p className="sl">수강 중</p></div>
        <div className="sitem warn"><p className="sn">{st.filter((r) => NEEDS_CARE.includes(r.learning)).length}명</p><p className="sl">챙겨야 할 사람 (7일+ 안 봄 · 기한 임박 저진도)</p></div>
        <div className="sitem"><p className="sn">{avg}%</p><p className="sl">수강 중인 사람 평균 진도</p></div>
        <div className="sitem danger"><p className="sn">{st.filter((r) => r.status === "만료").length}명</p><p className="sl">만료</p></div>
      </div>

      <div className="filters">
        <div className="frow">
          <span className="flabel">상태</span>
          {FILTERS.map((f) => (
            <button key={f} type="button" className={`fchip${filter === f ? " on" : ""}`} onClick={() => setFilter(f)}>{f}</button>
          ))}
          <input className="search" placeholder="이름·휴대폰 검색" value={search} onChange={(e) => setSearch(e.target.value.trim())} />
        </div>
      </div>

      <div className="table-card">
        <div className="table-scroll">
          <table>
            <thead>
              <tr><th>수강생</th><th>연락처</th><th>진도</th><th>마지막 시청</th><th>수강기한</th><th>상태</th><th>학습</th><th /></tr>
            </thead>
            <tbody>
              {list.map(({ s, status: x, learning }) => {
                const dl = daysLeft(s.expiresAt);
                return (
                  <tr key={s.id}>
                    <td>
                      <p className="cell-class">{s.name || "-"}</p>
                      <p className="cell-order">{SOURCE[s.source] ?? s.source}{s.unlockAll ? " · 잠금 해제" : ""}{s.shop ? ` · ${s.shop}` : ""}{s.note ? ` · 📝 ${s.note}` : ""}</p>
                    </td>
                    <td><p className="cell-applicant">{formatPhone(s.phone)}</p><p className="cell-order">{s.email}</p></td>
                    <td>
                      <div className="prog"><span style={{ width: `${s.progress}%` }} /></div>
                      <p className="cell-order">{s.progress}%{cls.wsTotal > 0 ? ` · 워크시트 ${s.wsDone}/${cls.wsTotal}` : ""}</p>
                    </td>
                    <td>
                      <p className="cell-date">{s.lastWatchedAt ? expiryLabel(s.lastWatchedAt) : "아직 안 봄"}</p>
                      {s.lastWatchedAt && <p className="cell-order">{agoLabel(s.lastWatchedAt)}</p>}
                    </td>
                    <td>
                      <p className="cell-date">{expiryLabel(s.expiresAt)}{s.expiresAt ? "까지" : ""}</p>
                      {dl !== null && x !== "만료" && <p className="cell-order">{dl === 0 ? "오늘 만료" : `${dl}일 남음`}</p>}
                    </td>
                    <td><span className={`pill ${PILL[x]}`}>{x}</span></td>
                    <td>{learning !== "expired" && <span className={`pill ${LEARN_PILL[learning]}`}>{LEARNING_LABEL[learning]}</span>}</td>
                    <td>
                      <button type="button" className="ca-btn" onClick={() => setEdit({ ...blank, id: s.id, note: s.note, historyOpen: false })}>
                        기한 변경
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {list.length === 0 && <div className="empty-state">{rows.length ? "조건에 맞는 수강생이 없어요" : "아직 수강생이 없어요"}</div>}
      </div>

      {edit && target && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setEdit(null)}>
          <div className="modal" role="dialog" aria-modal="true">
            <h3>수강기한 변경</h3>
            <p className="m-sub">{target.name} · {formatPhone(target.phone)} · 진도 {target.progress}%</p>
            <ExpiryFields form={edit} set={(f) => setEdit({ ...edit, ...f })} current={target.expiresAt} />
            {edit.error && <p className="err">{edit.error}</p>}
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setEdit(null)}>취소</button>
              <button type="button" className="btn btn-mint" onClick={saveExpiry} disabled={busy}>{busy ? "저장 중…" : "기한 바꾸기"}</button>
            </div>

            <div className="m-section">
              <div className="field">
                <label htmlFor="ex-note">메모 (수강생에게 안 보여요)</label>
                <textarea id="ex-note" value={edit.note} onChange={(e) => setEdit({ ...edit, note: e.target.value })} />
              </div>
              <button type="button" className="ca-btn" onClick={saveNote} disabled={busy}>메모 저장</button>
            </div>

            <div className="m-section">
              <button type="button" className="link-btn" onClick={() => setEdit({ ...edit, historyOpen: !edit.historyOpen })}>
                변경 이력 {target.history.length}건 {edit.historyOpen ? "접기" : "보기"}
              </button>
              {edit.historyOpen && (
                <ul className="history">
                  {target.history.map((h, i) => (
                    <li key={i}>
                      <b>{expiryLabel(h.at)} · {KIND[h.kind]}</b> {h.kind === "grant" ? "" : `${expiryLabel(h.prev)} → `}{expiryLabel(h.next)}
                      <span>{h.reason ?? ""} · {h.actor === "system" ? "자동" : h.actor}</span>
                    </li>
                  ))}
                  {target.history.length === 0 && <li><span>이 기능이 생기기 전에 만들어진 수강권이에요</span></li>}
                </ul>
              )}
            </div>

            <div className="m-section">
              <p className="m-help">{target.unlockAll ? "지금은 아무 강의나 볼 수 있어요." : "지금은 앞 강의를 끝까지 들어야 다음 강의가 열려요."} 이미 들은 분(아임웹 이관 등)은 잠금을 풀어 주세요.</p>
              <button type="button" className="ca-btn" onClick={toggleUnlock} disabled={busy}>{target.unlockAll ? "다시 순서대로 듣게 하기" : "순서 잠금 풀기"}</button>
            </div>

            <div className="m-section">
              <button type="button" className="ca-btn danger" onClick={revoke} disabled={busy || status(target) === "만료"}>수강권 회수 (지금 바로 만료)</button>
            </div>
          </div>
        </div>
      )}

      {grant && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setGrant(null)}>
          <div className="modal" role="dialog" aria-modal="true">
            <h3>수강권 직접 주기</h3>
            <p className="m-sub">결제 없이 수강권을 줘요. 아직 가입 안 한 분도 이 휴대폰 번호로 카카오 로그인하면 바로 볼 수 있어요.</p>
            <div className="field">
              <label htmlFor="gr-phone">휴대폰 번호</label>
              <input id="gr-phone" type="text" inputMode="numeric" placeholder="010-1234-5678" value={grant.phone} onChange={(e) => setGrant({ ...grant, phone: formatPhone(e.target.value.replace(/\D/g, "")), error: "" })} />
            </div>
            <div className="field">
              <label htmlFor="gr-name">이름 (처음 등록하는 분만)</label>
              <input id="gr-name" type="text" value={grant.name} onChange={(e) => setGrant({ ...grant, name: e.target.value, error: "" })} />
            </div>
            <ExpiryFields form={grant} set={(f) => setGrant({ ...grant, ...f })} current={null} fresh />
            {grant.error && <p className="err">{grant.error}</p>}
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setGrant(null)}>취소</button>
              <button type="button" className="btn btn-mint" onClick={saveGrant} disabled={busy}>{busy ? "저장 중…" : "수강권 주기"}</button>
            </div>
          </div>
        </div>
      )}
      {toast}
    </div>
  );
}
