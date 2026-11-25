/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * 디자인 모드 미리보기 — 클래스 목록(/classes) · 클래스 상세(/classes/[slug]).
 * src/app/classes/ClassList.tsx · [slug]/ClassDetailView.tsx · components/site/ClassThumb.tsx · GrowthRoadmap.tsx 와
 * 같은 마크업·클래스 이름을 쓴다 (상태는 첫 탭·추천 단계 등 기본값으로 고정). 클래스 카드는 목업 데이터(src/data/classes.ts).
 */
import { classes } from "@/data/classes";
import { getClassDetail, refundPolicy } from "@/lib/classes";
import { dayLabel, ddayLabel, fullDate, priceLabel } from "@/lib/format";
import { badgeClass, CATEGORY_LABELS, computeStatus, ctaLabel, STEP_NAMES } from "@/lib/status";
import type { AcademyClass, ClassStatus } from "@/lib/types";
import { commonAfter, commonBefore, esc, img, nl, sp, tag, type PagePreview } from "./kit";

type Row = AcademyClass & { status: ClassStatus };
const ROWS: Row[] = classes.filter((c) => !c.draft).map((c) => ({ ...c, status: computeStatus(c) }));
const ORDER = ROWS.filter((c) => c.cat === "정석").sort((a, b) => (a.level ?? 0) - (b.level ?? 0));
const OTHERS = ROWS.filter((c) => c.cat !== "정석");
const ROW_CATS = ["특강", "세미나", "경영", "온라인"];
const CAT_SHORT: Record<string, string> = { 특강: "특강", 세미나: "세미나", 경영: "경영", 온라인: "ON" };

/* ── ClassThumb ── */
const tileClass = (c: AcademyClass) => (c.cat === "정석" ? `l${c.level ?? 1}` : `c-${c.cat}`);
function thumb(c: AcademyClass) {
  if (c.images?.thumb && img(c.images.thumb)) return `<div class="thumb">${img(c.images.thumb, c.name)}</div>`;
  return `<div class="thumb tg ${esc(tileClass(c))}" aria-hidden="true">${
    c.cat === "정석" ? `<span>L${c.level ?? 1}<small>LEVEL</small></span>` : `<span>${esc(CAT_SHORT[c.cat] ?? c.cat)}</span>`}</div>`;
}

/* ── ClassList 카드 ── */
function metaLine(c: Row, withPlace: boolean) {
  const place = withPlace ? ` · ${c.place}` : "";
  if (c.status === "종료") return `${c.date} 종료됨${place}`;
  if (c.type === "online") return withPlace ? `상시 · 수강 기간 ${c.months}개월` : "상시";
  if (c.type === "waitlist") return `일정 미정${place}`;
  return `${c.date} (${ddayLabel(c.date!)})${place}`;
}
function classBtn(c: Row) {
  const disabled = c.status === "종료" || c.status === "마감";
  const ghost = disabled || c.type === "waitlist" || c.type === "upcoming";
  return `<a class="btn ${ghost ? "btn-ghost" : "btn-mint"}">${esc(ctaLabel(c, c.status))}</a>`;
}
function orderCard(c: Row) {
  const upcoming = c.type === "upcoming";
  return `<div class="order-card ${upcoming ? "muted" : "active"}"><div class="order-node s${c.level}">${c.level}</div>
    <div class="headrow">${thumb(c)}<div class="ht"><p class="ostep">STEP ${c.level} · ${esc(STEP_NAMES[(c.level ?? 1) - 1])}</p><h3><a class="card-link">${esc(c.name)}</a></h3></div></div>
    ${upcoming
      ? `<span class="badge badge-line">개설 예정</span><p class="ometa">일정이 정해지면 가장 먼저 알려드려요</p>`
      : `<span class="badge ${badgeClass(c.status)}">${esc(c.status)}</span><p class="ometa">${esc(c.date)} (${esc(ddayLabel(c.date!))})<span class="sep">·</span>${esc(c.place)}</p><p class="oprice">${esc(priceLabel(c))}</p>`}
    ${classBtn(c)}</div>`;
}
function linkedCard(c: Row) {
  const ended = c.status === "종료";
  return `<div class="linked-card${ended ? " past" : ""}" data-cat="${esc(c.cat)}"><div class="linkrow">${thumb(c)}<div class="lr-txt"><span class="badge ${ended ? "badge-ended" : "badge-line"}">${ended ? "종료" : esc(c.cat)}</span><h4><a class="card-link">${esc(c.name)}</a></h4></div></div>
    <p class="lc-meta">${esc(metaLine(c, false))}<span class="sep">·</span>${esc(c.place)}</p><p class="lc-price">${esc(priceLabel(c))}</p>${classBtn(c)}</div>`;
}
function rowCard(c: Row) {
  return `<div class="row-card${c.status === "종료" ? " past" : ""}"><div class="rctop"><span class="badge badge-line">${esc(c.cat)}</span><span class="badge ${badgeClass(c.status)}">${esc(c.status)}</span></div>
    <div class="headrow">${thumb(c)}<div class="ht"><h3><a class="card-link">${esc(c.name)}</a></h3></div></div>
    <p class="meta">${esc(dayLabel(c.day))}<span class="sep">·</span>${esc(c.time)}</p><p class="meta" style="margin-top:2px">${esc(metaLine(c, true))}</p>
    <div class="tags">${c.step ? `<span class="step-chip s${c.step}">STEP ${c.step} · ${esc(STEP_NAMES[c.step - 1])}</span>` : ""}${c.cert ? `<span class="tagchip">수료증 발급</span>` : ""}${c.noob ? `<span class="tagchip">비전공자 가능</span>` : ""}</div>
    <p class="price">${esc(priceLabel(c))}</p>${classBtn(c)}</div>`;
}

