import Link from "next/link";
import { connection } from "next/server";
import GrowthRoadmap, { type RoadmapColumn } from "@/components/site/GrowthRoadmap";
import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";
import { ROUTES } from "@/data/site";
import { getMainContent, type MainContent } from "@/data/siteContent";
import { getClasses } from "@/lib/api";
import { dday, priceLabel, shortDate } from "@/lib/format";
import { badgeClass, computeStatus } from "@/lib/status";
import type { AcademyClass, ClassStatus } from "@/lib/types";
import HeroSearch from "./HeroSearch";

/*
 * 메인 페이지 — 영역 순서·노출과 모든 문구는 디자인 모드(페이지 관리 › 메인 페이지) 콘텐츠를 따른다.
 * 모집중 카드의 일정·정원·수강료는 클래스 데이터에서 자동으로 만든다.
 */

const STEP_LAYOUT = [
  { y: 81, labelPos: "top" },
  { y: 68, labelPos: "top" },
  { y: 42, labelPos: "bottom" },
  { y: 19, labelPos: "bottom" },
] as const;
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
function pickRecruit(rule: string, count: number) {
  const rows = getClasses()
    .map((c) => ({ ...c, status: computeStatus(c) }))
    .filter((c) => !["종료", "마감", "개설예정"].includes(c.status));
  const urgency = (c: AcademyClass & { status: ClassStatus }) =>
    c.status === "마감임박" ? 0 : c.date ? 1 : c.type === "online" ? 2 : 3;
  if (rule === "imminent") rows.sort((a, b) => urgency(a) - urgency(b) || (a.date && b.date ? dday(a.date) - dday(b.date) : 0));
  if (rule === "start") rows.sort((a, b) => (a.date ? dday(a.date) : 9999) - (b.date ? dday(b.date) : 9999));
  return rows.slice(0, count);
}

function RecruitCard({ c }: { c: AcademyClass & { status: ClassStatus } }) {
  const online = c.type === "online";
  const wait = c.type === "waitlist";
  const badge = online ? "상시 수강" : wait ? "개설 대기" : c.status;
  return (
    <div className="class-card ph">
      <span className={`badge ${online || wait ? "badge-line" : badgeClass(c.status)}`}>{badge}</span>
      <h3><Link href={ROUTES.classDetail(c.slug)}>{c.name}</Link></h3>
      {online ? (
        <><p className="meta">영상 강의 · 수강 기간 {c.months}개월</p><p className="meta">언제든 시작 가능</p></>
      ) : wait ? (
        <><p className="meta">일정 미정</p><p className="meta">알림 신청 {c.applied}명</p></>
      ) : (
        <><p className="meta">{shortDate(c.date!)} 개강{c.weeks ? ` · 총 ${c.weeks}주` : ""}</p><p className="meta">{c.place} · {c.day}요일{c.weeks ? "반" : ""}</p></>
      )}
      <p className="price">{priceLabel(c)}</p>
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

  const sections: Record<string, () => React.ReactNode> = {
    hero: () => (
      <section key="hero" className="hero" id="heroSection">
        <div className="hero-bigtext" aria-hidden>VISUAL ACADEMY</div>
        <svg className="hero-strands" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" aria-hidden>
          <path d="M-40,120 C260,40 420,260 720,140 C980,40 1160,180 1260,80" stroke="#5fd0ca" strokeWidth="1" fill="none" opacity=".35" />
          <path d="M-60,620 C240,720 460,540 760,660 C1000,750 1180,600 1280,680" stroke="#5fd0ca" strokeWidth="1" fill="none" opacity=".28" />
          <path d="M-40,380 C300,300 560,460 820,360 C1020,290 1180,380 1260,340" stroke="#5fd0ca" strokeWidth="1" fill="none" opacity=".2" />
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
            {pickRecruit(C.recruit.rule, Number(C.recruit.count) || 3).map((c) => <RecruitCard key={c.id} c={c} />)}
          </div>
        </div>
      </section>
    ),
    programs: () => (
      <section key="programs" id="academy">
        <div className="wrap">
          <div className="section-head"><h2>{C.programs.title}</h2><p>{C.programs.desc}</p></div>
          <div className="prog3">
            {C.programs.cards.map((p) => (
              <div key={p.title} className="prog-card">
                <h3>{p.title}</h3>
                <p>{p.desc}</p>
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
            <div><h3>{C.online.title}</h3><p>{C.online.desc}</p></div>
            <Link className="btn btn-ghost" href={ROUTES.classList("온라인")}>{C.online.btn}</Link>
          </div>
        </div>
      </section>
    ),
    instructors: () => (
      <section key="instructors">
        <div className="wrap">
          <div className="section-head"><h2>{C.instructors.title}</h2><p>{C.instructors.desc}</p></div>
          <div className="instr-grid">
            {C.instructors.list.map((ins, i) => (
              <div key={i} className={`instr-card${ins.img ? "" : " ph"}`}>
                <div className="instr-photo" style={ins.img ? { backgroundImage: `url(${ins.img})`, backgroundSize: "cover", border: "none" } : undefined}>
                  {ins.img ? "" : "사진"}
                </div>
                <p className="in">{ins.name}</p>
                <p className="ir">{ins.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    ),
    reviews: () => (
      <section key="reviews" className="bg-surface" id="reviews">
        <div className="wrap">
          <div className="section-head"><h2>{C.reviews.title}</h2><p>{C.reviews.desc}</p></div>
          <div className="testi-grid">
            {C.reviews.list.map((r, i) => (
              <div key={i} className="testi-card ph"><p className="tq">&ldquo;{r.q}&rdquo;</p><p className="ta">{r.a}</p></div>
            ))}
          </div>
        </div>
      </section>
    ),
    salon: () => (
      <section key="salon" className="tight">
        <div className="wrap">
          <div className="salon-band">
            <div><h3>{C.salon.title}</h3><p>{C.salon.desc}</p></div>
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
