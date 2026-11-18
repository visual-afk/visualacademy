"use client";

import Link from "next/link";
import { useState } from "react";
import { useToast } from "@/components/common/useToast";
import { ROUTES } from "@/data/site";
import type { Inquiry, InquiryStatus, InquiryType } from "@/lib/types";

const TYPES: InquiryType[] = ["가맹 개설 문의", "교육 제휴 문의", "기업 단체 교육 문의", "기타"];
const ST: Record<InquiryStatus, string> = { new: "신규", prog: "확인중", done: "완료" };
const ST_KEYS = Object.keys(ST) as InquiryStatus[];
/** 이 폭 이하에서는 상세 패널이 아래에서 올라오는 시트로 바뀐다 (CSS 와 같은 값) */
const SHEET_MQ = "(max-width: 1000px)";

const csvCell = (v: string) => `"${v.replace(/"/g, '""')}"`;

export default function Inquiries({ initial }: { initial: Inquiry[] }) {
  const [items, setItems] = useState<Inquiry[]>(() => initial.map((d) => ({ ...d })));
  const [sel, setSel] = useState<string | null>(null);
  const [fType, setFType] = useState<InquiryType | "all">("all");
  const [fSt, setFSt] = useState<InquiryStatus | "all">("all");
  const [q, setQ] = useState("");
  const [memo, setMemo] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [noti, setNoti] = useState({ email: true, emails: "khn@visualacademy.co.kr", kakao: false, phone: "" });
  const { toast, showToast } = useToast();

  const query = q.trim();
  const list = items.filter(
    (d) =>
      (fType === "all" || d.type === fType) &&
      (fSt === "all" || d.status === fSt) &&
      (!query || (d.name + d.shop + d.body + d.phone).includes(query)),
  );
  const count = (k: InquiryStatus) => items.filter((d) => d.status === k).length;
  const cur = items.find((d) => d.id === sel) ?? null;

  const patch = (id: string, change: Partial<Inquiry>) => setItems((xs) => xs.map((d) => (d.id === id ? { ...d, ...change } : d)));

  const pick = (d: Inquiry) => {
    setSel(d.id);
    setMemo(d.memo);
    // 프로토타입: 신규 문의를 열면 '확인중'으로 바뀐다
    // TODO(backend): PATCH /api/admin/inquiries/:id { status: "prog" }
    if (d.status === "new") patch(d.id, { status: "prog" });
    if (window.matchMedia(SHEET_MQ).matches) setSheetOpen(true);
  };

  const setStatus = (id: string, status: InquiryStatus) => {
    // TODO(backend): PATCH /api/admin/inquiries/:id { status }
    patch(id, { status });
    showToast(`상태를 "${ST[status]}"로 바꿨어요`);
  };

  const saveMemo = (id: string) => {
    // TODO(backend): PATCH /api/admin/inquiries/:id { memo }
    patch(id, { memo });
    showToast("메모를 저장했어요");
  };

  // TODO(backend): GET/PUT /api/admin/inquiries/notify-settings — 지금은 화면 상태만 바뀐다
  const saveNoti = (change: Partial<typeof noti>) => {
    setNoti((n) => ({ ...n, ...change }));
    showToast("설정을 저장했어요");
  };

  const exportCsv = () => {
    const rows = [
      ["접수일", "상태", "유형", "이름", "매장·소속", "연락처", "문의 내용", "메모"],
      ...list.map((d) => [d.date, ST[d.status], d.type, d.name, d.shop, d.phone, d.body.replace(/\n/g, " "), d.memo]),
    ];
    const csv = "﻿" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "문의함.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast("내보냈어요");
  };

  return (
    <div className="wrap">
      <div className="page-head">
        <div>
          <p className="crumb"><Link href={ROUTES.admin}>관리자</Link> &nbsp;›&nbsp; 문의함</p>
          <h1>제휴 · 가맹 문의함</h1>
          <p>홈페이지 &quot;제휴 문의&quot; 폼으로 들어온 문의가 여기에 모여요. 상태를 바꾸고 담당자 메모를 남길 수 있어요.</p>
        </div>
        <button type="button" className="btn btn-ghost" onClick={exportCsv}>엑셀(CSV)로 내보내기</button>
      </div>

      <div className="summary">
        <div className="sitem st-new"><p className="sn">{count("new")}</p><p className="sl">새로 들어온 문의</p></div>
        <div className="sitem st-prog"><p className="sn">{count("prog")}</p><p className="sl">확인 중</p></div>
        <div className="sitem st-done"><p className="sn">{count("done")}</p><p className="sl">답변 완료</p></div>
        <div className="sitem"><p className="sn">{items.length}</p><p className="sl">전체 문의</p></div>
      </div>

      <div className="toolbar">
        <div className="chips">
          {(["all", ...TYPES] as const).map((t) => (
            <button key={t} type="button" className={`chip${t === fType ? " on" : ""}`} onClick={() => setFType(t)}>
              {t === "all" ? "전체" : t}
              <em>{t === "all" ? items.length : items.filter((d) => d.type === t).length}</em>
            </button>
          ))}
        </div>
        <input className="search" type="search" placeholder="이름·매장·내용 검색" value={q} onChange={(e) => setQ(e.target.value)} aria-label="문의 검색" />
      </div>
      <div className="toolbar st-row">
        <div className="chips">
          {(["all", ...ST_KEYS] as const).map((k) => (
            <button key={k} type="button" className={`chip${k === fSt ? " on" : ""}`} onClick={() => setFSt(k)}>
              {k === "all" ? "모든 상태" : ST[k]}
            </button>
          ))}
        </div>
      </div>

      <div className="layout">
        <div className="list">
          <div className="row head" aria-hidden>
            <span>상태</span><span>문의자</span><span>문의 내용</span><span className="ta-r">접수일</span>
          </div>
          {list.length ? (
            list.map((d) => (
              <button key={d.id} type="button" className={`row${d.id === sel ? " sel" : ""}`} onClick={() => pick(d)}>
                <span className="r-st"><span className={`badge b-${d.status}`}>{ST[d.status]}</span></span>
                <span className="r-who"><b>{d.name}</b><span>{d.shop}</span></span>
                <span className="r-msg"><span className="ty">{d.type}</span>{d.body.replace(/\n/g, " ")}</span>
                <span className="r-date">{d.date.slice(5, 10).replace("-", "/")}<br />{d.date.slice(11)}</span>
              </button>
            ))
          ) : (
            <div className="empty">조건에 맞는 문의가 없어요</div>
          )}
        </div>

        <aside className={`panel${sheetOpen ? " open" : ""}`} aria-label="문의 상세">
          {cur ? (
            <>
              <button type="button" className="pclose" onClick={() => setSheetOpen(false)} aria-label="닫기">×</button>
              <h2>{cur.name} <span className={`badge b-${cur.status}`}>{ST[cur.status]}</span></h2>
              <p className="sub">{cur.date} 접수</p>
              <dl className="kv">
                <dt>문의 유형</dt><dd>{cur.type}</dd>
                <dt>매장·소속</dt><dd>{cur.shop}</dd>
                <dt>연락처</dt><dd><a href={`tel:${cur.phone}`}>{cur.phone}</a></dd>
              </dl>
              <p className="lbl">문의 내용</p>
              <p className="msg">{cur.body}</p>
              <p className="lbl">처리 상태</p>
              <div className="stbtns">
                {ST_KEYS.map((k) => (
                  <button key={k} type="button" className={`${k}${cur.status === k ? " on" : ""}`} onClick={() => setStatus(cur.id, k)}>{ST[k]}</button>
                ))}
              </div>
              <label className="lbl" htmlFor="inq-memo">담당자 메모 (고객에게는 보이지 않아요)</label>
              <textarea id="inq-memo" placeholder="통화 내용, 다음 할 일 등을 적어두세요" value={memo} onChange={(e) => setMemo(e.target.value)} />
              <div className="pact">
                <a className="btn btn-ghost" href={`tel:${cur.phone}`}>전화하기</a>
                <button type="button" className="btn btn-mint" onClick={() => saveMemo(cur.id)}>메모 저장</button>
              </div>
              <div className="log">
                <span>· {cur.date} 문의 접수</span>
                {cur.status !== "new" && <span>· 담당자가 확인했어요</span>}
                {cur.status === "done" && <span>· 답변 완료로 처리됐어요</span>}
              </div>
            </>
          ) : (
            <div className="pempty">왼쪽에서 문의를 선택하면<br />내용과 처리 상태가 여기에 나와요</div>
          )}
        </aside>
      </div>
      <div className={`scrim${sheetOpen ? " on" : ""}`} onClick={() => setSheetOpen(false)} aria-hidden />

      <div className="noti">
        <h2>새 문의 알림 설정</h2>
        <p className="sub">새 문의가 들어오면 담당자에게 바로 알려드려요.</p>
        <div className="ngrid">
          <div>
            <div className="nrow">
              <div><b>이메일 알림</b><span>문의가 올 때마다 메일로 받아요</span></div>
              <label className="sw"><input type="checkbox" checked={noti.email} onChange={(e) => saveNoti({ email: e.target.checked })} aria-label="이메일 알림" /><i /></label>
            </div>
            <div className="nfield">
              <label htmlFor="noti-emails">받는 이메일 (쉼표로 여러 명)</label>
              <input id="noti-emails" type="text" defaultValue={noti.emails} placeholder="예) team@example.com, staff@example.com" onBlur={(e) => e.target.value !== noti.emails && saveNoti({ emails: e.target.value })} />
            </div>
          </div>
          <div>
            <div className="nrow">
              <div><b>카카오 알림톡</b><span>담당자 휴대폰으로 받아요</span></div>
              <label className="sw"><input type="checkbox" checked={noti.kakao} onChange={(e) => saveNoti({ kakao: e.target.checked })} aria-label="카카오 알림톡" /><i /></label>
            </div>
            <div className="nfield">
              <label htmlFor="noti-phone">받는 연락처</label>
              <input id="noti-phone" type="text" defaultValue={noti.phone} placeholder="010-0000-0000" onBlur={(e) => e.target.value !== noti.phone && saveNoti({ phone: e.target.value })} />
            </div>
          </div>
        </div>
      </div>
      {toast}
    </div>
  );
}
