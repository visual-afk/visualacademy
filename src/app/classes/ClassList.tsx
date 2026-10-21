"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import ClassThumb from "@/components/site/ClassThumb";
import GrowthRoadmap, { type RoadmapColumn } from "@/components/site/GrowthRoadmap";
import { ROUTES } from "@/data/site";
import { getClasses } from "@/lib/api";
import { dayLabel, ddayLabel, priceLabel } from "@/lib/format";
import { badgeClass, computeStatus, ctaLabel, STEP_NAMES } from "@/lib/status";
import type { AcademyClass, ClassStatus } from "@/lib/types";

const STATUS_TABS: { value: string; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "모집중", label: "이번 기수 모집중" },
  { value: "온라인상시", label: "상시 수강" },
  { value: "개설대기", label: "개설 대기" },
  { value: "종료", label: "종료된 클래스" },
];
const ROW_CATS = [
  { key: "특강", label: "단독 특강" },
  { key: "세미나", label: "세미나" },
  { key: "경영", label: "경영·컨설팅" },
  { key: "온라인", label: "온라인 강의" },
] as const;
const VALID_CATS = ["정석", "특강", "세미나", "경영", "온라인"];

interface Filters {
  status: string;
  cat: string;
  field: string;
  target: string;
  day: string;
  cert: string;
  noob: string;
  q: string;
}
const EMPTY: Filters = { status: "all", cat: "all", field: "all", target: "all", day: "all", cert: "all", noob: "all", q: "" };

type Row = AcademyClass & { status: ClassStatus };

function matchesCommon(c: Row, f: Filters) {
  return (
    (f.field === "all" || c.field === f.field) &&
    (f.target === "all" || c.target === f.target) &&
    (f.cert === "all" || (c.cert ? "발급" : "미발급") === f.cert) &&
    (f.noob === "all" || (c.noob ? "가능" : "불가") === f.noob) &&
    (!f.q || c.name.toLowerCase().includes(f.q.toLowerCase()))
  );
}
/** 상태 탭 "전체"는 종료된 클래스를 숨긴다 */
function matchesStatus(c: Row, f: Filters) {
  return f.status === "all" ? c.status !== "종료" : c.status === f.status;
}
function matchesDay(c: Row, f: Filters) {
  return f.day === "all" || c.day === f.day;
}

function metaLine(c: Row, withPlace: boolean) {
  const place = withPlace ? ` · ${c.place}` : "";
  if (c.status === "종료") return `${c.date} 종료됨${place}`;
  if (c.type === "online") return withPlace ? `상시 · 수강 기간 ${c.months}개월` : "상시";
  if (c.type === "waitlist") return `일정 미정${place}`;
  return `${c.date} (${ddayLabel(c.date!)})${place}`;
}

function ClassButton({ c, small }: { c: Row; small?: boolean }) {
  const label = ctaLabel(c, c.status);
  const disabled = c.status === "종료" || c.status === "마감";
  const ghost = disabled || c.type === "waitlist" || c.type === "upcoming";
  const cls = `btn ${ghost ? "btn-ghost" : "btn-mint"}${small ? " btn-sm" : ""}`;
  if (disabled) {
    return (
      <button type="button" className={cls} disabled>
        {label}
      </button>
    );
  }
  const href = c.type === "waitlist" || c.type === "upcoming" ? ROUTES.classDetail(c.slug) : ROUTES.checkout(c.slug);
  return (
    <Link className={cls} href={href}>
      {label}
    </Link>
  );
}

