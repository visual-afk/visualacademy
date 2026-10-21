/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * 디자인 모드 — 왼쪽 미리보기 축약 렌더러 (프로토타입 PV_* 그대로).
 * 모든 사용자 입력은 esc()/nl()/rich()로 이스케이프한 뒤 HTML 문자열로 만든다.
 */
import type { ContentPageKey } from "@/data/siteContent";

type R = (d: any, all: any) => string;

export const esc = (s: unknown) =>
  String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const nl = (s: unknown) => esc(s).replace(/\n/g, "<br>");
const rich = (s: unknown) => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\n/g, "<br>");
export const sp = (s: unknown) => String(s || "").split(",").map((x) => x.trim()).filter(Boolean);
/** 이미지 URL은 data:/http(s):/절대경로만 허용 */
const url = (u: unknown) => {
  const s = String(u || "");
  return /^(data:image\/|https?:\/\/|\/)/.test(s) ? s.replace(/[()'"\\]/g, (c) => encodeURIComponent(c)) : "";
};
const bg = (u: unknown) => (url(u) ? `background-image:url(${url(u)});` : "");

const tag = (label: string) => `<div style="background:#14161a;color:#fff;font-size:10px;font-weight:800;padding:5px 20px;letter-spacing:.02em">▸ ${label}</div>`;
const tabTag = (all: any, n: number) => tag(`탭 : ${esc(all.tabs.list[n]?.t)}`);
const phImg = (u: unknown, ar: string) =>
  `<div style="aspect-ratio:${ar};border-radius:12px;background:#e4e4e4 center/cover;${url(u) ? bg(u) : "background-image:linear-gradient(135deg,#e3f6f5,#dfe3e0);"}"></div>`;
const mBadge = (t: string, c: string) => `<span style="font-size:9px;font-weight:700;padding:2px 7px;border-radius:99px;background:${c}">${t}</span>`;
const pBtn = (t: unknown, m?: boolean) => `<span class="pill" style="display:inline-block;${m ? "background:#2cc4be;color:#fff;" : "background:#e4e4e4;color:#000;"}">${esc(t)}</span>`;
const pageHead = (d: any) => `<div class="sect" style="padding-bottom:6px"><h1 style="font-size:20px;margin:0 0 4px;letter-spacing:-.02em">${esc(d.title)}</h1><p class="sd" style="margin:0">${esc(d.desc)}</p></div>`;
const tabsLine = (d: any, gap = 14) =>
  `<div style="padding:8px 20px 0"><div style="display:flex;gap:${gap}px;border-bottom:1px solid #e1e4e0;font-size:10.5px;font-weight:700;color:#767676;overflow:hidden;white-space:nowrap">${d.list.map((x: any, i: number) => `<span style="${i === 0 ? "color:#000;border-bottom:2px solid #000;" : ""}padding-bottom:8px">${esc(x.t)}</span>`).join("")}</div></div>`;
const STATUS4 = ["모집중", "마감임박", "개설 예정", "개설 예정"];

const PV_MAIN: Record<string, R> = {
  nav: (d) => `<div class="pv-nav"><span class="lg">${esc(d.logo)}</span>${d.links.map((l: any) => `<span>${esc(l.label)}</span>`).join("")}<span class="cta">${esc(d.cta)}</span></div>`,
  hero: (d) => `<div class="pv-hero"><p class="eb">${esc(d.eyebrow)}</p><h1>${esc(d.title)}</h1>
    <div class="pv-search"><span>${esc(d.placeholder)}</span><b class="pill">검색</b></div>
    <div class="pv-sug">${d.suggest.map((s: any) => `<span>${esc(s.t)}</span>`).join("<span>·</span>")}</div>
    <div class="pv-badges">${d.badges.map((b: any) => `<span>● ${esc(b.t)}</span>`).join("")}</div></div>`,
  roadmap: (d) => `<div class="sect"><h2>${esc(d.title)}</h2><p class="sd">${esc(d.desc)}</p>
    <div class="pv-tabs2">${d.tabs.map((t: any) => `<span>${esc(t.t)}</span>`).join("")}</div>
    <div class="pv-rm">${d.steps.map((s: any, i: number) => `<div class="st"><div class="im" style="${bg(s.img)}"></div><div class="tx"><b>Step 0${i + 1}</b><strong>${esc(s.name)}</strong><em>${nl(s.desc)}</em></div></div>`).join("")}</div>
    <div class="pv-rc">${d.steps.map((s: any) => `<div><b>${esc(s.cls)}</b>${esc(s.meta)}<br>${sp(s.chips).map((c) => `<span class="ch">${esc(c)}</span>`).join("")}</div>`).join("")}</div></div>`,
  recruit: (d) => {
    const all = [
      ["mint", "모집중", "디자이너의 정석 레벨 2", "개강 예정 · 총 10주", "1,200,000원"], ["line", "상시 수강", "월 2000플랜", "영상 강의 · 9개월", "550,000원"],
      ["line", "개설 대기", "손상모 연화 노하우", "일정 미정", "350,000원"], ["mint", "모집중", "디자이너의 정석 레벨 1", "개강 예정 · 총 10주", "1,200,000원"],
      ["mint", "모집중", "퍼스널 컬러 진단 교육", "1일 특강", "500,000원"], ["line", "상시 수강", "오토사장", "영상 강의 · 9개월", "890,000원"],
    ];
    return `<div class="sect alt"><h2>${esc(d.title)}</h2><p class="sd">${esc(d.desc)}</p><div class="pv-cards3">${all.slice(0, +d.count).map((c) => `<div class="pv-cc"><span class="bd ${c[0]}">${c[1]}</span><b>${c[2]}</b><p>${c[3]}</p><p class="pr">${c[4]}</p></div>`).join("")}</div></div>`;
  },
  programs: (d) => `<div class="sect"><h2>${esc(d.title)}</h2><p class="sd">${esc(d.desc)}</p><div class="pv-prog">${d.cards.map((c: any) => `<div><b>${esc(c.title)}</b><p>${esc(c.desc)}</p><a>전체 보기</a></div>`).join("")}</div></div>`,
  online: (d) => `<div class="sect alt"><div class="pv-band" style="background:#fff"><div><b>${esc(d.title)}</b><p>${esc(d.desc)}</p></div><span class="gh">${esc(d.btn)}</span></div></div>`,
  instructors: (d) => `<div class="sect"><h2>${esc(d.title)}</h2><p class="sd">${esc(d.desc)}</p><div class="pv-ins">${d.list.map((i: any) => `<div><div class="ph" style="${bg(i.img)}">${url(i.img) ? "" : "사진"}</div><b>${esc(i.name)}</b><span>${esc(i.role)}</span></div>`).join("")}</div></div>`,
  reviews: (d) => `<div class="sect alt"><h2>${esc(d.title)}</h2><p class="sd">${esc(d.desc)}</p><div class="pv-ts">${d.list.map((r: any) => `<div>"${esc(r.q)}"<span>${esc(r.a)}</span></div>`).join("")}</div></div>`,
  salon: (d) => `<div class="sect"><div class="pv-band"><div><b>${esc(d.title)}</b><p>${esc(d.desc)}</p></div><span class="gh">${esc(d.btn)}</span></div></div>`,
  footer: (d, all) => `<div class="pv-ft"><div class="lg">${esc(all.nav.logo)}</div>${esc(d.desc)}<div class="cols">${d.cols.map((c: any) => `<div><b>${esc(c.h)}</b>${sp(c.links).map((l) => `<span>${esc(l)}</span>`).join("")}</div>`).join("")}</div><div class="biz">${nl(d.biz1)}<br>${nl(d.biz2)}</div></div>`,
};

const PV_LIST: Record<string, R> = {
  pagehead: (d) => `<div class="sect" style="padding-bottom:14px"><h1 style="font-size:20px;margin:0 0 4px;letter-spacing:-.02em">${esc(d.title)}</h1><p class="sd" style="margin-bottom:12px">${nl(d.desc)}</p>
    <div style="display:flex;gap:6px"><div style="flex:1;border:1.5px solid #e1e4e0;border-radius:100px;padding:8px 14px;font-size:11px;color:#8b9089">${esc(d.placeholder)}</div><span class="pill">${esc(d.btn)}</span></div></div>`,
  roadmap: (d) => `<div class="sect alt"><h2>${esc(d.title)}</h2><p class="sd">${esc(d.desc)}</p>
    <div class="pv-tabs2">${d.tabs.map((x: any) => `<span>${esc(x.t)}</span>`).join("")}</div>
    <div class="pv-rm">${d.steps.map((s: any, i: number) => `<div class="st"><div class="tx"><b>${esc(s.label)}</b><strong>${esc(s.name)}</strong><em style="margin-top:4px"><span style="padding:1px 7px;border-radius:100px;display:inline-block;font-size:9px;background:#f5f6f5">${STATUS4[i]}</span></em>${sp(s.chips).map((c) => `<span class="ch">${esc(c)}</span>`).join("")}</div></div>`).join("")}</div>
    <div class="pv-rc">${d.steps.map((s: any) => `<div><b>${esc(s.card)}</b>${esc(s.meta)}</div>`).join("")}</div></div>`,
  filters: (d) => `<div class="sect"><div class="pv-tabs2" style="flex-wrap:wrap">${d.status.map((x: any) => `<span>${esc(x.t)}</span>`).join("")}</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;font-size:10.5px">${d.selects.map((x: any) => `<span style="border:1.5px solid #e1e4e0;border-radius:10px;padding:5px 10px">${esc(x.t)} ▾</span>`).join("")}<span style="padding:5px 4px;text-decoration:underline;color:#767676">${esc(d.reset)}</span></div>
    <div style="margin-top:10px;display:flex;gap:6px;font-size:10.5px;flex-wrap:wrap">${d.cats.map((x: any) => `<span style="background:#f5f6f5;border-radius:100px;padding:3px 9px;color:#5b615a">${esc(x.t)}</span>`).join("")}</div>
    <div class="pv-tabs2" style="margin:12px 0 0"><span>${esc(d.viewA)}</span><span style="background:#fff;color:#000;border-color:#e1e4e0">${esc(d.viewB)}</span></div></div>`,
  curriculum: (d) => `<div class="sect alt"><div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-end;margin-bottom:12px"><div><h2 style="font-size:15px">${esc(d.title)}</h2><p class="sd" style="margin:0">${esc(d.desc)}</p></div><span style="font-size:10.5px;font-weight:700;color:#08706c;white-space:nowrap">${esc(d.link)}</span></div>
    <div class="pv-cards3" style="grid-template-columns:repeat(4,1fr)">${["레벨 1", "레벨 2", "레벨 3", "레벨 4"].map((n, i) => `<div class="pv-cc"><span class="bd ${i < 2 ? "mint" : "line"}">${STATUS4[i]}</span><b>디자이너의 정석 ${n}</b><p>${i < 2 ? "강남 본원" : "일정 미정"}</p></div>`).join("")}</div></div>`,
  rows: (d) => `<div class="sect">${d.list.map((x: any) => `<div style="margin-bottom:14px"><h2 style="font-size:14px;margin-bottom:8px">${esc(x.t)}</h2><div class="pv-cards3"><div class="pv-cc"><span class="bd mint">모집중</span><b>클래스 카드</b><p>일정 · 장소</p></div><div class="pv-cc"><span class="bd line">상시 수강</span><b>클래스 카드</b><p>일정 · 장소</p></div><div class="pv-cc" style="opacity:.5"><b>…</b></div></div></div>`).join("")}</div>`,
  empty: (d) => `<div class="sect alt" style="text-align:center"><b style="display:block;font-size:13px;color:#5b615a;margin-bottom:4px">${esc(d.big)}</b><p class="sd">${esc(d.desc)}</p><span class="pill">${esc(d.btn)}</span></div>`,
};

const PV_DET: Record<string, R> = {
  crumb: (d) => `<div style="padding:10px 20px;font-size:10.5px;color:#767676;border-bottom:1px solid #eceeec">${esc(d.root)} / 단독 특강 / <b style="color:#000">퍼스널 컬러 진단 교육</b></div>`,
  tabs: (d) => `<div class="sect" style="padding:14px 20px 0"><div style="display:flex;align-items:center;gap:10px;margin-bottom:12px"><div style="width:56px;height:56px;border-radius:12px;background:#e3f6f5"></div><div><b style="font-size:13px">퍼스널 컬러 진단 교육</b><br><span style="font-size:10px;color:#767676">토요일 · 강남 본원</span></div></div>
    <div style="display:flex;gap:16px;border-bottom:1px solid #e1e4e0;font-size:11px;font-weight:700;color:#767676"><span style="color:#000;border-bottom:2px solid #000;padding-bottom:8px">${esc(d.info)}</span><span>${esc(d.reviews)} (2)</span><span>${esc(d.qna)} (3)</span><span>${esc(d.refund)}</span></div></div>`,
  info: (d) => `<div class="sect"><div style="aspect-ratio:3/2;border-radius:12px;background:#f5f6f5;display:flex;align-items:center;justify-content:center;color:#8b9089;font-size:10.5px;margin-bottom:16px">${esc(d.ph)}</div>
    <h2 style="font-size:14px">${esc(d.need)}</h2><p class="sd" style="margin-bottom:14px">✓ 고객 얼굴에 맞는 컬러를 감으로만 진단해온 디자이너<br>✓ 퍼스널 컬러 상담을 매출로 연결하고 싶은 디자이너</p>
    <h2 style="font-size:14px">${esc(d.instructor)}</h2><p class="sd" style="margin-bottom:10px">박서연 강사 · 실무 경력 11년</p>
    <div style="background:#f5f6f5;border-radius:12px;padding:10px 12px;font-size:10.5px;color:#5b615a"><b style="display:block;color:#000;margin-bottom:2px">${esc(d.prep)}</b>필기구, 개인 진단 대상(모델) 1인 동반 가능.</div></div>`,
  reviews: (d) => `<div class="sect alt"><h2 style="font-size:14px">${esc(d.title)}</h2><div class="pv-cc" style="margin-bottom:8px"><b>최○○ <span style="color:#ffb300">★★★★★</span></b><p>감으로 하던 진단에 기준이 생겼어요.</p></div><p class="sd" style="font-size:10.5px;margin:0">후기가 없을 때 → “${esc(d.empty)}”</p></div>`,
  qna: (d) => `<div class="sect"><h2 style="font-size:14px">${esc(d.title)}</h2><div class="pv-cc" style="margin-bottom:8px"><b>비전공자도 들을 수 있나요? +</b></div><p class="sd" style="font-size:10.5px;margin:0">질문이 없을 때 → “${esc(d.empty)}” <span class="pill" style="background:#e4e4e4;color:#000;margin-left:4px">${esc(d.emptyBtn)}</span></p></div>`,
  refund: (d) => `<div class="sect alt"><h2 style="font-size:14px">${esc(d.title)}</h2><p class="sd" style="margin:0">· 개강 7일 전까지 전액 환불<br>· 개강 3일 전까지 50% 환불</p></div>`,
  buy: (d) => `<div class="sect"><div style="border:1px solid #e1e4e0;border-radius:18px;padding:16px;box-shadow:0 8px 24px -16px rgba(0,0,0,.2)"><b style="font-size:18px">500,000원</b> <span style="font-size:10.5px;color:#767676">1인 기준</span><br><span style="display:inline-block;padding:2px 8px;border-radius:100px;font-size:10px;background:#fff2c9;color:#8a5a00;margin:6px 0 10px">마감임박 · 정원 1석 남음</span>
    <div class="pill" style="text-align:center;padding:10px;font-size:12px;margin-bottom:6px">${esc(d.apply)}</div><div style="text-align:center;background:#e4e4e4;border-radius:100px;padding:10px;font-size:12px;font-weight:700;margin-bottom:10px">${esc(d.ask)}</div>
    <div style="background:#f5f6f5;border-radius:12px;padding:10px;font-size:10.5px;color:#5b615a"><b style="color:#000">${esc(d.quote)}</b><br>"감으로 하던 진단에 기준이 생겼어요."</div>
    <p class="sd" style="font-size:10px;margin:10px 0 0">온라인 강의 → “${esc(d.applyOnline)}”</p></div></div>`,
};

const PV_ABOUT: Record<string, R> = {
  pagehead: pageHead,
  tabs: (d) => tabsLine(d),
  intro: (d, all) => `${tabTag(all, 0)}<div class="sect"><p style="font-size:9.5px;font-weight:800;letter-spacing:.08em;color:#0aa6a1;margin:0 0 6px">${esc(d.kicker)}</p><h2 style="font-size:17px;margin-bottom:10px">${nl(d.title)}</h2><p style="font-weight:700;margin:0 0 8px">${esc(d.lead)}</p>${d.paras.map((x: any) => `<p class="sd" style="margin:0 0 8px">${rich(x.p)}</p>`).join("")}</div>`,
  introPhoto: (d) => `<div class="sect" style="padding-top:0"><div style="aspect-ratio:16/10;border-radius:16px;background:#cfd8d3 center/cover;${bg(d.img)}display:flex;align-items:flex-end;padding:12px"><span style="color:#fff;font-size:10.5px;font-weight:700;text-shadow:0 1px 6px rgba(0,0,0,.5)">${esc(d.caption)}</span></div></div>`,
  diff: (d) => `<div class="sect alt"><h2 style="font-size:14px"><span style="color:#0aa6a1">Q.</span> ${esc(d.q)}</h2><div class="pv-cards3">${d.list.map((x: any) => `<div>${phImg(x.img, "4/5")}<p style="margin:6px 0 0;font-size:10px;color:#5b615a"><b style="display:block;color:#000;font-size:10.5px">${esc(x.b)}</b>${esc(x.d)}</p></div>`).join("")}</div></div>`,
  price: (d) => `<div class="sect"><div style="display:grid;grid-template-columns:1.2fr 1fr;gap:12px;align-items:center"><div><p style="font-size:10px;font-weight:800;color:#0aa6a1;margin:0 0 4px">${esc(d.q)}</p><h3 style="font-size:14px;margin:0 0 6px">${nl(d.title)}</h3><p class="sd" style="font-size:10.5px;margin:0">${rich(d.text)}</p></div>${phImg(d.img, "4/3")}</div></div>`,
  facility: (d) => `<div class="sect alt"><h2 style="font-size:14px">${esc(d.title)}</h2><div class="pv-ins" style="grid-template-columns:repeat(3,1fr)">${d.list.map((x: any) => `<div style="text-align:left">${phImg(x.img, "1/1")}<b style="display:block;font-size:10px;margin-top:4px">${esc(x.b)}</b><span style="font-size:9.5px">${esc(x.d)}</span></div>`).join("")}</div></div>`,
  ifbs: (d) => `<div class="sect"><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">${phImg(d.img, "4/3")}<div><p style="font-size:10px;font-weight:800;color:#0aa6a1;margin:0 0 4px">${esc(d.tag)}</p><h3 style="font-size:13px;margin:0 0 6px">${nl(d.title)}</h3>${d.paras.map((x: any) => `<p class="sd" style="font-size:10px;margin:0 0 5px">${rich(x.p)}</p>`).join("")}</div></div></div>`,
  welcome: (d) => `<div class="sect alt"><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px"><div><p style="font-size:10px;font-weight:800;color:#0aa6a1;margin:0 0 4px">${esc(d.tag)}</p><h3 style="font-size:13px;margin:0 0 6px">${esc(d.title)}</h3>${d.paras.map((x: any) => `<p class="sd" style="font-size:10px;margin:0 0 5px">${rich(x.p)}</p>`).join("")}</div>${phImg(d.img, "4/3")}</div></div>`,
  stats: (d) => `<div class="sect" style="background:#14161a;color:#fff"><h3 style="font-size:14px;margin:0 0 12px;color:#fff">${esc(d.title)}</h3><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:16px">${d.list.map((x: any) => `<div style="background:#1f2328;border-radius:12px;padding:10px"><b style="font-size:15px;display:block;color:#3cc8c2">${esc(x.n)}</b><span style="font-size:9.5px;color:#a7ada4">${esc(x.l)}</span></div>`).join("")}</div><h3 style="font-size:12px;margin:0 0 8px;color:#fff">${esc(d.salon)}</h3><div style="display:flex;flex-wrap:wrap;gap:5px">${sp(d.branches).map((b) => `<span style="border:1px solid #3c4147;border-radius:100px;padding:3px 9px;font-size:9.5px;color:#d5d9d2">${esc(b)}</span>`).join("")}</div></div>`,
  quote: (d) => `<div class="sect" style="background:linear-gradient(0deg,rgba(20,22,26,.78),rgba(20,22,26,.78)),#7a8580;color:#fff;text-align:center">${d.paras.map((x: any) => `<p style="font-size:11px;line-height:1.7;margin:0 0 10px">${rich(x.p)}</p>`).join("")}</div>`,
  history: (d) => `<div class="sect"><h2 style="font-size:14px">${esc(d.title)}</h2>${d.list.map((x: any) => `<div style="display:flex;gap:12px;padding:8px 0;border-top:1px solid #eceeec;font-size:10.5px"><b style="color:#0aa6a1;min-width:34px">${esc(x.y)}</b><span>${esc(x.d)}</span></div>`).join("")}</div>`,
  inst: (d, all) => `${tabTag(all, 1)}<div class="sect"><h2 style="font-size:14px">${esc(d.title)}</h2>${d.list.map((x: any) => `<div style="display:flex;gap:10px;padding:10px;background:#f5f6f5;border-radius:14px;margin-bottom:8px"><div style="width:34px;height:34px;border-radius:50%;background:#e3f6f5;color:#08706c;display:flex;align-items:center;justify-content:center;font-weight:800;flex-shrink:0">${esc(String(x.name || "").charAt(0))}</div><div><b style="font-size:11.5px">${esc(x.name)}</b><div style="font-size:9.5px;color:#0aa6a1;font-weight:700">${esc(x.role)}</div><p style="margin:3px 0 0;font-size:10px;color:#5b615a">${esc(x.desc)}</p></div></div>`).join("")}</div>`,
  gallery: (d, all) => `${tabTag(all, 2)}<div class="sect"><h2 style="font-size:14px">${esc(d.title)}</h2><div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px">${d.list.map((x: any) => `<div style="aspect-ratio:4/5;border-radius:14px;background:#cfd8d3 center/cover;${bg(x.img)}display:flex;align-items:flex-end;padding:8px"><span style="color:#fff;font-size:10px;font-weight:700;text-shadow:0 1px 6px rgba(0,0,0,.6)">${esc(x.c)}</span></div>`).join("")}</div></div>`,
  way: (d, all) => `${tabTag(all, 3)}<div class="sect"><h2 style="font-size:14px">${esc(d.title)}</h2><div style="aspect-ratio:16/7;border-radius:14px;background:#f5f6f5;display:flex;align-items:center;justify-content:center;font-size:10px;color:#8b9089;margin-bottom:10px;text-align:center;padding:0 10px">${esc(d.mapNote)}</div>
    ${[["주소", rich(d.addr)], ["전화", esc(d.tel)], ["운영 시간", esc(d.hours)]].map((r) => `<div style="display:flex;gap:12px;padding:7px 0;border-top:1px solid #eceeec;font-size:10.5px"><b style="min-width:52px;color:#767676">${r[0]}</b><span>${r[1]}</span></div>`).join("")}</div>`,
  partner: (d, all) => `${tabTag(all, 4)}<div class="sect"><h2 style="font-size:14px">${esc(d.title)}</h2><p class="sd">${esc(d.lead)}</p>
    ${["담당자명", "매장명 / 소속", "연락처"].map((l) => `<div style="margin-bottom:8px"><div style="font-size:9.5px;font-weight:700;color:#767676;margin-bottom:3px">${l}</div><div style="border:1.5px solid #e1e4e0;border-radius:10px;height:26px"></div></div>`).join("")}
    <div style="margin-bottom:8px"><div style="font-size:9.5px;font-weight:700;color:#767676;margin-bottom:3px">문의 유형</div><div style="border:1.5px solid #e1e4e0;border-radius:10px;padding:6px 10px;font-size:10px;color:#5b615a">${d.types.map((x: any) => esc(x.t)).join(" · ")}</div></div>
    <span class="pill" style="display:inline-block;margin-top:4px">${esc(d.btn)}</span></div>`,
};

const PV_GUIDE: Record<string, R> = {
  pagehead: pageHead,
  tabs: (d) => tabsLine(d),
  proc: (d, all) => `${tabTag(all, 0)}<div class="sect"><h2 style="font-size:14px;margin-bottom:12px">${esc(d.title)}</h2>${d.steps.map((s: any, i: number) => `<div style="display:flex;gap:10px;margin-bottom:12px"><div style="width:22px;height:22px;border-radius:50%;background:#14161a;color:#fff;font-size:10.5px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0">${i + 1}</div><div><b style="font-size:11.5px">${esc(s.t)}</b><p style="margin:2px 0 0;font-size:10.5px;color:#5b615a">${esc(s.d)}</p>${String(s.notes || "").split("\n").filter((x) => x.trim()).map((n) => { const a = n.split("|"); return `<div style="margin-top:5px;background:#f5f6f5;border-radius:8px;padding:5px 9px;font-size:10px;color:#5b615a">${a.length > 1 ? `<b style="color:#000">${esc(a[0].trim())}</b>&nbsp;${esc(a.slice(1).join("|").trim())}` : esc(n)}</div>`; }).join("")}</div></div>`).join("")}</div>`,
  faq: (d, all) => `${tabTag(all, 1)}<div class="sect alt">${d.groups.map((g: any) => `<h3 style="font-size:12px;margin:0 0 6px">${esc(g.g)}</h3><div style="margin-bottom:12px">${g.items.map((it: any) => `<div style="background:#fff;border:1px solid #e1e4e0;border-radius:10px;padding:8px 10px;margin-bottom:5px;font-size:10.5px;font-weight:700;display:flex;justify-content:space-between"><span>${esc(it.q)}</span><span style="color:#8b9089">+</span></div>`).join("")}</div>`).join("")}</div>`,
  refund: (d, all) => `${tabTag(all, 2)}<div class="sect"><h2 style="font-size:14px">${esc(d.title)}</h2><table style="width:100%;border-collapse:collapse;font-size:10px"><tr style="background:#f5f6f5">${d.th.map((h: any) => `<th style="text-align:left;padding:6px 8px">${esc(h.t)}</th>`).join("")}</tr>
    ${d.cats.map((c: any) => c.rows.map((r: any, i: number) => `<tr style="border-top:1px solid #eceeec">${i === 0 ? `<td rowspan="${c.rows.length}" style="padding:6px 8px;font-weight:700;vertical-align:top">${esc(c.name)}${c.sub ? `<br><span style="font-weight:400;color:#8b9089">${esc(c.sub)}</span>` : ""}</td>` : ""}<td style="padding:6px 8px">${esc(r.c)}</td><td style="padding:6px 8px;font-weight:700;color:#08706c">${esc(r.r)}</td></tr>`).join("")).join("")}</table>
    <div style="margin-top:12px;background:#f5f6f5;border-radius:12px;padding:10px 12px;font-size:10px;color:#767676;line-height:1.7"><b style="display:block;color:#5b615a;margin-bottom:2px">${esc(d.noteTitle)}</b>${nl(d.note)}</div></div>`,
};

const PV_MY: Record<string, R> = {
  pagehead: pageHead,
  profile: (d) => `<div style="padding:6px 20px"><div style="border:1px solid #e1e4e0;border-radius:14px;padding:12px;display:flex;align-items:center;gap:10px"><div style="width:36px;height:36px;border-radius:50%;background:#14161a;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800">김</div><div style="flex:1"><b style="font-size:12px">김민지 님</b> ${mBadge(esc(d.badge), "#d6f3f1")}<div style="font-size:10px;color:#767676;margin-top:2px">minji@example.com · 010-1234-5678</div></div><span class="pill">${esc(d.edit)}</span></div></div>`,
  tabs: (d) => tabsLine(d, 12),
  apply: (d, all) => `${tabTag(all, 0)}<div class="sect"><h2 style="font-size:14px;margin-bottom:10px">${esc(d.title)}</h2>${[["퍼스널 컬러 진단 교육", "수강 확정", "#d6f3f1"], ["창업·경영 컨설팅", "입금 대기", "#fff0cc"]].map((r) => `<div style="border:1px solid #e1e4e0;border-radius:12px;padding:10px;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center;font-size:11px"><b>${r[0]}</b>${mBadge(r[1], r[2])}</div>`).join("")}<div style="font-size:9.5px;color:#8b9089">※ 예시 카드 · 실제로는 회원의 신청 내역이 표시돼요</div></div>`,
  pay: (d, all) => `${tabTag(all, 1)}<div class="sect"><h2 style="font-size:14px;margin-bottom:10px">${esc(d.title)}</h2><table style="width:100%;border-collapse:collapse;font-size:9.5px"><tr style="background:#f5f6f5">${d.th.map((h: any) => `<th style="text-align:left;padding:5px 4px">${esc(h.t)}</th>`).join("")}</tr><tr style="border-top:1px solid #eceeec"><td style="padding:5px 4px">2026.10.01</td><td>퍼스널 컬러…</td><td>신용카드</td><td>${mBadge("결제완료", "#d6f3f1")}</td><td>500,000원</td><td style="text-decoration:underline">${esc(d.receipt)}</td></tr></table></div>`,
  online: (d, all) => `${tabTag(all, 2)}<div class="sect"><h2 style="font-size:14px;margin-bottom:10px">${esc(d.title)}</h2>${[[d.btn1, "월 2000플랜 (온라인)", "2027.06.20", 50], [d.btn2, "기초 모발 과학 (온라인)", "2026.12.02", 100]].map((r) => `<div style="border:1px solid #e1e4e0;border-radius:12px;padding:10px;margin-bottom:6px;font-size:11px"><b>${r[1]}</b><div style="height:5px;background:#eceeec;border-radius:9px;margin:7px 0"><div style="width:${r[3]}%;height:5px;background:#2cc4be;border-radius:9px"></div></div><div style="display:flex;justify-content:space-between;font-size:10px;color:#767676"><span>${esc(d.exp1)} ${r[2]}${esc(d.exp2)}</span><span class="pill">${esc(r[0])}</span></div></div>`).join("")}</div>`,
  info: (d, all) => `${tabTag(all, 3)}<div class="sect"><h2 style="font-size:14px;margin-bottom:10px">${esc(d.title)}</h2>${[[d.l1, "김민지"], [d.l2, "minji@example.com"], [d.l3, "010-1234-5678"], [d.l4, "새 비밀번호"], [d.l5, "새 비밀번호 확인"]].map((r) => `<div style="margin-bottom:7px"><div style="font-size:9.5px;font-weight:700;color:#767676;margin-bottom:3px">${esc(r[0])}</div><div style="border:1.5px solid #e1e4e0;border-radius:10px;padding:6px 10px;font-size:10px;color:#5b615a">${r[1]}</div></div>`).join("")}<span class="pill" style="display:inline-block;margin-top:4px">${esc(d.save)}</span><div style="margin-top:12px;font-size:10px;color:#c0392b;text-decoration:underline">${esc(d.out)}</div></div>`,
};

const PV_PAY: Record<string, R> = {
  flow: (d) => `<div style="padding:12px 20px"><div style="display:flex;align-items:center;gap:6px;font-size:10px;font-weight:700">${d.list.map((x: any, i: number) => `<span style="display:flex;align-items:center;gap:4px;${i === 1 ? "color:#000" : "color:#8b9089"}"><span style="width:16px;height:16px;border-radius:50%;background:${i === 0 ? "#2cc4be" : i === 1 ? "#14161a" : "#eceeec"};color:${i < 2 ? "#fff" : "#767676"};display:inline-flex;align-items:center;justify-content:center;font-size:9px">${i === 0 ? "✓" : i + 1}</span>${esc(x.t)}</span>${i < 3 ? '<span style="flex:1;height:1px;background:#e1e4e0"></span>' : ""}`).join("")}</div></div>`,
  form: (d) => `${tag("화면 : 신청 정보")}<div class="sect"><h3 style="font-size:12.5px;margin:0 0 8px">${esc(d.title)}</h3>${d.labels.map((l: any) => `<div style="margin-bottom:6px"><div style="font-size:9.5px;font-weight:700;color:#767676;margin-bottom:3px">${esc(l.t)}</div><div style="border:1.5px solid #e1e4e0;border-radius:10px;height:24px"></div></div>`).join("")}
    <h3 style="font-size:12.5px;margin:12px 0 6px">${esc(d.checkTitle)}</h3>${d.checks.map((c: any) => `<div style="display:flex;gap:7px;align-items:center;font-size:10.5px;margin-bottom:5px"><span style="width:13px;height:13px;border:1.5px solid #c9ccc8;border-radius:4px"></span>${esc(c.t)}</div>`).join("")}
    <div style="margin-top:10px;border:1px solid #e1e4e0;border-radius:12px;padding:10px;font-size:10.5px"><b>퍼스널 컬러 진단 교육</b><div style="display:flex;justify-content:space-between;margin:8px 0;color:#767676"><span>${esc(d.totalLabel)}</span><b style="color:#000">500,000원</b></div>${pBtn(d.btn, true)}</div></div>`,
  method: (d) => `${tag("화면 : 결제 수단")}<div class="sect"><h3 style="font-size:12.5px;margin:0 0 8px">${esc(d.title)}</h3><div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">${d.list.map((m: any, i: number) => `<div style="border:1.5px solid ${i === 0 ? "#2cc4be" : "#e1e4e0"};border-radius:10px;padding:7px 9px;font-size:10px"><b>${esc(m.t)}</b><div style="color:#8b9089;font-size:9px;margin-top:2px">${esc(m.s)}</div></div>`).join("")}</div>
    <div style="display:flex;justify-content:space-between;margin:10px 0 6px;font-size:10.5px;color:#767676"><span>${esc(d.totalLabel)}</span><b style="color:#000">500,000원</b></div>${pBtn("500,000원 " + d.btnSuffix, true)}
    <div style="margin-top:10px;text-align:center;background:#f5f6f5;border-radius:12px;padding:10px;font-size:10px"><b style="display:block;font-size:11px">${esc(d.wait)}</b><span style="color:#767676">${esc(d.waitSub)}</span></div></div>`,
  fail: (d) => `${tag("화면 : 결제 실패")}<div class="sect" style="text-align:center"><div style="width:30px;height:30px;border-radius:50%;background:#fde4e1;color:#c0392b;margin:0 auto 6px;display:flex;align-items:center;justify-content:center;font-weight:800">✕</div><b style="font-size:13px">${esc(d.title)}</b><p style="font-size:10.5px;color:#767676;margin:4px 0 8px">${esc(d.desc)}</p><div style="background:#f5f6f5;border-radius:10px;padding:8px;font-size:10px;color:#5b615a;text-align:left">${nl(d.box)}</div><div style="margin:10px 0 6px;display:flex;gap:6px;justify-content:center">${pBtn(d.btn1, true)}${pBtn(d.btn2)}</div><div style="font-size:9.5px;color:#8b9089">${esc(d.note)}</div></div>`,
  done: (d) => `${tag("화면 : 신청 완료")}<div class="sect" style="text-align:center"><div style="width:30px;height:30px;border-radius:50%;background:#d6f3f1;color:#08706c;margin:0 auto 6px;display:flex;align-items:center;justify-content:center;font-weight:800">✓</div><b style="font-size:13px">${esc(d.ok)}</b><div style="font-size:9.5px;color:#8b9089;margin:3px 0 8px">(입금 대기 시: ${esc(d.pending)} · ${esc(d.pendingBox)})</div>
    <div style="background:#f5f6f5;border-radius:12px;padding:10px;text-align:left;font-size:10px;color:#5b615a;line-height:1.7"><b style="color:#000;display:block;margin-bottom:2px">${esc(d.guideTitle)}</b><span style="color:#8b9089">오프라인</span>${String(d.offline).split("\n").filter((x) => x.trim()).map((x) => `<div>· ${esc(x)}</div>`).join("")}<span style="color:#8b9089;display:block;margin-top:5px">온라인</span>${String(d.online).split("\n").filter((x) => x.trim()).map((x) => `<div>· ${esc(x)}</div>`).join("")}</div>
    <div style="margin-top:10px;display:flex;gap:6px;justify-content:center;flex-wrap:wrap">${pBtn(d.btnMy, true)}${pBtn(d.btnWatch, true)}${pBtn(d.btnList)}</div></div>`,
};

export const PREVIEWS: Record<ContentPageKey, Record<string, R>> = {
  main: PV_MAIN, list: PV_LIST, detail: PV_DET, about: PV_ABOUT, guide: PV_GUIDE, my: PV_MY, pay: PV_PAY,
};
