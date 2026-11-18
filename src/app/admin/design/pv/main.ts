/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * 메인 페이지 미리보기 — src/app/page.tsx · HeroSearch · GrowthRoadmap · InstructorSlider · SiteHeader/SiteFooter · RefundPopup 마크업 그대로.
 * 모집중 카드는 src/data/classes.ts 목업 + 같은 노출 규칙(pickRecruit)으로 만든다.
 */
import { classes } from "@/data/classes";
import { dday, ddayLabel, priceLabel, shortDate } from "@/lib/format";
import { badgeClass, CATEGORY_LABELS, computeStatus } from "@/lib/status";
import type { AcademyClass, ClassStatus } from "@/lib/types";
import { esc, ICON_SEARCH, img, instructorSlider, nl, siteFooter, siteHeader, sp, tag, type PagePreview } from "./kit";

const PROG_ICONS = [
  ["M4 20V10M10 20V4M16 20v-8M22 20H2"],
  ["M13 2 4 14h7l-1 8 9-12h-7z"],
  ["M3 9l9-5 9 5-9 5z", "M7 11.5V16c0 1.5 2.2 3 5 3s5-1.5 5-3v-4.5"],
];
const HERO_WAVES = [
  { a: "M-40,120 C260,40 420,260 720,140 C980,40 1160,180 1260,80", o: 0.35 },
  { a: "M-60,620 C240,720 460,540 760,660 C1000,750 1180,600 1280,680", o: 0.28 },
  { a: "M-40,380 C300,300 560,460 820,360 C1020,290 1180,380 1260,340", o: 0.2 },
];
const LABEL_POS = ["top", "top", "bottom", "bottom"];
const LINE_START = 81, LINE_END = 7;
const dotY = (i: number) => LINE_START + ((LINE_END - LINE_START) * i) / 4;

type Row = AcademyClass & { status: ClassStatus };

/** page.tsx pickRecruit 와 같은 규칙 */
function pickRecruit(rule: string, count: number): Row[] {
  const rows = classes.map((c) => ({ ...c, status: computeStatus(c) })).filter((c) => !["종료", "마감", "개설예정"].includes(c.status));
  const urgency = (c: Row) => (c.status === "마감임박" ? 0 : c.date ? 1 : c.type === "online" ? 2 : 3);
  if (rule === "imminent") rows.sort((a, b) => urgency(a) - urgency(b) || (a.date && b.date ? dday(a.date) - dday(b.date) : 0));
  if (rule === "start") rows.sort((a, b) => (a.date ? dday(a.date) : 9999) - (b.date ? dday(b.date) : 9999));
  return rows.slice(0, count);
}

function recruitCard(c: Row, hot: boolean) {
  const online = c.type === "online", wait = c.type === "waitlist";
  const badge = online ? "상시 수강" : wait ? "개설 대기" : c.status;
  const applied = c.applied ?? 0;
  const info: [string, string][] = online
    ? [["구성", `영상 강의 · 수강 기간 ${c.months}개월`], ["시작", "결제 후 바로 시작 가능"]]
    : wait
      ? [["일정", "인원이 차면 일정 안내"], ["구성", `${CATEGORY_LABELS[c.cat] ?? c.cat} · ${c.weeks ? `${c.weeks}주 과정` : "1일 과정"}`]]
      : [["일정", `${c.date ? shortDate(c.date) : "미정"} 개강${c.weeks ? ` · 총 ${c.weeks}주` : ""}`], ["장소", `${c.place} · ${c.day}요일${c.weeks ? "반" : ""}`]];
  const seat = online
    ? { label: "모집 현황", value: "인원 제한 없음", pct: 100, dim: true }
    : wait
      ? { label: "개설 기준", value: `<b>${applied}명</b> / 개설 기준 ${c.goal ?? applied}명`, pct: c.goal ? Math.min(100, (applied / c.goal) * 100) : 0, dim: false }
      : { label: "모집 현황", value: `<b>잔여 ${Math.max(0, (c.capacity ?? 0) - applied)}석</b> / ${c.capacity}석`, pct: c.capacity ? Math.min(100, (applied / c.capacity) * 100) : 0, dim: false };
  const dd = online ? `<span class="dday mute">온라인</span>` : wait ? `<span class="dday mute">${applied}명 대기 중</span>` : `<span class="dday">개강 ${c.date ? esc(ddayLabel(c.date)) : ""}</span>`;
  return `<div class="class-card${hot ? " hot" : ""}"><div class="cc-top"><span class="badge ${online || wait ? "badge-line" : badgeClass(c.status)}">${esc(badge)}</span>${dd}</div>
    <h3><a>${esc(c.name)}</a></h3><ul class="cc-info">${info.map(([k, v]) => `<li><b>${esc(k)}</b><span>${esc(v)}</span></li>`).join("")}</ul>
    <div class="seat"><div class="seat-top"><span>${seat.label}</span><span>${seat.value}</span></div><div class="seat-bar"><i style="width:${seat.pct}%;${seat.dim ? "opacity:.35" : ""}"></i></div></div>
    <p class="price">${esc(priceLabel(c))}${c.price ? `<small>${c.taxType === "exempt" ? "면세" : "VAT 포함"}</small>` : ""}</p>
    ${wait ? `<a class="btn btn-ghost">개설 알림 신청</a>` : `<a class="btn ${online ? "btn-ghost" : "btn-mint"}">${online ? "바로 수강 신청" : "신청하기"}</a>`}</div>`;
}

