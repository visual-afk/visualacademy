"use client";

import Link from "next/link";
import { useState } from "react";

/*
 * 성장 로드맵 — 4단 상향 직선 그래프 (메인·클래스 목록 공용 컴포넌트)
 * 경력 탭을 고르면 추천 단계가 바뀌고, 컬럼에 hover/클릭하면 해당 단계의 카드가 아래에 나타난다.
 * 모바일에서는 선택된 단계의 카드만 보이며, 첫 진입 시 추천 단계가 자동 선택된다.
 */

export interface RoadmapCard {
  /** 카드 제목 영역 — home: Step 01 + 강의명 / classes: 한 줄 제목 */
  stepLabel?: string;
  name: string;
  meta: string;
  chips?: string[];
  cta: string;
  href?: string;
  onClick?: () => void;
}

export interface RoadmapColumn {
  labelPos: "top" | "bottom";
  title: string;
  name: string;
  desc?: React.ReactNode;
  img?: string;
  status?: { text: string; cls: string };
  extraChips?: { label: string; cls: string }[];
  card: RoadmapCard;
}

/** 상향 직선: 왼쪽 아래(0%, LINE_START%) → 오른쪽 위(100%, LINE_END%). 각 단계 점은 이 선 위 25% 간격 */
const LINE_START = 81;
const LINE_END = 7;
const dotY = (i: number) => LINE_START + ((LINE_END - LINE_START) * i) / 4;

const EXP_TABS =["1년 미만", "1~3년", "3년 이상"];
/** 경력 탭 → 추천 단계 (0-based) */
const EXP_RECOMMEND = [0, 1, 3];

export default function GrowthRoadmap({
  columns,
  description,
  title = "나에게 맞는 성장 로드맵",
  tabs = EXP_TABS,
}: {
  columns: RoadmapColumn[];
  description: string;
  title?: string;
  tabs?: string[];
}) {
  const [exp, setExp] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);
  const recommended = EXP_RECOMMEND[exp];
  const active = hovered ?? recommended;

  return (
    <>
      <div className="section-head">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <div className="exp-tabs">
        {tabs.map((label, i) => (
          <button
            key={label}
            type="button"
            className={`etab${exp === i ? " active" : ""}`}
            onClick={() => {
              setExp(i);
              setHovered(null);
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="roadmap">
        <div className="roadmap-inner">
          <div className="rgraph">
            <svg className="rgraph-svg" viewBox="0 0 1000 100" preserveAspectRatio="none" aria-hidden>
              <path
                className="rgraph-line"
                d={`M0,${LINE_START} L1000,${LINE_END}`}
                fill="none"
                stroke="#c7ccc7"
                strokeWidth="2.4"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            <div className="rdot-end" style={{ left: "100%", top: `${LINE_END}%` }} />
            {[0, 25, 50, 75].map((l) => (
              <div key={l} className="rdivider" style={{ left: `${l}%` }} />
            ))}
            <div className="rdivider end" />

            {columns.map((col, i) => (
              <div
                key={i}
                className={`rcol${active === i ? " active" : ""}${recommended === i ? " recommended" : ""}`}
                data-step={i}
                style={{ "--y": `${dotY(i)}%` } as React.CSSProperties}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => setHovered(i)}
              >
                <div className="rcol-divider" />
                <div className="rcol-glow" />
                {col.img && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="rcol-img" alt="" src={col.img} />
                )}
                <p className="rtag">추천</p>
                <div className="rdot" />
                <div className={`rlabel rlabel-${col.labelPos}`}>
                  <p className="rl-step">{col.title}</p>
                  <p className="rl-name">{col.name}</p>
                  {col.desc && <p className="rl-desc">{col.desc}</p>}
                  {col.status && <span className={`rstatus ${col.status.cls}`}>{col.status.text}</span>}
                  {col.extraChips && col.extraChips.length > 0 && (
                    <div className="rextra">
                      {col.extraChips.map((c) => (
                        <span key={c.label} className={`rextra-chip ${c.cls}`}>
                          {c.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="rcards">
            {columns.map((col, i) => {
              const c = col.card;
              const show = active === i;
              return (
                <div key={i} className={`rcard-slot${show ? " show" : ""}`}>
                  <div className={`rcard${show ? " show" : ""}`}>
                    {col.img && (
                      // 모바일 전용: 그래프 위 hover 사진 대신 선택한 단계의 사진을 카드에 표시
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className="rc-img" alt="" src={col.img} loading="lazy" />
                    )}
                    {c.stepLabel ? (
                      <>
                        <p className="rc-step">{c.stepLabel}</p>
                        <p className="rc-name">{c.name}</p>
                      </>
                    ) : (
                      <p className="rc-title">{c.name}</p>
                    )}
                    <p className="rc-meta">{c.meta}</p>
                    {c.chips && (
                      <div className="rc-extra">
                        {c.chips.map((chip) => (
                          <span key={chip} className="rchip">
                            {chip}
                          </span>
                        ))}
                      </div>
                    )}
                    {c.href ? (
                      <Link className="rc-cta" href={c.href}>
                        {c.cta}
                      </Link>
                    ) : (
                      <button type="button" className="rc-cta" onClick={c.onClick}>
                        {c.cta}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
