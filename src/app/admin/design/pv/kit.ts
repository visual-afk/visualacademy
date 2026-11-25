/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * 디자인 모드 미리보기 공용 도구.
 * 미리보기는 실제 고객 페이지와 같은 클래스 이름으로 HTML 문자열을 만들고, 편집기 안의 iframe(실제 사이트 CSS를 그대로 복사)에서 그린다.
 * → 실제 페이지 CSS(@media 포함)가 그대로 적용된다. 모든 사용자 입력은 esc()/nl()/rich()로 이스케이프하고, 이미지 주소는 url()로 거른다.
 */

/** 섹션 렌더러 — d: 이 섹션 데이터, all: 페이지 전체 데이터, ctx: 공통(메인 페이지 데이터 등) */
export type R = (d: any, all: any, ctx: PvCtx) => string;

export interface PvCtx {
  /** 메인 페이지 데이터 (상단 메뉴·푸터·강사 목록 공통) — 초안 보기면 초안, 사이트 보기면 게시본 */
  main: any;
  mobile: boolean;
}

export interface PagePreview {
  /** 실제 페이지 루트 클래스 (예: "site pg-home") */
  root: string;
  /** 영역 렌더러 (키 = 영역 id) */
  sec: Record<string, R>;
  /** 영역 앞·뒤에 붙는 고정 부분 (공통 헤더·푸터 등). 클릭 대상이 아니다 */
  before?: (all: any, ctx: PvCtx) => string;
  after?: (all: any, ctx: PvCtx) => string;
  /**
   * 영역 배치 — 기본은 순서대로 이어 붙임. 실제 페이지가 2단 그리드 등으로 영역을 감쌀 때 사용.
   * parts: 이미 클릭 래퍼(.pvs)로 감싼 영역 HTML (order 순서)
   */
  compose?: (parts: { id: string; html: string }[], all: any, ctx: PvCtx) => string;
}

export const esc = (s: unknown) =>
  String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
/** 줄바꿈 → <br> */
export const nl = (s: unknown) => esc(s).replace(/\n/g, "<br>");
/** **굵게** + 줄바꿈 */
export const rich = (s: unknown) => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\n/g, "<br>");
/** 쉼표 문자열 → 배열 */
export const sp = (s: unknown) => String(s || "").split(",").map((x) => x.trim()).filter(Boolean);
/** 줄 단위 → 배열 (빈 줄 제외) */
export const lines = (s: unknown) => String(s || "").split("\n").map((x) => x.trim()).filter(Boolean);