/* ── GrowthRoadmap (목록용: 상태 배지·연결 강의 칩, 추천 = 1단계) ── */
const LINE_START = 81, LINE_END = 7;
const dotY = (i: number) => LINE_START + ((LINE_END - LINE_START) * i) / 4;
function roadmap(d: any) {
  const steps: any[] = d.steps || [];
  const cols = steps.map((s, i) => {
    const oc = ORDER[i];
    const st = oc ? (oc.status === "개설예정" ? "개설 예정" : oc.status) : "";
    const stCls = oc?.status === "모집중" ? "st-mint" : oc?.status === "마감임박" ? "st-amber" : "st-line";
    const chips = sp(s.chips);
    return `<div class="rcol${i === 0 ? " active recommended" : ""}" data-step="${i}" style="--y:${dotY(i)}%"><div class="rcol-divider"></div><div class="rcol-glow"></div>
      <p class="rtag">추천</p><div class="rdot"></div>
      <div class="rlabel rlabel-${i < 2 ? "top" : "bottom"}"><p class="rl-step">${esc(s.label)}</p><p class="rl-name">${esc(s.name)}</p>
        ${st ? `<span class="rstatus ${stCls}">${esc(st)}</span>` : ""}
        ${chips.length ? `<div class="rextra">${chips.map((c) => `<span class="rextra-chip s${i + 1}">${esc(c)}</span>`).join("")}</div>` : ""}</div></div>`;
  }).join("");
  const cards = steps.map((s, i) => `<div class="rcard-slot${i === 0 ? " show" : ""}"><div class="rcard${i === 0 ? " show" : ""}"><p class="rc-title">${esc(s.card)}</p><p class="rc-meta">${esc(s.meta)}</p><button type="button" class="rc-cta">목록에서 보기</button></div></div>`).join("");
  return `<section class="roadmap-section"><div class="wrap">
    <div class="section-head"><h2>${esc(d.title)}</h2><p>${esc(d.desc)}</p></div>
    <div class="exp-tabs">${(d.tabs || []).map((t: any, i: number) => `<button type="button" class="etab${i === 0 ? " active" : ""}">${esc(t.t)}</button>`).join("")}</div>
    <div class="roadmap"><div class="roadmap-inner"><div class="rgraph">
      <svg class="rgraph-svg" viewBox="0 0 1000 100" preserveAspectRatio="none" aria-hidden="true"><path class="rgraph-line" d="M0,${LINE_START} L1000,${LINE_END}" fill="none" stroke="#c7ccc7" stroke-width="2.4" stroke-linecap="round" vector-effect="non-scaling-stroke"></path></svg>
      <div class="rdot-end" style="left:100%;top:${LINE_END}%"></div>${[0, 25, 50, 75].map((l) => `<div class="rdivider" style="left:${l}%"></div>`).join("")}<div class="rdivider end"></div>
      ${cols}</div><div class="rcards">${cards}</div></div></div>
  </div></section>`;
}

