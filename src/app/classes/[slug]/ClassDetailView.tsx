"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/common/useToast";
import Accordion from "@/components/site/Accordion";
import { getInstructor } from "@/data/instructors";
import { ROUTES } from "@/data/site";
import { getClass, getClassDetail, refundPolicy } from "@/lib/api";
import { fullDate, ddayLabel, priceLabel } from "@/lib/format";
import { badgeClass, CATEGORY_LABELS, computeStatus, ctaLabel } from "@/lib/status";
import type { AcademyClass, ClassStatus } from "@/lib/types";

type Tab = "info" | "reviews" | "qna" | "refund";

function ddayChip(c: AcademyClass, status: ClassStatus): { text: string; cls: string } {
  if (status === "온라인상시") return { text: "상시 신청 가능", cls: "mint" };
  if (status === "개설대기") return { text: `개설 대기 · 알림 신청 ${c.applied ?? 0}명`, cls: "line" };
  if (status === "개설예정") return { text: "개설 예정 · 일정이 정해지면 알려드려요", cls: "line" };
  if (status === "종료") return { text: "모집이 종료된 클래스예요", cls: "line" };
  if (status === "마감") return { text: "정원 마감", cls: "red" };
  const remain = (c.capacity ?? 0) - (c.applied ?? 0);
  if (status === "마감임박") return { text: `마감임박 · 정원 ${remain}석 남음`, cls: "amber" };
  return { text: `모집중 · 개강까지 ${ddayLabel(c.date!)}`, cls: "mint" };
}

function topLines(c: AcademyClass): [string, string] {
  if (c.type === "online") return ["상시 신청 가능 · 결제 즉시 수강 시작", "온라인 (VOD) · PC · 모바일 모두 가능"];
  const target = c.noob ? "비전공자 가능" : c.target;
  if (!c.date) return [`일정 미정${c.time ? ` · ${c.time}` : ""}`, `${c.place ?? "장소 미정"} · ${target}`];
  return [`${fullDate(c.date)} · ${c.time}`, `${c.place} · ${target}`];
}

function buyboxRows(c: AcademyClass): [string, string][] {
  if (c.type === "online") {
    return [
      ["수강 기간", `결제일로부터 ${c.months}개월`],
      ["진도", "언제든 이어보기 가능"],
      ["형태", "VOD + 실습 자료 다운로드"],
    ];
  }
  if (c.type === "upcoming") return [["일정", "개설 예정"], ["과정", `총 ${c.weeks}주`]];
  if (c.type === "waitlist") {
    return [
      ["일정", "미정"],
      ["장소", c.place ?? "-"],
      ["알림 신청", `${c.applied}명`],
    ];
  }
  return [
    ["일정", `${fullDate(c.date!)} ${c.time}`],
    ["장소", c.place ?? "-"],
    ["대상", c.noob ? `${c.target} (비전공자 가능)` : c.target],
    ["정원", `${c.capacity}명 중 ${c.applied}명 신청`],
  ];
}

function Preview({ title, desc, duration }: { title: string; desc: string; duration: string }) {
  const [sec, setSec] = useState<number | null>(null);
  const [ended, setEnded] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
  }, []);

  /* 30초 미리보기 구간 재생 시뮬레이션 — 실제 서비스에서는 VOD 플레이어로 교체 */
  const play = () => {
    if (timer.current) clearInterval(timer.current);
    setEnded(false);
    setSec(0);
    timer.current = setInterval(() => {
      setSec((s) => {
        const next = (s ?? 0) + 3;
        if (next >= 30) {
          if (timer.current) clearInterval(timer.current);
          setEnded(true);
          return null;
        }
        return next;
      });
    }, 300);
  };
  const playing = sec !== null;
  const label = playing
    ? `재생 중 · ${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")} / ${duration}`
    : ended
      ? "미리보기 종료 · 다시 보기"
      : duration;

  return (
    <div className="preview-card">
      <button type="button" className="preview-thumb" onClick={play} aria-label="미리보기 재생">
        <span className="preview-play">
          {playing ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#14161a"><rect x="6" y="5" width="4" height="14" /><rect x="14" y="5" width="4" height="14" /></svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#14161a"><path d="M8 5v14l11-7z" /></svg>
          )}
        </span>
        <span className="preview-duration">{label}</span>
        <span className="preview-progress">
          <span className="preview-progress-bar" style={{ display: "block", width: `${playing ? (sec / 30) * 100 : ended ? 100 : 0}%` }} />
        </span>
      </button>
      <div className="preview-info">
        <div>
          <span className="preview-badge">무료 미리보기</span>
          <p className="preview-title">{title}</p>
          <p className="preview-desc">{desc}</p>
        </div>
        <button type="button" className="btn btn-ghost preview-cta" onClick={play}>미리보기 재생</button>
      </div>
    </div>
  );
}