function OrderCard({ c, flash }: { c: Row; flash: boolean }) {
  const upcoming = c.type === "upcoming";
  return (
    <div className={`order-card ${upcoming ? "muted" : "active"}${flash ? " flash" : ""}`} id={`level-${c.level}`}>
      <div className={`order-node s${c.level}`}>{c.level}</div>
      <div className="headrow">
        <ClassThumb />
        <div className="ht">
          <p className="ostep">STEP {c.level} · {STEP_NAMES[(c.level ?? 1) - 1]}</p>
          <h3><Link href={ROUTES.classDetail(c.slug)}>{c.name}</Link></h3>
        </div>
      </div>
      {upcoming ? (
        <>
          <span className="badge badge-line">개설 예정</span>
          <p className="ometa">일정이 정해지면 가장 먼저 알려드려요</p>
        </>
      ) : (
        <>
          <span className={`badge ${badgeClass(c.status)}`}>{c.status}</span>
          <p className="ometa">
            {c.date} ({ddayLabel(c.date!)})<span className="sep">·</span>{c.place}
          </p>
          <p className="oprice">{priceLabel(c)}</p>
        </>
      )}
      <ClassButton c={c} />
    </div>
  );
}

function LinkedCard({ c }: { c: Row }) {
  const ended = c.status === "종료";
  return (
    <div className={`linked-card${ended ? " past" : ""}`}>
      <div className="linkrow">
        <ClassThumb />
        <div className="lr-txt">
          <span className={`badge ${ended ? "badge-ended" : "badge-line"}`}>{ended ? "종료" : c.cat}</span>
          <h4><Link href={ROUTES.classDetail(c.slug)}>{c.name}</Link></h4>
        </div>
      </div>
      <p className="lc-meta">
        {metaLine(c, false)}
        <span className="sep">·</span>
        {c.place}
      </p>
      <p className="lc-price">{priceLabel(c)}</p>
      <ClassButton c={c} />
    </div>
  );
}

function RowCard({ c }: { c: Row }) {
  return (
    <div className={`row-card${c.status === "종료" ? " past" : ""}`}>
      <div className="rctop">
        <span className="badge badge-line">{c.cat}</span>
        <span className={`badge ${badgeClass(c.status)}`}>{c.status}</span>
      </div>
      <div className="headrow">
        <ClassThumb />
        <div className="ht">
          <h3><Link href={ROUTES.classDetail(c.slug)}>{c.name}</Link></h3>
        </div>
      </div>
      <p className="meta">
        {dayLabel(c.day)}
        <span className="sep">·</span>
        {c.time}
      </p>
      <p className="meta" style={{ marginTop: 2 }}>{metaLine(c, true)}</p>
      <div className="tags">
        {c.step && <span className={`step-chip s${c.step}`}>STEP {c.step} · {STEP_NAMES[c.step - 1]}</span>}
        {c.cert && <span className="tagchip">수료증 발급</span>}
        {c.noob && <span className="tagchip">비전공자 가능</span>}
      </div>
      <p className="price">{priceLabel(c)}</p>
      <ClassButton c={c} />
    </div>
  );
}

