"use client";

import { useState } from "react";

/** 제휴·가맹 문의 — 백엔드 연동 시 POST /api/inquiries 로 전송 */
export default function PartnerForm() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (!String(fd.get("name")).trim() || !String(fd.get("phone")).trim()) {
      setError("담당자명과 연락처를 입력해주세요");
      return;
    }
    setError("");
    setSent(true);
    e.currentTarget.reset();
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
      <button type="submit" className="btn btn-mint">문의 남기기</button>
      {sent && <div className="sent-box">문의가 접수됐어요. 담당자가 확인 후 연락드릴게요.</div>}
    </form>
  );
}