const SELECT_OPTS = ["분류", "분야", "대상", "요일", "수료증", "비전공자"];

export const PV_LIST: PagePreview = {
  root: "site pg-classes",
  before: commonBefore("classes"),
  after: commonAfter,
  sec: {
    pagehead: (d) => `<section class="list-head"><div class="wrap"><h1>${esc(d.title)}</h1><p>${nl(d.desc)}</p>
      <form class="searchrow"><input type="text" readonly placeholder="${esc(d.placeholder)}"><button type="button" class="btn btn-mint">${esc(d.btn)}</button></form></div></section>`,
    roadmap: (d) => roadmap(d),
    filters: (d) => `<section class="filterbar"><div class="wrap">
        <div class="frow"><span class="flabel">상태</span>${(d.status || []).map((t: any, i: number) => `<button type="button" class="tab${i === 0 ? " on" : ""}">${esc(t.t)}</button>`).join("")}</div>
        <div class="frow selectbar"><span class="flabel">필터</span>${(d.selects || []).map((t: any, i: number) => `<select aria-label="${esc(SELECT_OPTS[i] ?? "")}" disabled style="cursor:pointer"><option>${esc(t.t)}</option></select>`).join("")}<button type="button" class="reset-link">${esc(d.reset)}</button></div>
      </div></section>
      <section style="padding:0"><div class="wrap"><div class="viewtoggle"><button type="button" class="vtab active">${esc(d.viewA)}</button><button type="button" class="vtab">${esc(d.viewB)}</button></div>
        <div class="resultmeta">총 <b>${ROWS.filter((c) => c.status !== "종료").length}</b>개 클래스</div>
        <div class="frow" style="padding:6px 0 0;gap:6px;flex-wrap:wrap"><span class="flabel">분류</span>${(d.cats || []).map((t: any) => `<span class="tagchip">${esc(t.t)}</span>`).join("")}</div></div></section>`,
    curriculum: (d) => {
      const cols = ORDER.map((oc) => {
        const linked = OTHERS.filter((r) => r.step === oc.level && r.status !== "종료");
        return `<div class="order-col">${orderCard(oc)}${linked.length ? `<div class="linked-wrap">${linked.map(linkedCard).join("")}</div>` : ""}</div>`;
      }).join("");
      return `<section style="padding:0"><div class="wrap"><div class="order-section"><div class="order-head"><div><h2>${esc(d.title)}</h2><p>${nl(d.desc)}</p></div><a>${esc(d.link)}</a></div>
        <div class="order-track"><div class="order-line"></div><div class="order-row">${cols}</div></div></div></div></section>`;
    },
    rows: (d, all) => {
      const groups = ROW_CATS.map((cat, i) => ({ label: d.list?.[i]?.t ?? cat, items: OTHERS.filter((c) => c.cat === cat && c.status !== "종료") }));
      return `${tag(`'${esc(all.filters?.viewB)}' 화면`)}<section style="padding:0"><div class="wrap">${groups.map((g) =>
        `<div class="row-section"><div class="row-head"><h2>${esc(g.label)}</h2><span>${g.items.length}개</span></div><div class="row-scroll">${g.items.map(rowCard).join("")}</div></div>`).join("")}</div></section>`;
    },
    empty: (d) => `${tag("검색 결과가 없을 때")}<section style="padding:0"><div class="wrap"><div class="empty"><p class="big">${esc(d.big)}</p><p>${nl(d.desc)}</p><button type="button" class="btn btn-mint">${esc(d.btn)}</button></div></div></section>`,
  },
};

/* ── 클래스 상세 (예시: 퍼스널 컬러 진단 교육) ── */
const EX: Row = ROWS.find((c) => c.slug === "personal-color") ?? ROWS[0];
const EXD = getClassDetail(EX);
const EX_INST = { initial: "박", name: "박서연 강사", role: "퍼스널 컬러 전문 · 실무 경력 11년" };
const catLabel = EX.cat === "온라인" ? "온라인 강의" : CATEGORY_LABELS[EX.cat] ?? EX.cat;