export default function ClassList() {
  const params = useSearchParams();
  const catParam = params.get("cat");
  const initialCat = catParam && VALID_CATS.includes(catParam) ? catParam : "all";

  const [f, setF] = useState<Filters>({ ...EMPTY, cat: initialCat });
  const [view, setView] = useState<"level" | "class">(initialCat === "all" || initialCat === "정석" ? "level" : "class");
  const [flashLevel, setFlashLevel] = useState<number | null>(null);

  /* GNB "온라인 강의" 등으로 같은 페이지에서 ?cat= 만 바뀌는 경우 — 렌더 중 상태 조정 */
  const [prevCat, setPrevCat] = useState(initialCat);
  if (prevCat !== initialCat) {
    setPrevCat(initialCat);
    setF((prev) => ({ ...prev, cat: initialCat }));
    setView(initialCat === "all" || initialCat === "정석" ? "level" : "class");
  }

  const rows: Row[] = useMemo(() => getClasses().map((c) => ({ ...c, status: computeStatus(c) })), []);
  const orderClasses = rows.filter((c) => c.cat === "정석").sort((a, b) => (a.level ?? 0) - (b.level ?? 0));
  const rowClasses = rows.filter((c) => c.cat !== "정석");

  /* 레벨별 보기 — 정석 카드는 상태 탭·요일과 무관하게 전체 순서를 보여준다 */
  const orderCols = orderClasses.map((oc) => {
    const showOrder = (f.cat === "all" || f.cat === "정석") && matchesCommon(oc, f);
    const linked = rowClasses.filter(
      (r) => r.step === oc.level && (f.cat === "all" || f.cat === r.cat) && matchesStatus(r, f) && matchesDay(r, f) && matchesCommon(r, f),
    );
    return { oc, showOrder, linked };
  });
  const orderCount = orderCols.reduce((n, col) => n + (col.showOrder ? 1 : 0) + col.linked.length, 0);

  /* 수업별 보기 */
  const rowGroups = ROW_CATS.map((rc) => ({
    ...rc,
    items: rowClasses.filter(
      (c) => c.cat === rc.key && (f.cat === "all" || f.cat === rc.key) && matchesStatus(c, f) && matchesDay(c, f) && matchesCommon(c, f),
    ),
  }));
  const rowCount = rowGroups.reduce((n, g) => n + g.items.length, 0);

  const count = view === "level" ? orderCount : rowCount;
  const set = (k: keyof Filters) => (v: string) => setF((prev) => ({ ...prev, [k]: v }));
  const reset = () => setF(EMPTY);

  const scrollToLevel = (level: number) => {
    setView("level");
    requestAnimationFrame(() => {
      document.getElementById(`level-${level}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      setFlashLevel(level);
      setTimeout(() => setFlashLevel(null), 1200);
    });
  };

  const roadmapColumns: RoadmapColumn[] = orderClasses.map((oc, i) => {
    const statusCls = oc.status === "모집중" ? "st-mint" : oc.status === "마감임박" ? "st-amber" : "st-line";
    const statusText = oc.status === "개설예정" ? "개설 예정" : oc.status;
    const linked = rowClasses.filter((r) => r.step === oc.level);
    const meta = oc.type === "upcoming"
      ? `${["월", "화", "수", "목"][i]}요일반 · ${oc.weeks}주 · 레벨${i} 수료 필요`
      : `${oc.day}요일반 · ${oc.weeks}주 · ${i === 0 ? oc.place : `레벨${i} 수료 필요`}`;
    return {
      y: [81, 68, 42, 19][i],
      labelPos: i < 2 ? "top" : "bottom",
      title: STEP_NAMES[i],
      name: `레벨 ${oc.level}`,
      status: { text: statusText, cls: statusCls },
      extraChips: linked.map((r) => ({ label: r.type === "online" ? `${r.name} (온라인)` : r.name, cls: `s${oc.level}` })),
      card: {
        name: `STEP ${oc.level} · ${STEP_NAMES[i]} — ${oc.name}`,
        meta,
        cta: "목록에서 보기",
        onClick: () => scrollToLevel(oc.level!),
      },
    };
  });

  return (
    <>
      <section className="list-head">
        <div className="wrap">
          <h1>클래스</h1>
          <p>지금 열려 있는 클래스와 곧 시작하는 클래스를 한눈에 확인하세요.</p>
          <form className="searchrow" onSubmit={(e) => e.preventDefault()}>
            <input type="text" placeholder="클래스명으로 검색" value={f.q} onChange={(e) => set("q")(e.target.value)} />
            <button type="submit" className="btn btn-mint">검색</button>
          </form>
        </div>
      </section>

      <section id="diagnosis" className="roadmap-section">
        <div className="wrap">
          <GrowthRoadmap
            columns={roadmapColumns}
            description="레벨·특강·온라인강의가 어느 단계에 속하는지 그래프에서 바로 확인하세요. 색이 짙을수록 상위 단계예요."
          />
        </div>
      </section>

      <section className="filterbar">
        <div className="wrap">
          <div className="frow">
            <span className="flabel">상태</span>
            {STATUS_TABS.map((t) => (
              <button key={t.value} type="button" className={`tab${f.status === t.value ? " on" : ""}`} onClick={() => set("status")(t.value)}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="frow selectbar">
            <span className="flabel">필터</span>
            <select aria-label="분류" value={f.cat} onChange={(e) => set("cat")(e.target.value)}>
              <option value="all">분류 전체</option>
              <option value="정석">디자이너의 정석</option>
              <option value="특강">단독 특강</option>
              <option value="세미나">세미나</option>
              <option value="경영">경영·컨설팅</option>
              <option value="온라인">온라인</option>
            </select>
            <select aria-label="분야" value={f.field} onChange={(e) => set("field")(e.target.value)}>
              <option value="all">분야 전체</option>
              <option value="모발과학">모발과학</option>
              <option value="컬러">컬러</option>
              <option value="펌·매직">펌·매직</option>
              <option value="커트">커트</option>
              <option value="경영·마케팅">경영·마케팅</option>
            </select>
            <select aria-label="대상" value={f.target} onChange={(e) => set("target")(e.target.value)}>
              <option value="all">대상 전체</option>
              <option value="입문">입문</option>
              <option value="디자이너">디자이너</option>
              <option value="원장·창업">원장·창업</option>
            </select>
            <select aria-label="요일" value={f.day} onChange={(e) => set("day")(e.target.value)}>
              <option value="all">요일 전체</option>
              {["월", "화", "수", "목", "금", "토"].map((d) => (
                <option key={d} value={d}>{d}요일</option>
              ))}
            </select>
            <select aria-label="수료증" value={f.cert} onChange={(e) => set("cert")(e.target.value)}>
              <option value="all">수료증 전체</option>
              <option value="발급">발급</option>
              <option value="미발급">미발급</option>
            </select>
            <select aria-label="비전공자" value={f.noob} onChange={(e) => set("noob")(e.target.value)}>
              <option value="all">비전공자 전체</option>
              <option value="가능">비전공자 가능</option>
            </select>
            <button type="button" className="reset-link" onClick={reset}>필터 초기화</button>
          </div>
        </div>
      </section>

      <section>
        <div className="wrap">
          <div className="viewtoggle">
            <button type="button" className={`vtab${view === "level" ? " active" : ""}`} onClick={() => setView("level")}>레벨별로 보기</button>
            <button type="button" className={`vtab${view === "class" ? " active" : ""}`} onClick={() => setView("class")}>수업별로 보기</button>
          </div>
          <div className="resultmeta">
            총 <b>{count}</b>개 클래스
          </div>

          {view === "level" && orderCount > 0 && (
            <div className="order-section">
              <div className="order-head">
                <div>
                  <h2>디자이너의 정석 — 레벨 1부터 4까지</h2>
                  <p>레벨 순서대로 이어지는 정규 커리큘럼이에요. 지금 열려 있는 레벨부터 신청할 수 있어요.</p>
                </div>
                <Link href={ROUTES.classDetail("designer-level-1")}>전체 커리큘럼 소개 보기 ›</Link>
              </div>
              <div className="order-track">
                <div className="order-line" />
                <div className="order-row">
                  {orderCols.map(({ oc, showOrder, linked }) =>
                    showOrder || linked.length ? (
                      <div key={oc.id} className="order-col">
                        {showOrder && <OrderCard c={oc} flash={flashLevel === oc.level} />}
                        {linked.length > 0 && (
                          <div className="linked-wrap">
                            {linked.map((r) => (
                              <LinkedCard key={r.id} c={r} />
                            ))}
                          </div>
                        )}
                      </div>
                    ) : null,
                  )}
                </div>
              </div>
            </div>
          )}

          {view === "class" &&
            rowGroups.map((g) =>
              g.items.length ? (
                <div key={g.key} className="row-section">
                  <div className="row-head">
                    <h2>{g.label}</h2>
                    <span>{g.items.length}개</span>
                  </div>
                  <div className="row-scroll">
                    {g.items.map((c) => (
                      <RowCard key={c.id} c={c} />
                    ))}
                  </div>
                </div>
              ) : null,
            )}

          {count === 0 && (
            <div className="empty">
              <p className="big">조건에 맞는 클래스를 찾지 못했어요</p>
              <p>필터를 조정하시거나, 원하는 클래스를 상담으로 문의해보세요.</p>
              <button type="button" className="btn btn-mint" onClick={reset}>필터 초기화하고 전체 보기</button>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
