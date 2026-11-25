/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * 디자인 모드 미리보기 — 마이페이지 · 신청/결제 · 로그인/가입.
 * 마크업·클래스는 실제 페이지와 같다: src/app/mypage/MyPageView.tsx, src/app/checkout/(CheckoutFlow|TossWidget|success|fail),
 * src/app/login/LoginFlow.tsx. 여러 화면(탭·단계)으로 나뉜 페이지는 모든 화면을 위아래로 이어서 보여준다.
 * 회원·주문 값은 예시(김민지 · 퍼스널 컬러 진단 교육) — 모든 글자는 esc()로 이스케이프한다.
 */
import { classes } from "@/data/classes";
import { applications, me, myCourses, myPayments, type ApplicationStatus, type MyPaymentStatus } from "@/data/mypage";
import { fullDate, taxNote, won } from "@/lib/format";
import { CATEGORY_LABELS } from "@/lib/status";
import { commonAfter, esc, lines, siteHeader, tag, type PagePreview, type PvCtx } from "./kit";

/** 예시 클래스 — 퍼스널 컬러 진단 교육 */
const EX = classes.find((c) => c.slug === "personal-color") ?? classes[0];
const EX_PRICE = EX.price ?? 0;
const EX_CAT = CATEGORY_LABELS[EX.cat] ?? EX.cat;

/** 공통 헤더 (우측 버튼만 페이지마다 다름) — 클릭하면 메인 페이지 › 상단 메뉴 편집으로 */
const headerWith = (right: string) => (_all: any, ctx: PvCtx) =>
  ctx.main?.visible?.nav === false ? "" : `<div class="pv-common" data-goto="main:nav">${siteHeader(ctx.main?.nav, { right })}</div>`;

const field = (label: unknown, value: unknown, opts: { ph?: string; disabled?: boolean; type?: string } = {}) =>
  `<div class="field"><label>${esc(label)}</label><input type="${opts.type ?? "text"}" readonly${opts.disabled ? " disabled" : ""} value="${esc(value)}"${opts.ph ? ` placeholder="${esc(opts.ph)}"` : ""}></div>`;

/* ═════════════ 마이페이지 ═════════════ */

const APP_BADGE: Record<ApplicationStatus, string> = { "수강 확정": "badge-mint", "입금 대기": "badge-amber", "수강 완료": "badge-line", "취소 요청": "badge-amber", "신청 취소": "badge-red" };
const PAY_BADGE: Record<MyPaymentStatus, string> = { 결제완료: "badge-mint", "입금 대기": "badge-amber", 부분환불: "badge-amber", 환불완료: "badge-red" };
const tabName = (all: any, n: number) => esc(all?.tabs?.list?.[n]?.t);

