import Link from "next/link";
import { connection } from "next/server";
import GrowthRoadmap, { type RoadmapColumn } from "@/components/site/GrowthRoadmap";
import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";
import { ROUTES } from "@/data/site";
import { getMainContent, type MainContent } from "@/data/siteContent";
import { getClasses } from "@/lib/api";
import { dday, ddayLabel, priceLabel, shortDate } from "@/lib/format";
import { badgeClass, CATEGORY_LABELS, computeStatus } from "@/lib/status";
import type { AcademyClass, ClassStatus } from "@/lib/types";
import HeroSearch from "./HeroSearch";
import InstructorSlider from "./InstructorSlider";

/** 프로그램 카드 아이콘 (01 정석 · 02 특강 · 03 경영) */
const PROG_ICONS = [
  ["M4 20V10M10 20V4M16 20v-8M22 20H2"],
  ["M13 2 4 14h7l-1 8 9-12h-7z"],
  ["M3 9l9-5 9 5-9 5z", "M7 11.5V16c0 1.5 2.2 3 5 3s5-1.5 5-3v-4.5"],
];

/*
 * 메인 페이지 — 영역 순서·노출과 모든 문구는 디자인 모드(페이지 관리 › 메인 페이지) 콘텐츠를 따른다.
 * 모집중 카드의 일정·정원·수강료는 클래스 데이터에서 자동으로 만든다.
 */

const STEP_LAYOUT = [
  { labelPos: "top" },
  { labelPos: "top" },
  { labelPos: "bottom" },
  { labelPos: "bottom" },
] as const;
/** 히어로 배경 물결 — a(원래 모양) ↔ b(일렁인 모양). 두 경로는 명령 구성이 같아야 부드럽게 변형된다.
 *  b는 가운데 이음점 양쪽 제어점을 한 직선 위에 두어 꺾이지 않게 했다 */
const HERO_WAVES = [
  { a: "M-40,120 C260,40 420,260 720,140 C980,40 1160,180 1260,80", b: "M-40,150 C260,90 420,210 720,170 C980,135 1160,120 1260,110", dur: "11s", opacity: 0.35 },
  { a: "M-60,620 C240,720 460,540 760,660 C1000,750 1180,600 1280,680", b: "M-60,650 C240,680 460,600 760,630 C1000,654 1180,660 1280,650", dur: "14s", opacity: 0.28 },
  { a: "M-40,380 C300,300 560,460 820,360 C1020,290 1180,380 1260,340", b: "M-40,350 C300,410 560,420 820,390 C1020,367 1180,320 1260,370", dur: "9s", opacity: 0.2 },
];

const LEVEL_SLUGS = ["designer-level-1", "designer-level-2", "designer-level-3", "designer-level-4"];

const lines = (s: string) => s.split("\n").flatMap((l, i) => (i ? [<br key={i} />, l] : [l]));
const split = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

function roadmapColumns(c: MainContent["roadmap"]): RoadmapColumn[] {
  return c.steps.map((s, i) => ({
    ...STEP_LAYOUT[i],
    title: `Step 0${i + 1}`,
    name: s.name,
    img: s.img || undefined,
    desc: lines(s.desc),
    card: { stepLabel: `Step 0${i + 1}`, name: s.cls, meta: s.meta, chips: split(s.chips), cta: "신청하기", href: ROUTES.classDetail(LEVEL_SLUGS[i]) },
  }));
}

/** 노출 규칙: 마감 임박 순 / 개강일 빠른 순 / 클래스 관리 순서 */
function pickRecruit(all: AcademyClass[], rule: string, count: number) {
  const rows = all
    .map((c) => ({ ...c, status: computeStatus(c) }))
    .filter((c) => !["종료", "마감", "개설예정"].includes(c.status));
  const urgency = (c: AcademyClass & { status: ClassStatus }) =>
    c.status === "마감임박" ? 0 : c.date ? 1 : c.type === "online" ? 2 : 3;
  if (rule === "imminent") rows.sort((a, b) => urgency(a) - urgency(b) || (a.date && b.date ? dday(a.date) - dday(b.date) : 0));
  if (rule === "start") rows.sort((a, b) => (a.date ? dday(a.date) : 9999) - (b.date ? dday(b.date) : 9999));
  return rows.slice(0, count);
}

