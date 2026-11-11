"use client";

import { useState } from "react";

/** 제휴·가맹 문의 — POST /api/inquiries (DB 저장 + 본사 채팅 알림) */
export default function PartnerForm() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formEl = e.currentTarget;
    const fd = new FormData(formEl);
    if (!String(fd.get("name")).trim() || !String(fd.get("phone")).trim()) {
      setError("담당자명과 연락처를 입력해주세요");
      return;
    }
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(fd.entries())),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "접수하지 못했어요. 잠시 후 다시 시도해주세요.");
        return;
      }
      setSent(true);
      formEl.reset();
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="contact-form" onSubmit={onSubmit}>
      <div className="field"><label htmlFor="pf-name">담당자명</label><input id="pf-name" name="name" type="text" placeholder="홍길동" /></div>
      <div className="field"><label htmlFor="pf-shop">매장명 / 소속</label><input id="pf-shop" name="shop" type="text" placeholder="매장명을 입력해주세요" /></div>
      <div className="field"><label htmlFor="pf-phone">연락처</label><input id="pf-phone" name="phone" type="tel" placeholder="010-0000-0000" /></div>
      <div className="field">
        <label htmlFor="pf-type">문의 유형</label>
        <select id="pf-type" name="type">
          <option>가맹 개설 문의</option>
          <option>교육 제휴 문의</option>
          <option>기업 단체 교육 문의</option>
          <option>기타</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="pf-body">문의 내용</label>
        <textarea id="pf-body" name="body" placeholder="문의하실 내용을 자유롭게 남겨주세요" />
        {error && <p className="err">{error}</p>}
      </div>
      {/* 스팸 봇 걸러내기용 — 사람에게는 보이지 않는다 */}
      <input name="website" type="text" tabIndex={-1} autoComplete="off" aria-hidden style={{ position: "absolute", left: "-9999px" }} />
      <button type="submit" className="btn btn-mint" disabled={busy}>{busy ? "접수 중…" : "문의 남기기"}</button>
      {sent && <div className="sent-box">문의가 접수됐어요. 담당자가 확인 후 연락드릴게요.</div>}
    </form>
  );
}