export const PV_MY: PagePreview = {
  root: "site pg-mypage",
  before: headerWith(`<button type="button" class="btn btn-ghost btn-sm">로그아웃</button>`),
  after: commonAfter,
  sec: {
    pagehead: (d) => `<div class="wrap narrow pagehead"><h1>${esc(d.title)}</h1><p>${esc(d.desc)}</p></div>`,
    profile: (d) => `<div class="profile-card"><div class="profile-avatar">${esc(me.initial)}</div>
      <div class="profile-info"><p class="profile-name">${esc(me.name)} 님 <span class="badge badge-mint">${esc(d.badge)}</span></p><p class="profile-meta">${esc(me.email)} · ${esc(me.phone)}</p></div>
      <div class="profile-actions"><a class="btn btn-ghost btn-sm">${esc(d.edit)}</a></div></div>`,
    tabs: (d) => `<nav class="tabbar" aria-label="탭">${(d.list || []).map((t: any, i: number) => `<a class="tabbar-btn${i === 0 ? " active" : ""}">${esc(t.t)}</a>`).join("")}</nav>`,
    apply: (d, all) => `${tag(`탭 : ${tabName(all, 0)}`)}<div class="section"><div class="section-head"><h2>${esc(d.title)}</h2><span class="count">총 ${applications.length}건</span></div>
      ${applications.map((a) => `<div class="app-card"><div class="app-thumb ${esc(a.thumb)}"></div><div class="app-body"><p class="app-cat">${esc(a.cat)}</p><p class="app-title">${a.slug ? `<a>${esc(a.title)}</a>` : esc(a.title)}</p>
        <div class="app-meta"><span>${esc(a.when)}</span><span>${esc(a.place)}</span></div></div>
        <div class="app-right"><span class="badge ${APP_BADGE[a.status]}">${esc(a.status)}</span><span class="app-price">${esc(won(a.price))}</span>${a.status === "수강 확정" || a.status === "입금 대기" ? `<button type="button" class="app-cancel">취소 신청</button>` : ""}</div></div>`).join("")}</div>`,
    pay: (d, all) => {
      const th: any[] = d.th || [];
      const lab = (i: number) => esc(th[i]?.t);
      return `${tag(`탭 : ${tabName(all, 1)}`)}<div class="section"><div class="section-head"><h2>${esc(d.title)}</h2><span class="count">총 ${myPayments.length}건</span></div>
      <table class="pay-table"><thead><tr>${th.map((h) => `<th>${esc(h.t)}</th>`).join("")}</tr></thead><tbody>
      ${myPayments.map((p) => `<tr><td data-label="${lab(0)}">${esc(p.date)}</td><td data-label="${lab(1)}" class="pay-item">${esc(p.item)}</td><td data-label="${lab(2)}">${esc(p.method)}</td>
        <td data-label="${lab(3)}"><span class="badge ${PAY_BADGE[p.status]}">${esc(p.status)}</span></td><td data-label="${lab(4)}" class="pay-amount">${esc(won(p.amount))}</td>
        <td data-label="${lab(5)}">${p.status === "입금 대기" ? "—" : `<button type="button" class="receipt-link">${esc(d.receipt)}</button>`}</td></tr>`).join("")}
      </tbody></table></div>`;
    },
    online: (d, all) => `${tag(`탭 : ${tabName(all, 2)}`)}<div class="section"><div class="section-head"><h2>${esc(d.title)}</h2><span class="count">총 ${myCourses.length}건</span></div>
      ${myCourses.map((c) => `<div class="course-card"><div class="course-thumb ${esc(c.thumb)}"></div><div class="course-body"><p class="course-title">${esc(c.title)}</p><p class="course-meta">${esc(c.meta)}</p>
        <div class="progress-row"><div class="progress-track"><div class="progress-fill" style="width:${Number(c.pct) || 0}%"></div></div><span class="progress-pct">${Number(c.pct) || 0}%</span></div></div>
        <div class="course-right"><button type="button" class="btn ${c.done ? "btn-ghost" : "btn-mint"} btn-sm">${esc(c.done ? d.btn2 : d.btn1)}</button><span class="course-expiry">${esc(d.exp1)} ${esc(c.expiry)}${esc(d.exp2)}</span></div></div>`).join("")}</div>`,
    info: (d, all) => `${tag(`탭 : ${tabName(all, 3)}`)}<div class="section"><h2 style="margin-bottom:19px">${esc(d.title)}</h2>
      <form class="info-form">
        ${field(d.l1, me.name)}${field(d.l2, me.email, { disabled: true })}${field(d.l3, me.phone, { type: "tel" })}
        <div class="field-row">${field(d.l4, "", { ph: "새 비밀번호", type: "password" })}${field(d.l5, "", { ph: "새 비밀번호 확인", type: "password" })}</div>
        <button type="button" class="btn btn-mint">${esc(d.save)}</button><div class="divider-line"></div><button type="button" class="danger-link">${esc(d.out)}</button>
      </form>
      <div class="modal-box" style="margin:22px auto 0;box-shadow:0 10px 30px -12px rgba(20,22,26,.25)"><h3>${esc(d.out)}</h3><p>${esc(d.outMsg)}</p>
        <div class="modal-actions"><button type="button" class="btn btn-ghost">취소</button><button type="button" class="btn btn-danger">탈퇴하기</button></div></div></div>`,
  },
  /* 실제 구조: 제목 → .wrap.narrow(프로필 카드 · 탭바 · .tab-panel(탭 내용)) */
  compose: (parts) => {
    const head = parts.filter((p) => p.id === "pagehead").map((p) => p.html).join("");
    const top = parts.filter((p) => p.id === "profile" || p.id === "tabs").map((p) => p.html).join("");
    const panels = parts.filter((p) => !["pagehead", "profile", "tabs"].includes(p.id)).map((p) => p.html).join("");
    return `${head}<div class="wrap narrow">${top}<div class="tab-panel">${panels}</div></div>`;
  },
};

/* ═════════════ 신청 · 결제 ═════════════ */

const coTopbar = (crumb: boolean) => `<div class="topbar"><div class="wrap topbar-inner"><a class="co-logo"><img class="logo-img" src="/images/brand/logo.png" alt="비주얼아카데미" width="231" height="20"></a>${
  crumb ? `<div class="crumb"><a>클래스</a> &nbsp;›&nbsp; <a>${esc(EX_CAT)}</a> &nbsp;›&nbsp; ${esc(EX.name)}</div>` : ""}</div></div>`;

