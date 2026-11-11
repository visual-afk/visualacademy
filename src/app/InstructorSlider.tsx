"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import type { MainContent } from "@/data/siteContent";

/*
 * 메인 › 강사 소개 — 분류 탭 + 가로 슬라이더(스크롤 스냅, 좌우 화살표, 진행 바).
 * 내용은 디자인 모드(메인 페이지 › 강사 소개)에서 고친다. 목록 순서 = '전체' 탭 순서.
 */

type Section = MainContent["instructors"];
type Instructor = Section["list"][number];

const ALL = "전체";
const LEVEL = "레벨교육";
const split = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);
const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);

/** **굵게** 표시 */
function Bold({ text }: { text: string }) {
  return (
    <>
      {text.split(/\*\*(.+?)\*\*/g).map((part, i) => (i % 2 ? <b key={i}>{part}</b> : <Fragment key={i}>{part}</Fragment>))}
    </>
  );
}

function Card({ d }: { d: Instructor }) {
  const cats = split(d.cats);
  const career = lines(d.career);
  const career2 = lines(d.career2);
  const has = career.length > 0 || !!d.intro.trim();
  const body = (
    <>
      <div className="instr-photo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {d.img && <img src={d.img} alt={`${d.name} ${d.role}`} loading="lazy" />}
      </div>
      <p className="in">{d.name}</p>
      <p className="ir">{d.role}</p>
      <div className="chips">
        {d.insta && <span className="insta"><b>Insta</b> {d.insta}</span>}
        {cats.map((c) => <span key={c} className="cat">{c === LEVEL ? "레벨 전문 강사" : c}</span>)}
        {split(d.tags).map((t) => <span key={t}>{t}</span>)}
      </div>
      <div className="ins-body">
        {has ? (
          <>
            {career.length > 0 && (
              <>
                <h4>이력</h4>
                <ul className="ins-career">{career.map((c, i) => <li key={i}><Bold text={c} /></li>)}</ul>
              </>
            )}
            {career2.length > 0 && (
              <>
                <h4>{d.career2Title || "그 외 이력"}</h4>
                <ul className="ins-career">{career2.map((c, i) => <li key={i}><Bold text={c} /></li>)}</ul>
              </>
            )}
            {d.intro.trim() && (
              <>
                <h4>소개 / 인사말</h4>
                <p className="ins-intro"><Bold text={d.intro.replace(/\n/g, " ")} /></p>
              </>
            )}
          </>
        ) : (
          !d.link && <p className="ins-soon">이력과 소개를 준비하고 있어요.</p>
        )}
        {d.link && <span className="ins-more">프로필 보기 →</span>}
      </div>
    </>
  );
  return d.link ? (
    <Link href={d.link} className="instr-card link">{body}</Link>
  ) : (
    <div className="instr-card">{body}</div>
  );
}

export default function InstructorSlider({ data }: { data: Section }) {
  const [cur, setCur] = useState(ALL);
  const track = useRef<HTMLDivElement>(null);
  const [nav, setNav] = useState({ prev: false, next: false, show: false, w: 100, left: 0 });

  const tabs = [ALL, ...split(data.cats)];
  const count = (c: string) => (c === ALL ? data.list.length : data.list.filter((d) => split(d.cats).includes(c)).length);
  let list = cur === ALL ? data.list : data.list.filter((d) => split(d.cats).includes(cur));
  if (cur === LEVEL) {
    const order = split(data.levelOrder);
    const rank = (n: string) => (order.includes(n) ? order.indexOf(n) : order.length);
    list = [...list].sort((a, b) => rank(a.name) - rank(b.name));
  }

  const update = useCallback(() => {
    const t = track.current;
    if (!t) return;
    const max = t.scrollWidth - t.clientWidth;
    const w = (t.clientWidth / t.scrollWidth) * 100;
    setNav({ prev: t.scrollLeft > 4, next: t.scrollLeft < max - 4, show: max > 4, w, left: max > 0 ? (t.scrollLeft / max) * (100 - w) : 0 });
  }, []);

  /* 탭을 바꾸면 맨 앞으로 */
  useEffect(() => {
    const t = track.current;
    if (!t) return;
    t.style.scrollBehavior = "auto";
    t.scrollLeft = 0;
    t.style.scrollBehavior = "";
    update();
  }, [cur, update]);

  useEffect(() => {
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [update]);

  /* 화살표: 카드 한 장(+간격) 단위, 데스크톱은 두 장씩 */
  const move = (dir: 1 | -1) => {
    const t = track.current;
    const card = t?.querySelector(".instr-card");
    const step = card ? card.getBoundingClientRect().width + 20 : 300;
    t?.scrollBy({ left: dir * step * (window.innerWidth > 900 ? 2 : 1) });
  };

  return (
    <>
      <div className="ins-tabs" role="tablist">
        {tabs.map((c) => (
          <button key={c} type="button" role="tab" aria-selected={c === cur} className={`ins-tab${c === cur ? " on" : ""}`} onClick={() => setCur(c)}>
            {c}<em>{count(c)}</em>
          </button>
        ))}
      </div>
      <div className="ins-wrap">
        <button type="button" className="ins-arrow prev" aria-label="이전 강사" disabled={!nav.prev} onClick={() => move(-1)}>‹</button>
        <div className="ins-track" ref={track} onScroll={update}>
          {list.map((d) => <Card key={d.name} d={d} />)}
        </div>
        <button type="button" className="ins-arrow next" aria-label="다음 강사" disabled={!nav.next} onClick={() => move(1)}>›</button>
        <div className="ins-bar" style={{ visibility: nav.show ? undefined : "hidden" }}>
          <i style={{ width: `${nav.w}%`, left: `${nav.left}%` }} />
        </div>
      </div>
    </>
  );
}