function ddayChip(c: Row): { text: string; cls: string } {
  const s = c.status;
  if (s === "온라인상시") return { text: "상시 신청 가능", cls: "mint" };
  if (s === "개설대기") return { text: `개설 대기 · 알림 신청 ${c.applied ?? 0}명`, cls: "line" };
  if (s === "개설예정") return { text: "개설 예정 · 일정이 정해지면 알려드려요", cls: "line" };
  if (s === "종료") return { text: "모집이 종료된 클래스예요", cls: "line" };
  if (s === "마감") return { text: "정원 마감", cls: "red" };
  const remain = (c.capacity ?? 0) - (c.applied ?? 0);
  if (s === "마감임박") return { text: `마감임박 · 정원 ${remain}석 남음`, cls: "amber" };
  return { text: `모집중 · 개강까지 ${ddayLabel(c.date!)}`, cls: "mint" };
}
function topLines(c: Row): [string, string] {
  if (c.type === "online") return ["상시 신청 가능 · 결제 즉시 수강 시작", "온라인 (VOD) · PC · 모바일 모두 가능"];
  const target = c.noob ? "비전공자 가능" : c.target;
  if (!c.date) return [`일정 미정${c.time ? ` · ${c.time}` : ""}`, `${c.place ?? "장소 미정"} · ${target}`];
  return [`${fullDate(c.date)} · ${c.time}`, `${c.place} · ${target}`];
}
function buyRows(c: Row): [string, string][] {
  if (c.type === "online") return [["수강 기간", `결제일로부터 ${c.months}개월`], ["진도", "언제든 이어보기 가능"], ["형태", "VOD + 실습 자료 다운로드"]];
  if (c.type === "upcoming") return [["일정", "개설 예정"], ["과정", `총 ${c.weeks}주`]];
  if (c.type === "waitlist") return [["일정", "미정"], ["장소", c.place ?? "-"], ["알림 신청", `${c.applied}명`]];
  return [["일정", `${fullDate(c.date!)} ${c.time}`], ["장소", c.place ?? "-"], ["대상", c.noob ? `${c.target} (비전공자 가능)` : c.target], ["정원", `${c.capacity}명 중 ${c.applied}명 신청`]];
}
const unit = EX.type === "online" ? `${EX.months}개월 수강` : EX.cat === "정석" ? "/ 전체 과정" : "1인 기준";
const section = (h: string, body: string) => `<div class="section"><h2>${h}</h2>${body}</div>`;