function Lessons({ lessons }: { lessons: { t: string; d: string; hidden?: boolean }[] }) {
  const [all, setAll] = useState(false);
  const hiddenCount = lessons.filter((l) => l.hidden).length;
  const visible = all ? lessons : lessons.filter((l) => !l.hidden);
  return (
    <div>
      {visible.map((l, i) => (
        <div key={l.t} className="lesson">
          <div className="lnum">{i + 1}</div>
          <div>
            <p className="ltitle">{l.t}</p>
            <p className="ldesc">{l.d}</p>
          </div>
        </div>
      ))}
      {hiddenCount > 0 && !all && (
        <button type="button" className="more-btn" onClick={() => setAll(true)}>
          전체 {lessons.length}개 보기 ▾
        </button>
      )}
    </div>
  );
}

export default function ClassDetailView({ slug }: { slug: string }) {
  const c = getClass(slug)!;
  const d = getClassDetail(c);
  const status = computeStatus(c);
  const inst = getInstructor(d.instructorId);
  const [tab, setTab] = useState<Tab>("info");
  const [notified, setNotified] = useState(false);
  const { toast, showToast } = useToast();

  const chip = ddayChip(c, status);
  const [line1, line2] = topLines(c);
  const unit = c.type === "online" ? `${c.months}개월 수강` : c.cat === "정석" ? "/ 전체 과정" : "1인 기준";
  const catLabel = c.cat === "온라인" ? "온라인 강의" : CATEGORY_LABELS[c.cat];

  const cta = ctaLabel(c, status);
  const isNotify = c.type === "waitlist" || c.type === "upcoming";
  const closed = status === "종료" || status === "마감";
  const ctaButton = (cls = "btn btn-mint") =>
    closed ? (
      <button type="button" className={cls} disabled>{cta}</button>
    ) : isNotify ? (
      <button
        type="button"
        className={cls}
        disabled={notified}
        onClick={() => {
          setNotified(true);
          showToast("개설 알림을 신청했어요 · 일정이 정해지면 알림톡으로 안내드려요");
        }}
      >
        {notified ? "알림 신청 완료" : cta}
      </button>
    ) : (
      <Link className={cls} href={ROUTES.checkout(c.slug)}>{cta}</Link>
    );

  return (
    <>
      <div className="wrap crumbs">
        <Link href={ROUTES.classes}>클래스</Link>
        <span className="sep">/</span>
        <Link href={ROUTES.classList(c.cat)}>{catLabel}</Link>
        <span className="sep">/</span>
        <span className="cur">{c.name}</span>
      </div>

      <div className="wrap detail-grid">
        <div>
          <div className="top-block">
            <div className="hero-img"><span>{c.name}</span></div>
            <div className="top-info">
              <div className="tags">
                <span className="badge badge-line">{catLabel}</span>
                <span className={`badge ${badgeClass(status)}`}>{status === "개설예정" ? "개설 예정" : status}</span>
              </div>
              <h1 className="dtitle">{c.name}</h1>
              <p className="top-sum">{line1}</p>
              <p className="top-sum">{line2}</p>
            </div>
          </div>

          {d.preview && <Preview {...d.preview} />}

          <div className="tabbar" role="tablist">
            {(
              [
                ["info", "상세정보", null],
                ["reviews", "구매평", d.reviews.length],
                ["qna", "Q&A", d.faqs.length],
                ["refund", "반품/교환", null],
              ] as [Tab, string, number | null][]
            ).map(([key, label, cnt]) => (
              <button key={key} type="button" role="tab" aria-selected={tab === key} className={`tabbar-btn${tab === key ? " active" : ""}`} onClick={() => setTab(key)}>
                {label}
                {cnt !== null && <span className="cnt"> ({cnt})</span>}
              </button>
            ))}
          </div>

          {tab === "info" && (
            <div>
              {d.detailImage ? (
                <div className="hero-photo">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={d.detailImage} alt={`${c.name} 상세 페이지`} />
                </div>
              ) : (
                <div className="hero-photo hero-photo-ph"><span>{c.name} · 상세페이지 이미지 영역</span></div>
              )}

              <div className="section">
                <h2>이런 분께 필요해요</h2>
                <ul className="checklist">
                  {d.checklist.map((t) => <li key={t}>{t}</li>)}
                </ul>
              </div>

              <div className="section">
                <h2>{d.curriculumTitle}</h2>
                <Lessons lessons={d.lessons} />
              </div>

              <div className="section">
                <h2>강사 소개</h2>
                <div className="instructor">
                  <div className="iavatar">{inst.initial}</div>
                  <div>
                    <p className="iname">{inst.name}</p>
                    <p className="irole">{inst.role}</p>
                  </div>
                </div>
                <div className="prep-note"><b>준비물 안내</b>{d.prep}</div>
              </div>
            </div>
          )}

          {tab === "reviews" && (
            <div className="section">
              <h2>수강생 후기</h2>
              {d.reviews.length ? (
                d.reviews.map((r) => (
                  <div key={r.name + r.text} className="review">
                    <div className="rtop"><span className="rname">{r.name}</span><span className="rstars">★★★★★</span></div>
                    <p>{r.text}</p>
                  </div>
                ))
              ) : (
                <div className="empty-panel"><p>아직 등록된 구매평이 없어요</p></div>
              )}
            </div>
          )}

          {tab === "qna" && (
            <div className="section">
              <h2>자주 묻는 질문</h2>
              {d.faqs.length ? (
                <Accordion items={d.faqs} />
              ) : (
                <div className="empty-panel">
                  <p>아직 등록된 문의가 없어요</p>
                  <Link className="btn btn-ghost" href={ROUTES.about("way")}>문의하기</Link>
                </div>
              )}
            </div>
          )}

          {tab === "refund" && (
            <div className="section">
              <h2>반품 · 교환 · 환불 규정</h2>
              <ul className="refund-list">
                {refundPolicy(c).map((l) => <li key={l}>{l}</li>)}
              </ul>
            </div>
          )}
        </div>

        <div>
          <div className="buybox">
            <div className="bb-price-row">
              <span className="bb-price">{priceLabel(c)}</span>
              <span className="bb-unit">{unit}</span>
            </div>
            <span className={`bb-dday ${chip.cls}`}>{chip.text}</span>
            <dl className="bb-dl">
              {buyboxRows(c).map(([k, v]) => (
                <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
              ))}
            </dl>
            {ctaButton()}
            <Link className="btn btn-ghost" href={ROUTES.about("way")}>카카오채널로 문의하기</Link>
            <div className="bb-quote"><b>수강생 후기</b><br />{d.buyboxQuote}</div>
          </div>
        </div>
      </div>

      <div className="mobile-bar">
        <div className="mb-price">
          {priceLabel(c)}
          <span className="mb-unit">{unit}</span>
        </div>
        {ctaButton()}
      </div>
      {toast}
    </>
  );
}
