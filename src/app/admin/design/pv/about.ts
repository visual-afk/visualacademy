/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * 디자인 모드 미리보기 — 아카데미 소개(src/app/about/page.tsx) · 대표 인사(src/app/about/greeting/page.tsx).
 * 실제 페이지와 같은 마크업·클래스. 아카데미 소개는 실제로는 탭 하나씩 보이지만, 미리보기에서는 모든 탭 내용을 차례로 보여준다.
 */
import { COMPANY } from "@/data/site";
import { bg, commonAfter, commonBefore, esc, instructorSlider, nl, sp, tag, url, type PagePreview, type R } from "./kit";

/** **굵게**(em=true면 <em>) + 줄바꿈 — about/page.tsx 의 Rich */
const rich = (s: unknown, em = false) =>
  esc(s).replace(/\*\*(.+?)\*\*/g, em ? "<em>$1</em>" : "<b>$1</b>").replace(/\n/g, "<br>");

/** 사진 자리 — 사진이 있으면 has-img + background-image, 없으면 듀오톤 자리표시 클래스 */
const photo = (base: string, u: unknown, ph: string, inner = "") =>
  `<div class="${base} ${url(u) ? "has-img" : ph}"${url(u) ? ` style="${bg(u)}"` : ""}>${inner}</div>`;

/* 탭 : 섹션 → 탭 번호 (TAB_KEYS = intro, inst, gallery, way, partner) */
const TAB_OF: Record<string, number> = {
  intro: 0, introPhoto: 0, diff: 0, price: 0, facility: 0, ifbs: 0, welcome: 0, stats: 0, quote: 0,
  inst: 1, gallery: 2, way: 3, partner: 4,
};

