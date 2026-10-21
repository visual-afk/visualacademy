"use client";

import Link from "next/link";
import { useState } from "react";
import { useToast } from "@/components/common/useToast";
import SiteHeader from "@/components/site/SiteHeader";
import TabBar from "@/components/site/TabBar";
import { applications, me, MY_TABS, myCourses, myPayments, type ApplicationStatus, type MyPaymentStatus } from "@/data/mypage";
import { ROUTES } from "@/data/site";
import { taxNote, won } from "@/lib/format";

type MyTab = (typeof MY_TABS)[number]["key"];

const APP_BADGE: Record<ApplicationStatus, string> = {
  "수강 확정": "badge-mint",
  "입금 대기": "badge-amber",
  "수강 완료": "badge-line",
  "신청 취소": "badge-red",
};
const PAY_BADGE: Record<MyPaymentStatus, string> = {
  결제완료: "badge-mint",
  "입금 대기": "badge-amber",
  환불완료: "badge-red",
};

type Receipt = (typeof myPayments)[number];
type Modal = { kind: "receipt"; p: Receipt } | { kind: "withdraw" } | { kind: "withdrawn" } | { kind: "logout" } | null;

export default function MyPageView({ tab }: { tab: MyTab }) {
  const [modal, setModal] = useState<Modal>(null);
  const [pwError, setPwError] = useState("");
  const { toast, showToast } = useToast();

  const saveInfo = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const pw = String(fd.get("pw") ?? "");
    const pw2 = String(fd.get("pw2") ?? "");
    if (pw && pw.length < 8) return setPwError("비밀번호는 8자 이상으로 입력해주세요");
    if (pw !== pw2) return setPwError("새 비밀번호가 서로 달라요");
    setPwError("");
    showToast("정보를 저장했어요");
  };

  return (
    <>
      <SiteHeader
        right={
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setModal({ kind: "logout" })}>
            로그아웃
          </button>
        }
      />

      <div className="wrap narrow pagehead">
        <h1>마이페이지</h1>
        <p>신청 내역, 결제 내역, 온라인 수강권한을 한눈에 확인하세요.</p>
      </div>

      <div className="wrap narrow">
        <div className="profile-card">
          <div className="profile-avatar">{me.initial}</div>
          <div className="profile-info">
            <p className="profile-name">
              {me.name} 님 <span className="badge badge-mint">{me.grade}</span>
            </p>
            <p className="profile-meta">{me.email} · {me.phone}</p>
          </div>
          <div className="profile-actions">
            <Link className="btn btn-ghost btn-sm" href="/mypage?tab=info">정보 수정</Link>
          </div>
        </div>

        <TabBar basePath="/mypage" tabs={MY_TABS} active={tab} />

        <div className="tab-panel">
          {tab === "apply" && (
            <div className="section">
              <div className="section-head">
                <h2>신청 내역</h2>
                <span className="count">총 {applications.length}건</span>
              </div>
              {applications.map((a) => (
                <div key={a.title} className="app-card">
                  <div className={`app-thumb ${a.thumb}`} />
                  <div className="app-body">
                    <p className="app-cat">{a.cat}</p>
                    <p className="app-title">{a.slug ? <Link href={ROUTES.classDetail(a.slug)}>{a.title}</Link> : a.title}</p>
                    <div className="app-meta">
                      <span>{a.when}</span>
                      <span>{a.place}</span>
                    </div>
                  </div>
                  <div className="app-right">
                    <span className={`badge ${APP_BADGE[a.status]}`}>{a.status}</span>
                    <span className="app-price">{won(a.price)}</span>
                    {(a.status === "수강 확정" || a.status === "입금 대기") && (
                      <button type="button" className="app-cancel" onClick={() => showToast("취소 신청이 접수됐어요 · 환불 규정에 따라 처리돼요")}>
                        취소 신청
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "pay" && (
            <div className="section">
              <div className="section-head">
                <h2>결제 내역</h2>
                <span className="count">총 {myPayments.length}건</span>
              </div>
              <table className="pay-table">
                <thead>
                  <tr><th>결제일</th><th>상품명</th><th>결제수단</th><th>상태</th><th>금액</th><th>영수증</th></tr>
                </thead>
                <tbody>
                  {myPayments.map((p) => (
                    <tr key={p.item}>
                      <td data-label="결제일">{p.date}</td>
                      <td data-label="상품명" className="pay-item">{p.item}</td>
                      <td data-label="결제수단">{p.method}</td>
                      <td data-label="상태"><span className={`badge ${PAY_BADGE[p.status]}`}>{p.status}</span></td>
                      <td data-label="금액" className="pay-amount">{won(p.amount)}</td>
                      <td data-label="영수증">
                        {p.status === "입금 대기" ? "—" : (
                          <button type="button" className="receipt-link" onClick={() => setModal({ kind: "receipt", p })}>영수증</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === "online" && (
            <div className="section">
              <div className="section-head">
                <h2>온라인 수강권한</h2>
                <span className="count">총 {myCourses.length}건</span>
              </div>
              {myCourses.map((c) => (
                <div key={c.title} className="course-card">
                  <div className={`course-thumb ${c.thumb}`} />
                  <div className="course-body">
                    <p className="course-title">{c.title}</p>
                    <p className="course-meta">{c.meta}</p>
                    <div className="progress-row">
                      <div className="progress-track"><div className="progress-fill" style={{ width: `${c.pct}%` }} /></div>
                      <span className="progress-pct">{c.pct}%</span>
                    </div>
                  </div>
                  <div className="course-right">
                    <button type="button" className={`btn ${c.done ? "btn-ghost" : "btn-mint"} btn-sm`} onClick={() => showToast("강의 플레이어는 백엔드 연동 후 열려요")}>
                      {c.done ? "다시보기" : "이어보기"}
                    </button>
                    <span className="course-expiry">수강기한 {c.expiry}까지</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "info" && (
            <div className="section">
              <h2 style={{ marginBottom: 19 }}>내 정보</h2>
              <form className="info-form" onSubmit={saveInfo}>
                <div className="field"><label htmlFor="my-name">이름</label><input id="my-name" type="text" defaultValue={me.name} /></div>
                <div className="field"><label htmlFor="my-email">이메일</label><input id="my-email" type="text" defaultValue={me.email} disabled /></div>
                <div className="field"><label htmlFor="my-phone">휴대폰 번호</label><input id="my-phone" type="tel" defaultValue={me.phone} /></div>
                <div className="field-row">
                  <div className="field"><label htmlFor="my-pw">비밀번호 변경</label><input id="my-pw" name="pw" type="password" placeholder="새 비밀번호" autoComplete="new-password" /></div>
                  <div className="field"><label htmlFor="my-pw2">비밀번호 확인</label><input id="my-pw2" name="pw2" type="password" placeholder="새 비밀번호 확인" autoComplete="new-password" /></div>
                </div>
                {pwError && <p className="form-err">{pwError}</p>}
                <button type="submit" className="btn btn-mint">정보 저장</button>
                <div className="divider-line" />
                <button type="button" className="danger-link" onClick={() => setModal({ kind: "withdraw" })}>회원 탈퇴</button>
              </form>
            </div>
          )}
        </div>
      </div>

      {modal && (
        <div className="modal-bg" onClick={(e) => e.target === e.currentTarget && setModal(null)}>
          <div className="modal-box" role="dialog" aria-modal="true">
            {modal.kind === "receipt" && (
              <>
                <h3>영수증</h3>
                <dl className="receipt-dl">
                  <div><dt>결제일</dt><dd>{modal.p.date}</dd></div>
                  <div><dt>상품명</dt><dd>{modal.p.item}</dd></div>
                  <div><dt>결제수단</dt><dd>{modal.p.method}</dd></div>
                  <div><dt>결제 금액</dt><dd>{won(modal.p.amount)}</dd></div>
                  {modal.p.status === "환불완료" && <div><dt>환불 상태</dt><dd>환불완료</dd></div>}
                </dl>
                <p className="receipt-tax">{taxNote(modal.p.amount, modal.p.taxType)}</p>
                <div className="modal-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>닫기</button>
                </div>
              </>
            )}
            {modal.kind === "withdraw" && (
              <>
                <h3>정말 탈퇴하시겠어요?</h3>
                <p>수강 이력과 수강권한이 모두 삭제되며 복구할 수 없어요. 진행 중인 수강이 있으면 먼저 정리가 필요해요.</p>
                <div className="modal-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>취소</button>
                  <button type="button" className="btn btn-danger" onClick={() => setModal({ kind: "withdrawn" })}>탈퇴하기</button>
                </div>
              </>
            )}
            {modal.kind === "withdrawn" && (
              <>
                <h3>탈퇴 요청이 접수됐어요</h3>
                <p>프로토타입 화면이라 실제로 처리되지는 않아요. 백엔드 연동 후 계정 삭제가 진행돼요.</p>
                <div className="modal-actions">
                  <button type="button" className="btn btn-mint" onClick={() => setModal(null)}>확인</button>
                </div>
              </>
            )}
            {modal.kind === "logout" && (
              <>
                <h3>로그아웃할까요?</h3>
                <p>로그인 기능은 백엔드 연동 후 동작해요.</p>
                <div className="modal-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>취소</button>
                  <Link className="btn btn-mint" href={ROUTES.home}>로그아웃</Link>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {toast}
    </>
  );
}