/** GrowthRoadmap 마크업 — 첫 경력 탭 · 추천 단계(Step 01) 선택 상태 */
function roadmap(d: any) {
  const active = 0;
  const steps: any[] = d.steps || [];
  return `<div class="section-head"><h2>${esc(d.title)}</h2><p>${esc(d.desc)}</p></div>
  <div class="exp-tabs">${(d.tabs || []).map((t: any, i: number) => `<button type="button" class="etab${i === 0 ? " active" : ""}">${esc(t.t)}</button>`).join("")}</div>
  <div class="roadmap"><div class="roadmap-inner"><div class="rgraph">
    <svg class="rgraph-svg" viewBox="0 0 1000 100" preserveAspectRatio="none" aria-hidden="true"><path class="rgraph-line" d="M0,${LINE_START} L1000,${LINE_END}" fill="none" stroke="#c7ccc7" stroke-width="2.4" stroke-linecap="round" vector-effect="non-scaling-stroke"></path></svg>
    <div class="rdot-end" style="left:100%;top:${LINE_END}%"></div>${[0, 25, 50, 75].map((l) => `<div class="rdivider" style="left:${l}%"></div>`).join("")}<div class="rdivider end"></div>
    ${steps.map((s, i) => `<div class="rcol${i === active ? " active recommended" : ""}" data-step="${i}" style="--y:${dotY(i)}%"><div class="rcol-divider"></div><div class="rcol-glow"></div>${img(s.img, "", "rcol-img")}
      <p class="rtag">추천</p><div class="rdot"></div><div class="rlabel rlabel-${LABEL_POS[i] ?? "top"}"><p class="rl-step">Step 0${i + 1}</p><p class="rl-name">${esc(s.name)}</p>${s.desc ? `<p class="rl-desc">${nl(s.desc)}</p>` : ""}</div></div>`).join("")}
  </div><div class="rcards">${steps.map((s, i) => `<div class="rcard-slot${i === active ? " show" : ""}"><div class="rcard${i === active ? " show" : ""}">${img(s.img, "", "rc-img")}
      <p class="rc-step">Step 0${i + 1}</p><p class="rc-name">${esc(s.cls)}</p><p class="rc-meta">${esc(s.meta)}</p>
      <div class="rc-extra">${sp(s.chips).map((c) => `<span class="rchip">${esc(c)}</span>`).join("")}</div><a class="rc-cta">신청하기</a></div></div>`).join("")}</div>
  </div></div>`;
}