const PIN = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 1 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>`;

const ABOUT: Record<string, R> = {
  pagehead: (d) => `<h1>${esc(d.title)}</h1><p>${esc(d.desc)}</p>`,
  tabs: (d) => `<nav class="tabbar" aria-label="탭">${(d.list || []).map((t: any, i: number) => `<a class="tabbar-btn${i === 0 ? " active" : ""}">${esc(t.t)}</a>`).join("")}</nav>`,
  intro: (d) => `<div class="section about-intro"><p class="kicker">${esc(d.kicker)}</p><h2>${rich(d.title)}</h2><p class="strong">${esc(d.lead)}</p>${(d.paras || []).map((x: any) => `<p>${rich(x.p)}</p>`).join("")}</div>`,
  introPhoto: (d) => photo("big-photo", d.img, "p1", `<span>${esc(d.caption)}</span>`),
  diff: (d) => `<div class="section qa-block"><div class="qa-head"><span class="qtag">Q.</span><h2>${esc(d.q)}</h2></div>
    <div class="trio-grid">${(d.list || []).map((x: any, i: number) => `<div>${photo("trio-photo", x.img, ["p3", "p2", "p6"][i % 3])}<p class="trio-cap"><b>${esc(x.b)}</b>${esc(x.d)}</p></div>`).join("")}</div></div>`,
  price: (d) => `<div class="section qa-block"><div class="split-section"><div class="split-text"><p class="qtag">${esc(d.q)}</p><h3>${rich(d.title)}</h3><p>${rich(d.text)}</p></div>${photo("split-photo", d.img, "p5")}</div></div>`,
  facility: (d) => `<div class="section"><h2>${esc(d.title)}</h2><div class="trio-grid facility-compact">${(d.list || []).map((x: any, i: number) => `<div>${photo("trio-photo", x.img, ["p1", "p2", "p6", "p4", "p5", "p3"][i % 6])}<p class="trio-cap"><b>${esc(x.b)}</b>${esc(x.d)}</p></div>`).join("")}</div></div>`,
  ifbs: (d) => `<div class="section qa-block"><div class="split-section light reverse"><div class="split-text"><p class="qtag">${esc(d.tag)}</p><h3>${rich(d.title)}</h3>${(d.paras || []).map((x: any) => `<p>${rich(x.p)}</p>`).join("")}</div>${photo("split-photo", d.img, "p3")}</div></div>`,
  welcome: (d) => `<div class="section qa-block"><div class="split-section light"><div class="split-text"><p class="qtag">${esc(d.tag)}</p><h3>${rich(d.title)}</h3>${(d.paras || []).map((x: any) => `<p>${rich(x.p)}</p>`).join("")}</div>${photo("split-photo", d.img, "p5")}</div></div>`,
  stats: (d) => `<div class="section dark-section"><div class="dark-inner"><div class="stats-dark"><h3>${esc(d.title)}</h3>
    <div class="stat-grid-dark">${(d.list || []).map((s: any) => `<div class="stat-tile-dark"><p class="num">${esc(s.n)}</p><p class="label">${esc(s.l)}</p></div>`).join("")}</div></div>
    <div class="salon-banner"><h3>${esc(d.salon)}</h3><div class="salon-chip-row">${sp(d.branches).map((b) => `<span class="salon-chip">${esc(b)}</span>`).join("")}</div></div></div></div>`,
  quote: (d) => `<div class="section quote-section p6"><div class="qtext">${(d.paras || []).map((x: any, i: number) => `<p>${i === 0 ? rich(x.p, true) : rich(String(x.p || "").replace(/\*\*/g, ""))}</p>`).join("")}</div></div>`,
  inst: (d, _all, ctx) => `<div class="section"><h2>${esc(d.title)}</h2>${instructorSlider(ctx.main?.instructors)}</div>`,
  gallery: (d) => `<div class="section"><h2>${esc(d.title)}</h2><div class="gallery-grid">${(d.list || []).map((g: any, i: number) =>
    `<div class="gallery-tile ${url(g.img) ? "has-img" : `g${(i % 6) + 1}`}"${url(g.img) ? ` style="${bg(g.img)}"` : ""}><span>${esc(g.c)}</span></div>`).join("")}</div></div>`,
  way: (d) => `<div class="section"><h2>${esc(d.title)}</h2>${url(d.mapImg) ? `<img class="map-img" src="${esc(url(d.mapImg))}" alt="${esc(d.title)} 약도">` : `<div class="map-box">${PIN}<p>${esc(d.mapNote)}</p></div>`}
    <div class="info-list"><div class="info-row"><span class="info-label">주소</span><span class="info-val">${rich(d.addr)}</span></div>
    <div class="info-row"><span class="info-label">전화</span><span class="info-val">${esc(d.tel)}</span></div>
    <div class="info-row"><span class="info-label">카카오톡</span><span class="info-val">채널 ${esc(COMPANY.kakao)}</span></div>
    <div class="info-row"><span class="info-label">운영 시간</span><span class="info-val">${esc(d.hours)}</span></div></div></div>`,
  partner: (d) => `<div class="section"><h2>${esc(d.title)}</h2><p class="lead" style="margin-bottom:24px">${esc(d.lead)}</p>
    <form class="contact-form">
      <div class="field"><label>담당자명</label><input type="text" placeholder="홍길동" readonly tabindex="-1"></div>
      <div class="field"><label>매장명 / 소속</label><input type="text" placeholder="매장명을 입력해주세요" readonly tabindex="-1"></div>
      <div class="field"><label>연락처</label><input type="tel" placeholder="010-0000-0000" readonly tabindex="-1"></div>
      <div class="field"><label>문의 유형</label><select tabindex="-1">${(d.types || []).map((x: any) => `<option>${esc(x.t)}</option>`).join("")}</select></div>
      <div class="field"><label>문의 내용</label><textarea placeholder="문의하실 내용을 자유롭게 남겨주세요" readonly tabindex="-1"></textarea></div>
      <button type="button" class="btn btn-mint" tabindex="-1">${esc(d.btn)}</button>
    </form></div>`,
};

export const PV_ABOUT: PagePreview = {
  root: "site pg-about",
  sec: ABOUT,
  before: commonBefore("academy"),
  after: commonAfter,
  compose: (parts, all) => {
    const head = parts.filter((p) => p.id === "pagehead").map((p) => p.html).join("");
    const bar = parts.filter((p) => p.id === "tabs").map((p) => p.html).join("");
    let lastTab = -1;
    const panel = parts.filter((p) => p.id !== "pagehead" && p.id !== "tabs").map((p) => {
      const t = TAB_OF[p.id] ?? lastTab;
      const label = t !== lastTab && t >= 0 ? tag(`탭 : ${esc(all?.tabs?.list?.[t]?.t)}`) : "";
      lastTab = t;
      return label + p.html;
    }).join("");
    return `<div class="wrap narrow pagehead">${head}</div><div class="wrap narrow">${bar}<div class="tab-panel">${panel}</div></div>`;
  },
};

/* ── 대표 인사 ── */

/** 배경 — 검은 바탕 위로 흐르는 빛줄기 (greeting/page.tsx LightStreaks) */
const LIGHT_STREAKS = `<svg class="bg" viewBox="0 0 1600 1400" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
<defs>
<linearGradient id="gr-g1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"></stop><stop offset=".5" stop-color="#fff" stop-opacity=".34"></stop><stop offset="1" stop-color="#fff" stop-opacity="0"></stop></linearGradient>
<linearGradient id="gr-g2" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"></stop><stop offset=".55" stop-color="#fff" stop-opacity=".22"></stop><stop offset="1" stop-color="#fff" stop-opacity="0"></stop></linearGradient>
<filter id="gr-b1" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="22"></feGaussianBlur></filter>
<filter id="gr-b2" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="9"></feGaussianBlur></filter>
<radialGradient id="gr-v" cx=".5" cy=".5" r=".75"><stop offset=".35" stop-color="#000" stop-opacity="0"></stop><stop offset="1" stop-color="#000" stop-opacity=".85"></stop></radialGradient>
</defs>
<g fill="none" stroke-linecap="round">
<path d="M300 -80 C700 260 1250 120 1500 620 S1250 1180 1020 1500" stroke="url(#gr-g1)" stroke-width="150" filter="url(#gr-b1)"></path>
<path d="M700 -100 C760 380 1100 520 1180 900 S1000 1300 1180 1500" stroke="url(#gr-g2)" stroke-width="95" filter="url(#gr-b1)"></path>
<path d="M120 200 C520 420 860 360 1060 760" stroke="url(#gr-g1)" stroke-width="46" filter="url(#gr-b2)"></path>
<path d="M980 40 C1220 300 1500 340 1620 820" stroke="url(#gr-g2)" stroke-width="64" filter="url(#gr-b2)"></path>
<path d="M560 700 C820 760 1040 1020 1000 1420" stroke="url(#gr-g1)" stroke-width="34" filter="url(#gr-b2)" opacity=".7"></path>
</g>
<rect width="1600" height="1400" fill="url(#gr-v)"></rect>
</svg>`;

const GREETING: Record<string, R> = {
  head: (d) => `<h1 class="ceo-t">${esc(d.title)}</h1><div class="ceo-bar"></div><p class="ceo-hello">${nl(d.hello)}</p>`,
  panel: (d) => ((d.list || []).length ? `<div class="ceo-panel"><ul>${d.list.map((x: any) => `<li>${esc(x.t)}</li>`).join("")}</ul></div>` : ""),
  body: (d) => `<hr class="ceo-hr"><h2 class="ceo-q">${esc(d.quote)}</h2>${(d.paras || []).map((x: any) => `<p class="ceo-p">${nl(x.p)}</p>`).join("")}`,
  sign: (d) => `<div class="ceo-sign"><b>${esc(d.label)}</b>${url(d.img) ? `<img src="${esc(url(d.img))}" alt="${esc(d.alt)}">` : ""}</div>`,
};

export const PV_GREETING: PagePreview = {
  root: "site pg-greeting",
  sec: GREETING,
  before: commonBefore("academy"),
  after: commonAfter,
  /* 사진(.ceo-photo)은 영역이 아니라 항상 보인다 — 실제 페이지와 같이 '제목 · 인사'를 숨겨도 남는다 */
  compose: (parts, all) => `<section class="ceo-dark">${LIGHT_STREAKS}<div class="ceo-in"><div class="ceo-grid">
    <div class="ceo-photo">${url(all?.head?.photo) ? `<img src="${esc(url(all.head.photo))}" alt="${esc(all.head.photoAlt)}">` : ""}</div>
    <div class="ceo-col">${parts.map((p) => p.html).join("")}</div></div></div></section>`,
};