/** 모집중 카드 — 상단(배지·D-day) · 일정/장소 · 모집 현황 바 · 가격. 모든 값은 클래스 데이터에서 계산 */
function RecruitCard({ c, hot }: { c: AcademyClass & { status: ClassStatus }; hot: boolean }) {
  const online = c.type === "online";
  const wait = c.type === "waitlist";
  const badge = online ? "상시 수강" : wait ? "개설 대기" : c.status;
  const applied = c.applied ?? 0;
  const info: [string, string][] = online
    ? [["구성", `영상 강의 · 수강 기간 ${c.months}개월`], ["시작", "결제 후 바로 시작 가능"]]
    : wait
      ? [["일정", "인원이 차면 일정 안내"], ["구성", `${CATEGORY_LABELS[c.cat] ?? c.cat} · ${c.weeks ? `${c.weeks}주 과정` : "1일 과정"}`]]
      : [["일정", `${shortDate(c.date!)} 개강${c.weeks ? ` · 총 ${c.weeks}주` : ""}`], ["장소", `${c.place} · ${c.day}요일${c.weeks ? "반" : ""}`]];
  const seat = online
    ? { label: "모집 현황", value: <>인원 제한 없음</>, pct: 100, dim: true }
    : wait
      ? { label: "개설 기준", value: <><b>{applied}명</b> / 개설 기준 {c.goal ?? applied}명</>, pct: c.goal ? Math.min(100, (applied / c.goal) * 100) : 0, dim: false }
      : { label: "모집 현황", value: <><b>잔여 {Math.max(0, (c.capacity ?? 0) - applied)}석</b> / {c.capacity}석</>, pct: c.capacity ? Math.min(100, (applied / c.capacity) * 100) : 0, dim: false };
  return (
    <div className={`class-card${hot ? " hot" : ""}`}>
      <div className="cc-top">
        <span className={`badge ${online || wait ? "badge-line" : badgeClass(c.status)}`}>{badge}</span>
        {online ? (
          <span className="dday mute">온라인</span>
        ) : wait ? (
          <span className="dday mute">{applied}명 대기 중</span>
        ) : (
          <span className="dday">개강 {ddayLabel(c.date!)}</span>
        )}
      </div>
      <h3><Link href={ROUTES.classDetail(c.slug)}>{c.name}</Link></h3>
      <ul className="cc-info">
        {info.map(([k, v]) => <li key={k}><b>{k}</b><span>{v}</span></li>)}
      </ul>
      <div className="seat">
        <div className="seat-top"><span>{seat.label}</span><span>{seat.value}</span></div>
        <div className="seat-bar"><i style={{ width: `${seat.pct}%`, opacity: seat.dim ? 0.35 : undefined }} /></div>
      </div>
      <p className="price">
        {priceLabel(c)}
        {!!c.price && <small>{c.taxType === "exempt" ? "면세" : "VAT 포함"}</small>}
      </p>
      {wait ? (
        <Link className="btn btn-ghost" href={ROUTES.classDetail(c.slug)}>개설 알림 신청</Link>
      ) : (
        <Link className={`btn ${online ? "btn-ghost" : "btn-mint"}`} href={ROUTES.checkout(c.slug)}>{online ? "바로 수강 신청" : "신청하기"}</Link>
      )}
    </div>
  );
}