export const PV_MAIN: PagePreview = {
  root: "site pg-home",
  sec: {
    /* 히어로가 바로 뒤에 오면 어두운 헤더 (page.tsx 와 같은 조건) */
    nav: (d, all) => siteHeader(d, { hero: all.visible.hero && all.order.indexOf("hero") === all.order.indexOf("nav") + 1 }),
    hero: (d) => `<section class="hero" id="heroSection">
      <div class="hero-bigtext" aria-hidden="true"><div class="hero-bigtext-track"><span>VISUAL ACADEMY</span><span>VISUAL ACADEMY</span></div></div>
      <svg class="hero-strands" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${HERO_WAVES.map((w, i) => `<path class="hero-wave hero-wave-${i + 1}" d="${w.a}" stroke="#5fd0ca" stroke-width="1" fill="none" opacity="${w.o}"></path>`).join("")}</svg>
      ${d.badges?.[0] ? `<div class="hero-badge badge-tl"><span class="dot"></span>${esc(d.badges[0].t)}</div>` : ""}${d.badges?.[1] ? `<div class="hero-badge badge-br"><span class="dot"></span>${esc(d.badges[1].t)}</div>` : ""}
      <div class="hero-inner"><p class="hero-eyebrow">${esc(d.eyebrow)}</p><h1>${esc(d.title)}</h1>
        <div class="searchbox" id="search"><input type="text" readonly tabindex="-1" placeholder="${esc(d.placeholder)}"><button type="button" class="btn btn-mint" aria-label="검색">${ICON_SEARCH(20, 2.2)}</button></div>
        <div class="hero-suggest">${(d.suggest || []).map((s: any, i: number) => `${i > 0 ? `<span class="sep">·</span>` : ""}<button type="button">${esc(s.t)}</button>`).join("")}</div>
      </div></section>`,
    roadmap: (d) => `<section id="diagnosis" class="roadmap-section"><div class="wrap">${roadmap(d)}</div></section>`,
    recruit: (d) => `<section class="bg-surface" id="program"><div class="wrap"><div class="section-head"><h2>${esc(d.title)}</h2><p>${esc(d.desc)}</p></div>
      <div class="cards3">${pickRecruit(d.rule, Number(d.count) || 3).map((c, i) => recruitCard(c, i === 0)).join("")}</div></div></section>`,
    programs: (d) => `<section id="academy"><div class="wrap"><div class="section-head"><h2>${esc(d.title)}</h2><p>${esc(d.desc)}</p></div>
      <div class="prog3">${(d.cards || []).map((p: any, i: number) => `<div class="prog-card"><span class="prog-no">${String(i + 1).padStart(2, "0")}</span>
        <div class="prog-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PROG_ICONS[i % PROG_ICONS.length].map((x) => `<path d="${x}"></path>`).join("")}</svg></div>
        <h3>${esc(p.title)}</h3><p>${esc(p.desc)}</p><div class="chips">${sp(p.chips).map((t) => `<span>${esc(t)}</span>`).join("")}</div><a>전체 보기</a></div>`).join("")}</div></div></section>`,
    online: (d) => `<section class="bg-surface tight" id="online"><div class="wrap"><div class="online-banner"><div>
        ${d.tag ? `<div class="ob-tag"><i></i>${esc(d.tag)}</div>` : ""}<h3>${esc(d.title)}</h3><p>${esc(d.desc)}</p><div class="ob-feat">${sp(d.feats).map((t) => `<span>${esc(t)}</span>`).join("")}</div></div>
      <div class="ob-cta"><a class="btn btn-mint">${esc(d.btn)}</a>${d.price ? `<small>${esc(d.priceName)} <b>${esc(d.price)}</b></small>` : ""}</div></div></div></section>`,
    instructors: (d) => `<section><div class="wrap"><div class="section-head"><h2>${esc(d.title)}</h2><p>${esc(d.desc)}</p></div>${instructorSlider(d)}</div></section>`,
    reviews: (d) => `<section class="bg-surface" id="reviews"><div class="wrap"><div class="section-head"><h2>${esc(d.title)}</h2><p>${esc(d.desc)}</p></div>
      <div class="testi-grid">${(d.list || []).map((r: any) => `<div class="testi-card"><div class="qm" aria-hidden="true">&ldquo;</div>${r.course ? `<span class="tcourse">${esc(r.course)}</span>` : ""}
        <p class="tq">${esc(r.q)}</p><div class="testi-who"><div class="testi-av" aria-hidden="true">${esc(String(r.a || "").slice(0, 1))}</div><div><b>${esc(r.a)}</b><span>${esc(r.sub)}</span></div></div></div>`).join("")}</div></div></section>`,
    salon: (d) => `<section class="tight"><div class="wrap"><div class="salon-band"><div>${d.tag ? `<div class="sb-tag">${esc(d.tag)}</div>` : ""}<h3>${esc(d.title)}</h3><p>${esc(d.desc)}</p>
      <div class="sb-regions">${sp(d.regions).map((t) => `<span>${esc(t)}</span>`).join("")}</div></div><a class="btn btn-ghost">${esc(d.btn)}</a></div></div></section>`,
    /* 푸터 + "환불 규정" 팝업 (RefundPopup 마크업, 고정 배경 없이 펼쳐서) */
    footer: (d, all) => `${siteFooter(d, all.nav)}${tag("팝업 : 푸터 \"환불 규정\" 클릭 시")}
      <div style="background:rgba(20,22,26,.55);padding:32px 20px;display:flex;justify-content:center"><div class="rf-box" style="max-height:none">
        <div class="rf-head"><h2>${esc(d.rfTitle)}</h2><button type="button" class="rf-x" aria-label="닫기">×</button></div>
        <div class="rf-scroll"><table class="rf-table"><thead><tr>${(d.rfTh || []).map((h: any, i: number) => `<th${i === 0 ? ' style="width:22%"' : i === 2 ? ' style="width:20%"' : ""}>${esc(h.t)}</th>`).join("")}</tr></thead>
          <tbody>${(d.rfCats || []).map((c: any) => (c.rows || []).map((r: any, i: number) => `<tr>${i === 0 ? `<td class="cat" rowspan="${c.rows.length}">${esc(c.name)}${c.sub ? `<br><span>${esc(c.sub)}</span>` : ""}</td>` : ""}<td>${esc(r.c)}</td><td class="hl">${esc(r.r)}</td></tr>`).join("")).join("")}</tbody></table></div>
        <div class="rf-note"><b>${esc(d.rfNoteTitle)}</b>${esc(d.rfNote)}</div><button type="button" class="rf-close">확인했어요</button></div></div>`,
  },
};
