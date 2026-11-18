import type { Metadata } from "next";
import { Fragment } from "react";
import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";
import { getGreetingContent } from "@/data/siteContent";

export const metadata: Metadata = { title: "대표 인사" };

/* 문구·사진은 디자인 모드(대표 인사)에서 편집 — DEF_GREETING. 히어로 배너·서체는 확정 대기 */
const C = getGreetingContent();
const on = (k: keyof typeof C.visible) => C.visible[k] !== false;

function Lines({ text }: { text: string }) {
  return (
    <>
      {text.split("\n").map((l, i) => (
        <Fragment key={i}>{i > 0 && <br />}{l}</Fragment>
      ))}
    </>
  );
}

/** 배경 — 검은 바탕 위로 흐르는 빛줄기 */
function LightStreaks() {
  return (
    <svg className="bg" viewBox="0 0 1600 1400" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <linearGradient id="gr-g1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset=".5" stopColor="#fff" stopOpacity=".34" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
        <linearGradient id="gr-g2" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset=".55" stopColor="#fff" stopOpacity=".22" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
        <filter id="gr-b1" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="22" /></filter>
        <filter id="gr-b2" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="9" /></filter>
        <radialGradient id="gr-v" cx=".5" cy=".5" r=".75"><stop offset=".35" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".85" /></radialGradient>
      </defs>
      <g fill="none" strokeLinecap="round">
        <path d="M300 -80 C700 260 1250 120 1500 620 S1250 1180 1020 1500" stroke="url(#gr-g1)" strokeWidth="150" filter="url(#gr-b1)" />
        <path d="M700 -100 C760 380 1100 520 1180 900 S1000 1300 1180 1500" stroke="url(#gr-g2)" strokeWidth="95" filter="url(#gr-b1)" />
        <path d="M120 200 C520 420 860 360 1060 760" stroke="url(#gr-g1)" strokeWidth="46" filter="url(#gr-b2)" />
        <path d="M980 40 C1220 300 1500 340 1620 820" stroke="url(#gr-g2)" strokeWidth="64" filter="url(#gr-b2)" />
        <path d="M560 700 C820 760 1040 1020 1000 1420" stroke="url(#gr-g1)" strokeWidth="34" filter="url(#gr-b2)" opacity=".7" />
      </g>
      <rect width="1600" height="1400" fill="url(#gr-v)" />
    </svg>
  );
}

export default function GreetingPage() {
  return (
    <div className="site pg-greeting">
      {/* 제목 서체 (확정 대기) — 이 페이지에서만 쓰고, 못 불러오면 세리프 기본 서체로 */}
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Marcellus&display=swap" precedence="default" />
      <SiteHeader active="academy" />

      <section className="ceo-dark">
        <LightStreaks />
        <div className="ceo-in">
          <div className="ceo-grid">
            <div className="ceo-photo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {C.head.photo && <img src={C.head.photo} alt={C.head.photoAlt} />}
            </div>
            <div className="ceo-col">
              {on("head") && (
                <>
                  <h1 className="ceo-t">{C.head.title}</h1>
                  <div className="ceo-bar" />
                  <p className="ceo-hello"><Lines text={C.head.hello} /></p>
                </>
              )}
              {on("panel") && C.panel.list.length > 0 && (
                <div className="ceo-panel">
                  <ul>{C.panel.list.map((x, i) => <li key={i}>{x.t}</li>)}</ul>
                </div>
              )}
              {on("body") && (
                <>
                  <hr className="ceo-hr" />
                  <h2 className="ceo-q">{C.body.quote}</h2>
                  {C.body.paras.map((x, i) => <p key={i} className="ceo-p"><Lines text={x.p} /></p>)}
                </>
              )}
              {on("sign") && (
                <div className="ceo-sign">
                  <b>{C.sign.label}</b>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {C.sign.img && <img src={C.sign.img} alt={C.sign.alt} />}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