function flowBar(list: any[], step: number) {
  return `<div class="flowbar"><div class="wrap"><div class="flow">${list.map((x, i) => {
    const n = i + 1;
    const cls = n < step ? "done" : n === step ? "current" : "";
    return `<div class="flow-step ${cls}"><div class="fnum">${n < step ? "✓" : n}</div><div class="flabel">${esc(x.t)}</div></div>${i < list.length - 1 ? `<div class="flow-line${n < step ? " done" : ""}"></div>` : ""}`;
  }).join("")}</div></div></div>`;
}

const SUMMARY: [string, string][] = [
  ["개강일", EX.date ? fullDate(EX.date) : "미정"], ["시간", EX.time ?? "-"], ["정원", `${EX.capacity}명 중 ${EX.applied}명 신청`], ["장소", EX.place ?? "-"],
];

export const PV_PAY: PagePreview = {
  root: "site pg-checkout",
  before: () => coTopbar(true),
  after: () => `<footer class="co-footer">결제는 토스페이먼츠로 안전하게 처리돼요 · (주)비주얼뷰티</footer>`,
  sec: {
    flow: (d) => flowBar(d.list || [], 2),
    form: (d) => {
      const ph = ["홍길동", "010-0000-0000", "example@email.com", "매장명을 입력해주세요"];
      const val = [me.name, me.phone, me.email, ""];
      return `${tag("화면 : 신청 정보")}<div class="wrap"><div class="order-grid"><div>
        <div class="panel"><h3>${esc(d.title)}</h3>${(d.labels || []).map((l: any, i: number) => field(l.t, val[i] ?? "", { ph: ph[i] })).join("")}</div>
        <div class="panel"><h3>${esc(d.checkTitle)}</h3>${(d.checks || []).map((c: any, i: number) => `<label class="check-row"><input type="checkbox"><div><span class="cr-title">${esc(c.t)}</span>${i > 0 ? `<a class="cr-link">보기</a>` : ""}</div></label>`).join("")}</div>
      </div>
      <div class="summary-box"><p class="sb-title">${esc(EX_CAT)}</p><p class="sb-class">${esc(EX.name)}</p>
        <dl>${SUMMARY.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>
        <div class="sb-total"><span class="lbl">${esc(d.totalLabel)}</span><span class="amt">${esc(won(EX_PRICE))}</span></div>
        <p class="tax-note">${esc(taxNote(EX_PRICE, EX.taxType))}</p><button type="button" class="btn btn-mint">${esc(d.btn)}</button></div>
      </div></div>`;
    },
    method: (d) => `${tag("화면 : 결제 수단")}<div class="pay-wrap"><h2>${esc(d.title)}</h2>
      <div class="pay-methods">${(d.list || []).map((m: any, i: number) => `<div class="pmethod${i === 0 ? " on" : ""}"><span class="pm-label">${esc(m.t)}</span><span class="pm-sub">${esc(m.s)}</span></div>`).join("")}</div>
      <div class="pay-total"><span class="lbl">${esc(d.totalLabel)}</span><span class="amt">${esc(won(EX_PRICE))}</span></div>
      <p class="tax-note">${esc(taxNote(EX_PRICE, EX.taxType))}</p>
      <button type="button" class="btn btn-mint">${esc(won(EX_PRICE))} ${esc(d.btnSuffix)}</button><button type="button" class="btn btn-ghost">이전 단계로</button>
      <p class="tax-note">주문번호 VA-20261031-0001</p></div>
      ${tag("화면 : 결제 확인 중")}<div class="center-state"><div class="spinner"></div><h2>${esc(d.wait)}</h2><p>${esc(d.waitSub)}</p></div>`,
    fail: (d) => `${tag("화면 : 결제 실패")}<div class="center-state"><div class="result-icon fail">✕</div><h2>${esc(d.title)}</h2><p>${esc(d.desc)}</p>
      <div class="fail-reason">${esc(d.box).replace(/\n/g, "<br>")}</div>
      <div class="center-actions"><a class="btn btn-mint">${esc(d.btn1)}</a><a class="btn btn-ghost">${esc(d.btn2)}</a></div>
      <p class="refund-note">${esc(d.note)}</p></div>`,
    done: (d, all) => {
      const list = (s: unknown) => `<ul class="done-list">${lines(s).map((n) => `<li>${esc(n)}</li>`).join("")}</ul>`;
      const steps = all?.flow?.list || [];
      return `${tag("화면 : 신청 완료 (오프라인 클래스)")}${flowBar(steps, 4)}<div class="done-wrap"><div class="result-icon ok">✓</div><h2>${esc(d.ok)}</h2><p class="done-title">${esc(EX.name)}</p>
        <div class="order-no">주문번호 VA-20261031-0001</div>
        <div class="done-panel"><h3>${esc(d.guideTitle)}</h3>${list(d.offline)}</div>
        <div class="done-cta"><a class="btn btn-mint">${esc(d.btnMy)}</a><a class="btn btn-ghost">${esc(d.btnList)}</a></div></div>
      ${tag("화면 : 신청 완료 (온라인 강의)")}<div class="done-wrap"><div class="result-icon ok">✓</div><h2>${esc(d.ok)}</h2><p class="done-title">월 2000플랜 (온라인)</p>
        <div class="order-no">주문번호 VA-20261031-0002</div>
        <div class="done-panel"><h3>${esc(d.guideTitle)}</h3>${list(d.online)}</div>
        <div class="done-cta"><a class="btn btn-mint">${esc(d.btnWatch)}</a><a class="btn btn-ghost">${esc(d.btnList)}</a></div></div>
      ${tag("화면 : 입금 대기 (가상계좌)")}<div class="done-wrap"><div class="result-icon ok">✓</div><h2>${esc(d.pending)}</h2><p class="done-title">${esc(EX.name)}</p>
        <div class="order-no">주문번호 VA-20261031-0003</div>
        <div class="waiting-box">${esc(d.pendingBox)}<div class="wb-sub">가상계좌: 신한은행 562-110-123456 · 입금기한 2026.10.20 23:59까지 · ${esc(won(EX_PRICE))}</div></div>
        <div class="done-cta"><a class="btn btn-mint">${esc(d.btnMy)}</a><a class="btn btn-ghost">${esc(d.btnList)}</a></div></div>`;
    },
  },
};

