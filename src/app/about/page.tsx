import type { Metadata } from "next";
import { Fragment } from "react";
import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";
import TabBar, { pickTab } from "@/components/site/TabBar";
import { COMPANY } from "@/data/site";
import { getAboutContent, getMainContent } from "@/data/siteContent";
import InstructorSlider from "../InstructorSlider";
import PartnerForm from "./PartnerForm";

export const metadata: Metadata = { title: "아카데미 소개" };

/* 문구는 디자인 모드(아카데미 소개)에서 편집 — DEF_ABOUT */
const C = getAboutContent();
const TAB_KEYS = ["intro", "inst", "gallery", "way", "partner"] as const;
const TABS = TAB_KEYS.map((key, i) => ({ key, label: C.tabs.list[i]?.t ?? key }));

/** 사진 자리 — 사진이 없으면 듀오톤 + 카메라 마크 자리표시 */
const PH = ["p1", "p2", "p3", "p4", "p5", "p6"];
const bg = (img: string) => (img ? { backgroundImage: `url(${img})` } : undefined);
const photoCls = (base: string, img: string, ph: string) => `${base} ${img ? "has-img" : ph}`;

/** **굵게**(또는 강조) + 줄바꿈 */
function Rich({ text, em = false }: { text: string; em?: boolean }) {
  return (
    <>
      {text.split("\n").map((line, li) => (
        <Fragment key={li}>
          {li > 0 && <br />}
          {line.split(/\*\*(.+?)\*\*/g).map((part, i) => (i % 2 ? (em ? <em key={i}>{part}</em> : <b key={i}>{part}</b>) : <Fragment key={i}>{part}</Fragment>))}
        </Fragment>
      ))}
    </>
  );
}

const on = (k: keyof typeof C.visible) => C.visible[k] !== false;

function IntroPanel() {
  const branches = C.stats.branches.split(",").map((s) => s.trim()).filter(Boolean);
  return (
    <>
      {on("intro") && (
        <div className="section about-intro">
          <p className="kicker">{C.intro.kicker}</p>
          <h2><Rich text={C.intro.title} /></h2>
          <p className="strong">{C.intro.lead}</p>
          {C.intro.paras.map((x, i) => <p key={i}><Rich text={x.p} /></p>)}
        </div>
      )}

      {on("introPhoto") && (
        <div className={photoCls("big-photo", C.introPhoto.img, "p1")} style={bg(C.introPhoto.img)}><span>{C.introPhoto.caption}</span></div>
      )}

      {on("diff") && (
        <div className="section qa-block">
          <div className="qa-head">
            <span className="qtag">Q.</span>
            <h2>{C.diff.q}</h2>
          </div>
          <div className="trio-grid">
            {C.diff.list.map((d, i) => (
              <div key={i}><div className={photoCls("trio-photo", d.img, ["p3", "p2", "p6"][i % 3])} style={bg(d.img)} /><p className="trio-cap"><b>{d.b}</b>{d.d}</p></div>
            ))}
          </div>
        </div>
      )}

      {on("price") && (
        <div className="section qa-block">
          <div className="split-section">
            <div className="split-text">
              <p className="qtag">{C.price.q}</p>
              <h3><Rich text={C.price.title} /></h3>
              <p><Rich text={C.price.text} /></p>
            </div>
            <div className={photoCls("split-photo", C.price.img, "p5")} style={bg(C.price.img)} />
          </div>
        </div>
      )}

      {on("facility") && (
        <div className="section">
          <h2>{C.facility.title}</h2>
          <div className="trio-grid facility-compact">
            {C.facility.list.map((f, i) => (
              <div key={i}><div className={photoCls("trio-photo", f.img, ["p1", "p2", "p6", "p4", "p5", "p3"][i % 6])} style={bg(f.img)} /><p className="trio-cap"><b>{f.b}</b>{f.d}</p></div>
            ))}
          </div>
        </div>
      )}

      {on("ifbs") && (
        <div className="section qa-block">
          <div className="split-section light reverse">
            <div className="split-text">
              <p className="qtag">{C.ifbs.tag}</p>
              <h3><Rich text={C.ifbs.title} /></h3>
              {C.ifbs.paras.map((x, i) => <p key={i}><Rich text={x.p} /></p>)}
            </div>
            <div className={photoCls("split-photo", C.ifbs.img, "p3")} style={bg(C.ifbs.img)} />
          </div>
        </div>
      )}

      {on("welcome") && (
        <div className="section qa-block">
          <div className="split-section light">
            <div className="split-text">
              <p className="qtag">{C.welcome.tag}</p>
              <h3><Rich text={C.welcome.title} /></h3>
              {C.welcome.paras.map((x, i) => <p key={i}><Rich text={x.p} /></p>)}
            </div>
            <div className={photoCls("split-photo", C.welcome.img, "p5")} style={bg(C.welcome.img)} />
          </div>
        </div>
      )}

      {on("stats") && (
        <div className="section dark-section">
          <div className="dark-inner">
            <div className="stats-dark">
              <h3>{C.stats.title}</h3>
              <div className="stat-grid-dark">
                {C.stats.list.map((s) => (
                  <div key={s.l} className="stat-tile-dark"><p className="num">{s.n}</p><p className="label">{s.l}</p></div>
                ))}
              </div>
            </div>
            <div className="salon-banner">
              <h3>{C.stats.salon}</h3>
              <div className="salon-chip-row">
                {branches.map((s) => <span key={s} className="salon-chip">{s}</span>)}
              </div>
            </div>
          </div>
        </div>
      )}

      {on("quote") && (
        <div className="section quote-section p6">
          <div className="qtext">
            {C.quote.paras.map((x, i) => <p key={i}><Rich text={i === 0 ? x.p : x.p.replace(/\*\*/g, "")} em={i === 0} /></p>)}
          </div>
        </div>
      )}
    </>
  );
}