/** 이미지 URL은 data:image / http(s) / 사이트 절대경로만 허용. 따옴표·괄호는 인코딩 */
export const url = (u: unknown) => {
  const s = String(u || "");
  return /^(data:image\/|https?:\/\/|\/(?!\/))/.test(s) ? s.replace(/[()'"\\\s<>]/g, (c) => encodeURIComponent(c)) : "";
};
/** style 속성용 background-image */
export const bg = (u: unknown) => (url(u) ? `background-image:url(${url(u)});` : "");
/** <img> — 주소가 안전하지 않거나 비어 있으면 빈 문자열 */
export const img = (u: unknown, alt = "", cls = "") => (url(u) ? `<img${cls ? ` class="${cls}"` : ""} src="${esc(url(u))}" alt="${esc(alt)}">` : "");

/** 편집기용 작은 안내 띠 (실제 페이지에는 없는 '탭 : ○○' 같은 표시) */
export const tag = (label: string) => `<div class="pv-tag">▸ ${label}</div>`;

/** SVG 아이콘 (실제 컴포넌트와 같은 모양) */
export const ICON_SEARCH = (size = 17, stroke = 2) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`;

/* ── 공통 헤더 · 푸터 (SiteHeader / SiteFooter 마크업) ── */

export type NavKey = "classes" | "online" | "academy" | undefined;
const NAV_KEYS: NavKey[] = ["classes", "online", "academy"];

/** SiteHeader — nav: 메인 페이지 nav 데이터 */
export function siteHeader(nav: any, opts: { active?: NavKey; hero?: boolean; right?: string } = {}) {
  const links = (nav?.links || []).map((l: any, i: number) => `<a class="${opts.active && NAV_KEYS[i] === opts.active ? "on" : ""}">${esc(l.label)}</a>`).join("");
  const util = opts.right ?? `<a class="icon-btn" aria-label="검색">${ICON_SEARCH()}</a><a class="btn btn-ghost nav-login">로그인</a><a class="btn btn-mint">${esc(nav?.cta)}</a>`;
  return `<header class="site-header${opts.hero ? " is-hero" : ""}"><div class="wrap nav"><a class="logo">${esc(nav?.logo)}</a><nav class="navlinks">${links}</nav><div class="navutil">${util}</div></div></header>`;
}

/** SiteFooter — footer: 메인 페이지 footer 데이터 */
export function siteFooter(footer: any, nav: any) {
  if (!footer) return "";
  return `<footer class="site-footer"><div class="wrap">
    <div class="foot-top"><div><div class="logo" style="margin-bottom:12px">${esc(nav?.logo)}</div><p style="font-size:13px;color:var(--ink-3);max-width:280px;margin:0">${esc(footer.desc)}</p></div>
      <div class="foot-links">${(footer.cols || []).map((c: any) => `<div class="foot-col"><h4>${esc(c.h)}</h4>${sp(c.links).map((l) => `<a>${esc(l)}</a>`).join("")}</div>`).join("")}</div></div>
    <div class="foot-bottom"><div class="foot-legal"><a>이용약관</a><a><b>개인정보처리방침</b></a></div>
      <ul class="foot-biz">${(footer.biz || []).filter((b: any) => String(b.v || "").trim()).map((b: any) => `<li><b>${esc(b.k)}</b>${esc(b.v)}</li>`).join("")}</ul>
      <p class="foot-copy">${esc(footer.copy)}</p></div>
  </div></footer>`;
}

/** **굵게** 만 (줄바꿈 없음) */
const bold = (s: unknown) => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");

/** 강사 카드 슬라이더 (src/app/InstructorSlider.tsx 마크업) — 메인 › 강사 소개, 아카데미 소개 › 강사 소개 탭 공용. '전체' 탭 상태 */
export function instructorSlider(data: any) {
  const list: any[] = data?.list || [];
  const tabs = ["전체", ...sp(data?.cats)];
  const count = (c: string) => (c === "전체" ? list.length : list.filter((d) => sp(d.cats).includes(c)).length);
  const card = (d: any) => {
    const career = lines(d.career), career2 = lines(d.career2);
    const has = career.length > 0 || !!String(d.intro || "").trim();
    const body = has
      ? `${career.length ? `<h4>이력</h4><ul class="ins-career">${career.map((c) => `<li>${bold(c)}</li>`).join("")}</ul>` : ""}${
          career2.length ? `<h4>${esc(d.career2Title || "그 외 이력")}</h4><ul class="ins-career">${career2.map((c) => `<li>${bold(c)}</li>`).join("")}</ul>` : ""}${
          String(d.intro || "").trim() ? `<h4>소개 / 인사말</h4><p class="ins-intro">${bold(String(d.intro).replace(/\n/g, " "))}</p>` : ""}`
      : d.link ? "" : `<p class="ins-soon">이력과 소개를 준비하고 있어요.</p>`;
    return `<${d.link ? "a" : "div"} class="instr-card${d.link ? " link" : ""}"><div class="instr-photo">${img(d.img, `${d.name} ${d.role}`)}</div>
      <p class="in">${esc(d.name)}</p><p class="ir">${esc(d.role)}</p>
      <div class="chips">${d.insta ? `<span class="insta"><b>Insta</b> ${esc(d.insta)}</span>` : ""}${sp(d.cats).map((c) => `<span class="cat">${c === "레벨교육" ? "레벨 전문 강사" : esc(c)}</span>`).join("")}${sp(d.tags).map((t) => `<span>${esc(t)}</span>`).join("")}</div>
      <div class="ins-body">${body}${d.link ? `<span class="ins-more">프로필 보기 →</span>` : ""}</div></${d.link ? "a" : "div"}>`;
  };
  return `<div class="ins-tabs" role="tablist">${tabs.map((c, i) => `<button type="button" class="ins-tab${i === 0 ? " on" : ""}">${esc(c)}<em>${count(c)}</em></button>`).join("")}</div>
    <div class="ins-wrap"><button type="button" class="ins-arrow prev" disabled>‹</button><div class="ins-track">${list.map(card).join("")}</div><button type="button" class="ins-arrow next">›</button>
    <div class="ins-bar"><i style="width:40%;left:0%"></i></div></div>`;
}

/**
 * 공통 헤더·푸터를 붙이는 before/after — 메인 페이지 데이터에서 그린다.
 * data-goto 로 클릭하면 메인 페이지 › 해당 영역 편집으로 이동한다.
 */
export const commonBefore = (active?: NavKey) => (_all: any, ctx: PvCtx) =>
  ctx.main?.visible?.nav === false ? "" : `<div class="pv-common" data-goto="main:nav">${siteHeader(ctx.main?.nav, { active })}</div>`;
export const commonAfter = (_all: any, ctx: PvCtx) =>
  ctx.main?.visible?.footer === false ? "" : `<div class="pv-common" data-goto="main:footer">${siteFooter(ctx.main?.footer, ctx.main?.nav)}</div>`;

/**
 * iframe 안에만 들어가는 편집기 표시용 CSS (영역 테두리·이름표·숨김 영역·안내 띠).
 * 실제 페이지 CSS와 섞이지 않도록 pv- / pvs 접두사만 쓴다.
 */
export const FRAME_CSS = `
html{scrollbar-width:thin}
html,body{margin:0;background:#fff}
body{overflow-x:hidden}
a{cursor:pointer}
.pvs{position:relative;cursor:pointer;transition:opacity .2s}
.pv-root.has-active .pvs:not(.act){opacity:.35}
.pv-root.has-active .pvs:not(.act):hover{opacity:.85}
.pvs::after{content:"";position:absolute;inset:0;pointer-events:none;border:3px solid transparent;transition:border-color .15s;z-index:80}
.pvs.act::after{border-color:#6fdcc5}
.pvs:not(.act):hover::after{border-color:#9fe4df;border-style:dashed}
.pvs>.pv-chip{position:absolute;top:10px;right:10px;z-index:120;background:linear-gradient(90deg,#64f7df,#84f6f0);color:#0b4a3f;font:800 12px/1.2 'Pretendard Variable','Pretendard',-apple-system,sans-serif;
  padding:6px 12px;border-radius:100px;display:none;box-shadow:0 4px 12px -4px rgba(10,186,181,.6);white-space:nowrap;pointer-events:none}
.pvs.act>.pv-chip{display:block}
.pvs:not(.act):hover>.pv-chip{display:block;background:#14161a;color:#fff;box-shadow:none}
.pvs>.pv-chip.edit::before{content:"✎ 지금 수정 중 · "}
.pvs>.pv-chip.hov::before{content:"클릭해서 수정 · "}
.pvs.off{background:repeating-linear-gradient(45deg,#fafbfa,#fafbfa 8px,#f3f4f3 8px,#f3f4f3 16px);padding:22px 20px;text-align:center;color:#8b9089;font:700 13px/1.5 'Pretendard Variable','Pretendard',-apple-system,sans-serif}
.pv-common{position:relative;cursor:pointer}
.pv-common:hover::after{content:"메인 페이지에서 수정 →";position:absolute;top:8px;left:50%;transform:translateX(-50%);z-index:120;background:#14161a;color:#fff;font:800 11px/1.2 'Pretendard Variable','Pretendard',-apple-system,sans-serif;padding:5px 11px;border-radius:100px;white-space:nowrap}
.pv-root.viewonly .pvs,.pv-root.viewonly .pv-common{cursor:default}
.pv-root.viewonly .pvs::after,.pv-root.viewonly .pv-chip,.pv-root.viewonly .pv-common::after{display:none!important}
.pv-root.viewonly.has-active .pvs:not(.act){opacity:1}
.pv-tag{margin:0 0 14px;background:#14161a;color:#fff;font:800 12px/1.4 'Pretendard Variable','Pretendard',-apple-system,sans-serif;padding:7px 28px;letter-spacing:.02em}
/* 다시 그릴 때마다 전환 효과가 처음부터 재생되지 않도록 (헤더 색 등) */
.pv-root *:not(.pvs),.pv-root *::before{transition:none!important}
/* 미리보기 높이가 커도 첫 화면이 과하게 늘어나지 않도록 */
.pv-root.site{min-height:0}
.pv-root.pg-home .hero{min-height:min(86vh,760px)}
`;