/* ═════════════ 로그인 · 가입 ═════════════ */

const KAKAO = (size = 20) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="#191919" aria-hidden="true"><path d="M12 3C6.5 3 2 6.5 2 10.8c0 2.8 1.8 5.2 4.6 6.6l-1 3.6c-.1.3.2.5.5.4l4.2-2.8c.6.1 1.1.1 1.7.1 5.5 0 10-3.5 10-7.8S17.5 3 12 3z"></path></svg>`;
const nameOf = (s: unknown) => esc(String(s ?? "").replace("{이름}", me.name));

export const PV_LOGIN: PagePreview = {
  root: "site pg-login",
  before: headerWith(`<button type="button" class="btn btn-mint btn-sm">카카오로 로그인</button>`),
  after: commonAfter,
  sec: {
    start: (d) => `${tag("화면 : 로그인 첫 화면")}<main class="signup"><div class="lg-hero"><div class="big">${KAKAO(34)}</div><h1>${esc(d.title)}</h1><p class="lead">${esc(d.lead)}</p></div>
      <div class="card"><button type="button" class="kbtn">${KAKAO()}${esc(d.btn)}</button><ul class="notes">${(d.notes || []).map((n: any) => `<li>${esc(n.t)}</li>`).join("")}</ul></div>
      <p class="small">${esc(d.small)}<br>처음이라면 <a>회원가입</a></p></main>`,
    profile: (d) => `${tag("화면 : 처음 오는 회원 · 정보 확인")}<main class="signup"><h1>${esc(d.title)}</h1><p class="lead">${esc(d.lead)}</p><div class="card">
      <div class="field"><label>이름</label><input type="text" readonly value="${esc(me.name)}"><div class="pre-note">${esc(d.nameNote)}</div></div>
      <div class="field"><label>휴대폰 번호</label><input type="text" readonly disabled value="${esc(me.phone)}"><div class="pre-note">${esc(d.phoneNote)}</div></div>
      <div class="field"><label>${esc(d.shop)}<span class="opt">(선택)</span></label><input type="text" readonly placeholder="매장명을 입력해주세요"></div>
      <div class="agree"><label class="all"><input type="checkbox">전체 동의</label>
        ${(d.agree || []).map((a: any, i: number) => `<label><input type="checkbox"><span class="tag${i < 3 ? "" : " o"}">${i < 3 ? "필수" : "선택"}</span>${esc(a.t)}${i < 2 ? `<a class="view">보기</a>` : ""}</label>`).join("")}</div>
      <button type="button" class="btn btn-mint submit">${esc(d.btn)}</button></div></main>`,
    done: (d) => `${tag("화면 : 가입 완료")}<main class="signup"><div class="card"><div class="done"><div class="ic">✓</div><h2>${nameOf(d.newTitle)}</h2><p>${esc(d.newDesc)}</p>
        <div class="btns"><a class="btn btn-mint">${esc(d.btn1)}</a><a class="btn btn-ghost">${esc(d.btn2)}</a></div></div></div></main>
      ${tag("화면 : 다시 로그인한 회원")}<main class="signup"><div class="card"><div class="done"><div class="ic">✓</div><h2>${nameOf(d.oldTitle)}</h2><p>${esc(d.oldDesc)}</p>
        <div class="btns"><a class="btn btn-mint">${esc(d.btn1)}</a><a class="btn btn-ghost">${esc(d.btn2)}</a></div></div></div></main>`,
  },
};