export default async function AboutPage({ searchParams }: PageProps<"/about">) {
  const tab = pickTab(TABS, (await searchParams).tab);

  return (
    <div className="site pg-about">
      <SiteHeader active="academy" />
      <div className="wrap narrow pagehead">
        <h1>{C.pagehead.title}</h1>
        <p>{C.pagehead.desc}</p>
      </div>

      <div className="wrap narrow">
        <TabBar basePath="/about" tabs={TABS} active={tab} />

        <div className="tab-panel">
          {tab === "intro" && <IntroPanel />}

          {/* 강사 소개 — 메인 페이지 강사 슬라이더와 같은 컴포넌트·같은 데이터 (필터 탭 포함) */}
          {tab === "inst" && (
            <div className="section">
              <h2>{C.inst.title}</h2>
              <InstructorSlider data={getMainContent().instructors} />
            </div>
          )}

          {tab === "gallery" && (
            <div className="section">
              <h2>{C.gallery.title}</h2>
              <div className="gallery-grid">
                {C.gallery.list.map((g, i) => (
                  <div key={i} className={`gallery-tile ${g.img ? "has-img" : PH[i % 6].replace("p", "g")}`} style={bg(g.img)}><span>{g.c}</span></div>
                ))}
              </div>
            </div>
          )}

          {tab === "way" && (
            <div className="section">
              <h2>{C.way.title}</h2>
              {C.way.mapImg ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="map-img" src={C.way.mapImg} alt={`${C.way.title} 약도`} />
              ) : (
                <div className="map-box">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 1 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                  <p>{C.way.mapNote}</p>
                </div>
              )}
              <div className="info-list">
                <div className="info-row"><span className="info-label">주소</span><span className="info-val"><Rich text={C.way.addr} /></span></div>
                <div className="info-row"><span className="info-label">전화</span><span className="info-val">{C.way.tel}</span></div>
                <div className="info-row"><span className="info-label">카카오톡</span><span className="info-val">채널 {COMPANY.kakao}</span></div>
                <div className="info-row"><span className="info-label">운영 시간</span><span className="info-val">{C.way.hours}</span></div>
              </div>
            </div>
          )}

          {tab === "partner" && (
            <div className="section">
              <h2>{C.partner.title}</h2>
              <p className="lead" style={{ marginBottom: 24 }}>{C.partner.lead}</p>
              <PartnerForm types={C.partner.types.map((x) => x.t)} btn={C.partner.btn} />
            </div>
          )}
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