export const PV_DET: PagePreview = {
  root: "site pg-detail",
  before: commonBefore("classes"),
  after: commonAfter,
  /* 실제 페이지: 경로 → [왼쪽: 상단 정보·탭·탭 내용 | 오른쪽: 구매 박스] 2단 그리드 */
  compose: (parts) => {
    const crumb = parts.filter((p) => p.id === "crumb").map((p) => p.html).join("");
    const buy = parts.filter((p) => p.id === "buy").map((p) => p.html).join("");
    const left = parts.filter((p) => p.id !== "crumb" && p.id !== "buy").map((p) => p.html).join("");
    return `${crumb}<div class="wrap detail-grid"><div>${left}</div><div>${buy}</div></div>`;
  },
  sec: {
    crumb: (d) => `<div class="wrap crumbs"><a>${esc(d.root)}</a><span class="sep">/</span><a>${esc(catLabel)}</a><span class="sep">/</span><span class="cur">${esc(EX.name)}</span></div>`,
    tabs: (d) => {
      const [l1, l2] = topLines(EX);
      const hero = EX.images?.thumb && img(EX.images.thumb)
        ? `<div class="hero-img has-photo">${img(EX.images.thumb, EX.name)}</div>`
        : `<div class="hero-img tg ${esc(tileClass(EX))}" aria-hidden="true"><em class="hi-tag">VISUAL ACADEMY</em><span>${esc(EX.name)}</span></div>`;
      const tabs: [string, number | null][] = [[d.info, null], [d.reviews, EXD.reviews.length], [d.qna, EXD.faqs.length], [d.refund, null]];
      return `<div class="top-block">${hero}<div class="top-info"><div class="tags"><span class="badge badge-line">${esc(catLabel)}</span><span class="badge ${badgeClass(EX.status)}">${esc(EX.status === "개설예정" ? "개설 예정" : EX.status)}</span></div>
        <h1 class="dtitle">${esc(EX.name)}</h1>${EX.summary ? `<p class="top-lead">${esc(EX.summary)}</p>` : ""}<p class="top-sum">${esc(l1)}</p><p class="top-sum">${esc(l2)}</p></div></div>
        <div class="tabbar" role="tablist">${tabs.map(([label, cnt], i) => `<button type="button" class="tabbar-btn${i === 0 ? " active" : ""}">${esc(label)}${cnt !== null ? `<span class="cnt"> (${cnt})</span>` : ""}</button>`).join("")}</div>`;
    },
    info: (d) => {
      const photo = EXD.detailImage && img(EXD.detailImage)
        ? `<div class="hero-photo">${img(EXD.detailImage, `${EX.name} 상세 페이지`)}</div>`
        : `<div class="hero-photo hero-photo-ph"><span>${esc(d.ph)}</span><small>곧 자세한 커리큘럼과 사례가 올라올 예정이에요. 궁금한 점은 카카오채널로 문의해 주세요.</small></div>`;
      const shown = EXD.lessons.filter((l) => !l.hidden);
      const hidden = EXD.lessons.length - shown.length;
      return `${photo}${section(esc(d.need), `<ul class="checklist">${EXD.checklist.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>`)}
        ${section(esc(EXD.curriculumTitle), `<div>${shown.map((l, i) => `<div class="lesson"><div class="lnum">${i + 1}</div><div><p class="ltitle">${esc(l.t)}</p><p class="ldesc">${esc(l.d)}</p></div></div>`).join("")}${hidden ? `<button type="button" class="more-btn">전체 ${EXD.lessons.length}개 보기 ▾</button>` : ""}</div>`)}
        ${section(esc(d.instructor), `<div class="instructor"><div class="iavatar">${esc(EX_INST.initial)}</div><div class="itxt"><span class="itag">INSTRUCTOR</span><p class="iname">${esc(EX_INST.name)}</p><p class="irole">${esc(EX_INST.role)}</p></div><a class="ilink">강사 소개 →</a></div>
          <div class="prep-note"><b>${esc(d.prep)}</b>${esc(EXD.prep)}</div>`)}`;
    },
    reviews: (d, all) => `${tag(`탭 : ${esc(all.tabs?.reviews)}`)}${section(esc(d.title), EXD.reviews.map((r) => `<div class="review"><div class="rtop"><span class="rname">${esc(r.name)}</span><span class="rstars">★★★★★</span></div><p>${esc(r.text)}</p></div>`).join(""))}
      ${section(`<span style="font-size:13px;color:var(--ink-3);font-weight:600">구매평이 없을 때</span>`, `<div class="empty-panel"><p>${esc(d.empty)}</p></div>`)}`,
    qna: (d, all) => `${tag(`탭 : ${esc(all.tabs?.qna)}`)}${section(esc(d.title), `<div class="accordion">${EXD.faqs.map((f) => `<div class="acc-item"><button type="button" class="acc-head">${esc(f.q)}<span class="plus">+</span></button><div class="acc-body"><p>${esc(f.a)}</p></div></div>`).join("")}</div>`)}
      ${section(`<span style="font-size:13px;color:var(--ink-3);font-weight:600">질문이 없을 때</span>`, `<div class="empty-panel"><p>${esc(d.empty)}</p><a class="btn btn-ghost">${esc(d.emptyBtn)}</a></div>`)}`,
    refund: (d, all) => `${tag(`탭 : ${esc(all.tabs?.refund)}`)}${section(esc(d.title), `<ul class="refund-list">${refundPolicy(EX).map((l) => `<li>${esc(l)}</li>`).join("")}</ul>`)}`,
    buy: (d) => {
      const chip = ddayChip(EX);
      const cta = EX.type === "online" ? d.applyOnline : EX.type === "waitlist" || EX.type === "upcoming" ? ctaLabel(EX, EX.status) : d.apply;
      return `<div class="buybox"><div class="bb-price-row"><span class="bb-price">${esc(priceLabel(EX))}</span><span class="bb-unit">${esc(unit)}</span></div>
        <span class="bb-dday ${chip.cls}">${esc(chip.text)}</span>
        <dl class="bb-dl">${buyRows(EX).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>
        <a class="btn btn-mint">${esc(cta)}</a><a class="btn btn-ghost">${esc(d.ask)}</a>
        <div class="bb-quote"><b>${esc(d.quote)}</b><br>${esc(EXD.buyboxQuote)}</div>
        <p style="font-size:12px;color:var(--ink-3);margin:12px 0 0;text-align:center">온라인 강의에서는 “${esc(d.applyOnline)}”</p></div>`;
    },
  },
};