export default async function HomePage() {
  await connection();
  const C = getMainContent();
  const classes = await getClasses();

  const sections: Record<string, () => React.ReactNode> = {
    hero: () => (
      <section key="hero" className="hero" id="heroSection">
        {/* 같은 문구 2개를 이어 붙여 왼쪽으로 천천히 흘린다 — 절반만큼 이동하면 처음과 똑같아져 끊김 없이 반복 */}
        <div className="hero-bigtext" aria-hidden>
          <div className="hero-bigtext-track">
            <span>VISUAL ACADEMY</span>
            <span>VISUAL ACADEMY</span>
          </div>
        </div>
        <svg className="hero-strands" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" aria-hidden>
          {/* 물결 모션: 곡선 모양이 두 형태 사이를 천천히 오가며 일렁인다 (선마다 속도를 달리해 엇갈리게) */}
          {HERO_WAVES.map((w, i) => (
            <path key={i} className={`hero-wave hero-wave-${i + 1}`} d={w.a} stroke="#5fd0ca" strokeWidth="1" fill="none" opacity={w.opacity}>
              <animate
                attributeName="d"
                values={`${w.a};${w.b};${w.a}`}
                dur={w.dur}
                repeatCount="indefinite"
                calcMode="spline"
                keyTimes="0;0.5;1"
                keySplines="0.45 0 0.55 1;0.45 0 0.55 1"
              />
            </path>
          ))}
        </svg>
        {C.hero.badges[0] && <div className="hero-badge badge-tl"><span className="dot" />{C.hero.badges[0].t}</div>}
        {C.hero.badges[1] && <div className="hero-badge badge-br"><span className="dot" />{C.hero.badges[1].t}</div>}
        <div className="hero-inner">
          <p className="hero-eyebrow">{C.hero.eyebrow}</p>
          <h1>{C.hero.title}</h1>
          <HeroSearch placeholder={C.hero.placeholder} suggestions={C.hero.suggest.map((s) => s.t)} />
        </div>
      </section>
    ),
    roadmap: () => (
      <section key="roadmap" id="diagnosis" className="roadmap-section">
        <div className="wrap">
          <GrowthRoadmap title={C.roadmap.title} description={C.roadmap.desc} tabs={C.roadmap.tabs.map((t) => t.t)} columns={roadmapColumns(C.roadmap)} />
        </div>
      </section>
    ),
    recruit: () => (
      <section key="recruit" className="bg-surface" id="program">
        <div className="wrap">
          <div className="section-head"><h2>{C.recruit.title}</h2><p>{C.recruit.desc}</p></div>
          <div className="cards3">
            {pickRecruit(classes, C.recruit.rule, Number(C.recruit.count) || 3).map((c, i) => <RecruitCard key={c.id} c={c} hot={i === 0} />)}
          </div>
        </div>
      </section>
    ),
    programs: () => (
      <section key="programs" id="academy">
        <div className="wrap">
          <div className="section-head"><h2>{C.programs.title}</h2><p>{C.programs.desc}</p></div>
          <div className="prog3">
            {C.programs.cards.map((p, i) => (
              <div key={p.title} className="prog-card">
                <span className="prog-no">{String(i + 1).padStart(2, "0")}</span>
                <div className="prog-ic">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    {(PROG_ICONS[i % PROG_ICONS.length]).map((d) => <path key={d} d={d} />)}
                  </svg>
                </div>
                <h3>{p.title}</h3>
                <p>{p.desc}</p>
                <div className="chips">{split(p.chips).map((t) => <span key={t}>{t}</span>)}</div>
                <Link href={p.link ? ROUTES.classList(p.link) : ROUTES.classes}>전체 보기</Link>
              </div>
            ))}
          </div>
        </div>
      </section>
    ),
    online: () => (
      <section key="online" className="bg-surface tight" id="online">
        <div className="wrap">
          <div className="online-banner">
            <div>
              {C.online.tag && <div className="ob-tag"><i />{C.online.tag}</div>}
              <h3>{C.online.title}</h3>
              <p>{C.online.desc}</p>
              <div className="ob-feat">{split(C.online.feats).map((t) => <span key={t}>{t}</span>)}</div>
            </div>
            <div className="ob-cta">
              <Link className="btn btn-mint" href={ROUTES.classList("온라인")}>{C.online.btn}</Link>
              {C.online.price && <small>{C.online.priceName} <b>{C.online.price}</b></small>}
            </div>
          </div>
        </div>
      </section>
    ),
    instructors: () => (
      <section key="instructors">
        <div className="wrap">
          <div className="section-head"><h2>{C.instructors.title}</h2><p>{C.instructors.desc}</p></div>
          <InstructorSlider data={C.instructors} />
        </div>
      </section>
    ),
    reviews: () => (
      <section key="reviews" className="bg-surface" id="reviews">
        <div className="wrap">
          <div className="section-head"><h2>{C.reviews.title}</h2><p>{C.reviews.desc}</p></div>
          <div className="testi-grid">
            {C.reviews.list.map((r, i) => (
              <div key={i} className="testi-card">
                <div className="qm" aria-hidden>&ldquo;</div>
                {r.course && <span className="tcourse">{r.course}</span>}
                <p className="tq">{r.q}</p>
                <div className="testi-who">
                  <div className="testi-av" aria-hidden>{r.a.slice(0, 1)}</div>
                  <div><b>{r.a}</b><span>{r.sub}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    ),
    salon: () => (
      <section key="salon" className="tight">
        <div className="wrap">
          <div className="salon-band">
            <div>
              {C.salon.tag && <div className="sb-tag">{C.salon.tag}</div>}
              <h3>{C.salon.title}</h3>
              <p>{C.salon.desc}</p>
              <div className="sb-regions">{split(C.salon.regions).map((t) => <span key={t}>{t}</span>)}</div>
            </div>
            <Link className="btn btn-ghost" href={ROUTES.about("intro")}>{C.salon.btn}</Link>
          </div>
        </div>
      </section>
    ),
  };

  return (
    <div className="site pg-home">
      {C.visible.nav && <SiteHeader hero={C.visible.hero && C.order.indexOf("hero") === C.order.indexOf("nav") + 1} />}
      {C.order.filter((id) => id !== "nav" && id !== "footer" && C.visible[id as keyof typeof C.visible]).map((id) => sections[id]?.())}
      <SiteFooter />
    </div>
  );
}
