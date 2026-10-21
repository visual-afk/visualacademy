"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/common/useToast";
import { ROUTES } from "@/data/site";
import { getClassById } from "@/lib/api";
import { taxBreakdown } from "@/lib/format";
import { stepLabel } from "@/lib/status";
import type { ClassCategory, RoadmapStep, TaxType } from "@/lib/types";

type Tab = "basic" | "content";
type OpType = "offline" | "waitlist" | "online";
type Slot = "thumb" | "banner" | "detail";
type Shape = "square" | "wide" | "tall";
type DetailLen = "short" | "medium" | "long";

/** 업로드 이미지 상태 — 샘플(프리셋) 또는 실제 로컬 파일 미리보기 */
type Img =
  | { kind: "preset"; bg: string; ratio?: string; shape?: Shape }
  | { kind: "file"; url: string; w: number; h: number }
  | null;

const CATS: { key: ClassCategory; label: string }[] = [
  { key: "정석", label: "디자이너의 정석" },
  { key: "특강", label: "단독 특강" },
  { key: "세미나", label: "세미나" },
  { key: "경영", label: "경영·컨설팅" },
  { key: "온라인", label: "온라인" },
];
const TYPES: { key: OpType; label: string }[] = [
  { key: "offline", label: "기수제 (일정 확정)" },
  { key: "waitlist", label: "개설 대기" },
  { key: "online", label: "온라인" },
];
const DAYS = ["월", "화", "수", "목", "금", "토"];

const IMG_COLORS: Record<Shape, string> = {
  square: "linear-gradient(135deg,#a8d9d5,#6fbab5)",
  wide: "linear-gradient(135deg,#dfe6e2,#c8d3cc)",
  tall: "linear-gradient(135deg,#f0c9c2,#dba59b)",
};
const SHAPE_LABEL: Record<Shape, string> = { square: "정사각형", wide: "가로형", tall: "세로형" };
const TARGET_SHAPE: Record<"thumb" | "banner", Shape> = { thumb: "square", banner: "wide" };
const DETAIL_COLORS: Record<DetailLen, string> = {
  short: "linear-gradient(180deg,#a8d9d5,#6fbab5)",
  medium: "linear-gradient(180deg,#dfe6e2 0%,#c8d3cc 50%,#a9b4ae 100%)",
  long: "linear-gradient(180deg,#f0c9c2 0%,#dba59b 33%,#c98d82 66%,#a97169 100%)",
};
/** 숫자가 클수록 세로로 더 긺 — 상세 이미지는 업로드한 길이 그대로 보여준다 */
const DETAIL_RATIO: Record<DetailLen, string> = { short: "3/4", medium: "3/5.5", long: "3/8" };
const DETAIL_LABEL: Record<DetailLen, string> = {
  short: "짧은 샘플 (약 1200×1600)",
  medium: "보통 길이 샘플 (약 1200×2200)",
  long: "긴 샘플 (약 1200×3200, 실제 상세페이지 흔한 길이)",
};

function shapeOf(img: Img): Shape | null {
  if (!img) return null;
  if (img.kind === "preset") return img.shape ?? null;
  const r = img.w / img.h;
  if (Math.abs(r - 1) < 0.05) return "square";
  return r > 1 ? "wide" : "tall";
}
function bannerRatioOk(img: Img) {
  if (!img) return true;
  if (img.kind === "preset") return img.shape === "wide";
  return Math.abs(img.w / img.h - 2) < 0.15;
}
function imgStyle(img: Img): React.CSSProperties {
  if (!img) return {};
  if (img.kind === "preset") return { background: img.bg, ...(img.ratio ? { aspectRatio: img.ratio } : {}) };
  return { backgroundImage: `url(${img.url})`, backgroundSize: "cover", backgroundPosition: "center" };
}

/**
 * 클래스 등록·편집 폼. 프로토타입(10.14)에서 기본 정보와 콘텐츠 관리가 별도 화면으로 분리돼
 * mode 로 두 화면을 나눠 렌더한다 — basic: /admin/classes/new, /admin/classes/[id]/edit · content: /admin/classes/[id]/content
 */
export default function ClassForm({ mode, classId }: { mode: Tab; classId?: number }) {
  const router = useRouter();
  const src = classId ? getClassById(classId) : undefined;
  const { toast, showToast } = useToast();
  const tab = mode;
  /* ── 기본 정보 ── */
  const [name, setName] = useState(src?.name ?? "");
  const [cat, setCat] = useState<ClassCategory>(src?.cat ?? "정석");
  const [type, setType] = useState<OpType>(
    !src ? "offline" : src.type === "online" ? "online" : src.type === "waitlist" || src.type === "upcoming" ? "waitlist" : "offline",
  );
  const [step, setStep] = useState<RoadmapStep | null>(src?.step ?? null);
  const [date, setDate] = useState(src?.date ?? "");
  const [day, setDay] = useState(src?.day && DAYS.includes(src.day) ? src.day : "월");
  const [timeFrom, setTimeFrom] = useState(src?.time?.split("~")[0] ?? "13:00");
  const [timeTo, setTimeTo] = useState(src?.time?.split("~")[1] ?? "18:00");
  const [capacity, setCapacity] = useState(src?.capacity ?? 8);
  const [place, setPlace] = useState(src?.place && src.type !== "seminar" ? src.place : "강남 본원");
  const [seminarPlace, setSeminarPlace] = useState(src?.type === "seminar" ? src.place ?? "" : "코엑스 컨퍼런스룸 B");
  const [months, setMonths] = useState(src?.months ?? 9);
  const [price, setPrice] = useState(src?.price != null ? src.price.toLocaleString("ko-KR") : "");
  const [taxType, setTaxType] = useState<TaxType>(src?.taxType ?? "taxable");
  const [summary, setSummary] = useState(src?.summary ?? "");
  const [forWhom, setForWhom] = useState(src?.detail?.checklist.join("\n") ?? "");
  const [prep, setPrep] = useState(src?.detail?.prep ?? "");
  const [savedAt, setSavedAt] = useState<string | null>(null);

  /* ── 콘텐츠 관리 ── */
  const [images, setImages] = useState<Record<Slot, Img>>(() =>
    src
      ? {
          thumb: { kind: "preset", bg: IMG_COLORS.square, shape: "square" },
          banner: { kind: "preset", bg: IMG_COLORS.wide, shape: "wide" },
          detail: { kind: "preset", bg: DETAIL_COLORS.long, ratio: DETAIL_RATIO.long },
        }
      : { thumb: null, banner: null, detail: null },
  );
  const [device, setDevice] = useState<"pc" | "mobile">("pc");
  const [guide, setGuide] = useState(false);
  const [ctx, setCtx] = useState<{ slot: Slot; x: number; y: number } | null>(null);
  const fileInputs = { thumb: useRef<HTMLInputElement>(null), banner: useRef<HTMLInputElement>(null), detail: useRef<HTMLInputElement>(null) };
  const objectUrls = useRef<string[]>([]);

  useEffect(() => {
    const urls = objectUrls.current;
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, []);
  useEffect(() => {
    if (!ctx) return;
    const close = (e: Event) => {
      if (!(e.target as HTMLElement).closest?.(".img-ctx")) setCtx(null);
    };
    const onScroll = () => setCtx(null);
    document.addEventListener("click", close);
    document.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("scroll", onScroll, true);
    };
  }, [ctx]);

  const isSeminar = cat === "세미나";
  const isOnline = type === "online";
  const priceNum = parseInt(price.replace(/[^0-9]/g, "") || "0", 10);
  const tax = taxBreakdown(priceNum, taxType);

  const changeCat = (c: ClassCategory) => {
    setCat(c);
    if (c === "온라인") setType("online");
    else if (type === "online") setType("offline");
  };

  const setPreset = (slot: "thumb" | "banner", shape: Shape) =>
    setImages((im) => ({ ...im, [slot]: { kind: "preset", bg: IMG_COLORS[shape], shape } }));
  const setDetailPreset = (len: DetailLen) =>
    setImages((im) => ({ ...im, detail: { kind: "preset", bg: DETAIL_COLORS[len], ratio: DETAIL_RATIO[len] } }));
  const removeImage = (slot: Slot) => setImages((im) => ({ ...im, [slot]: null }));

  /* 실제 로컬 파일 선택 — 서버 업로드는 백엔드 연동 후(POST /api/admin/uploads), 지금은 브라우저 미리보기만 */
  const loadFile = (slot: Slot, file: File | undefined) => {
    if (!file || !file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    objectUrls.current.push(url);
    const img = new Image();
    img.onload = () => setImages((im) => ({ ...im, [slot]: { kind: "file", url, w: img.naturalWidth, h: img.naturalHeight } }));
    img.src = url;
  };

  const openCtx = (e: React.MouseEvent, slot: Slot) => {
    e.preventDefault();
    if (!images[slot]) return; // 업로드된 이미지가 있을 때만 우클릭 메뉴 제공
    setCtx({ slot, x: Math.min(e.clientX, window.innerWidth - 240), y: Math.min(e.clientY, window.innerHeight - 300) });
  };

  const validate = () => {
    if (!name.trim()) return "클래스명을 입력해주세요";
    if (type === "offline" && !date) return "개강일을 입력해주세요";
    if (isSeminar && !seminarPlace.trim()) return "세미나 장소를 입력해주세요";
    if (!priceNum && !isSeminar) return "가격을 입력해주세요";
    return null;
  };
  const save = () => {
    const err = mode === "basic" ? validate() : null;
    if (err) {
      showToast(err);
      return;
    }
    // 백엔드 연동 시: classId ? PUT /api/admin/classes/:id : POST /api/admin/classes
    showToast("저장했어요 · 사이트에 바로 반영돼요");
  };
  const tempSave = () => {
    const d = new Date();
    setSavedAt(`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`);
    showToast("임시저장했어요");
  };

  const fileInput = (slot: Slot) => (
    <input ref={fileInputs[slot]} type="file" accept="image/*" hidden onChange={(e) => { loadFile(slot, e.target.files?.[0]); e.target.value = ""; }} />
  );
  const dropzone = (slot: Slot) => (
    <button
      type="button"
      className="dropzone"
      onClick={() => fileInputs[slot].current?.click()}
      onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("drag"); }}
      onDragLeave={(e) => e.currentTarget.classList.remove("drag")}
      onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove("drag"); loadFile(slot, e.dataTransfer.files[0]); }}
    >
      클릭하거나 이미지를 끌어다 놓아 업로드
    </button>
  );

  const thumbWarn = images.thumb && shapeOf(images.thumb) !== TARGET_SHAPE.thumb;
  const bannerWarn = images.banner && !bannerRatioOk(images.banner);
  const detailImg = images.detail;
  const detailStyle: React.CSSProperties =
    detailImg?.kind === "file" ? { ...imgStyle(detailImg), aspectRatio: `${detailImg.w}/${detailImg.h}` } : imgStyle(detailImg);
  const displayName = name || "클래스명";
  const displayPrice = isSeminar && !priceNum ? "무료" : `${priceNum.toLocaleString("ko-KR")}원`;

  return (
    <>
      <div className="subbar">
        <div className="subbar-inner">
          <p className="crumb">
            <Link href={ROUTES.admin}>클래스 관리</Link> /{" "}
            <b>{src ? (mode === "content" ? `${src.name} · 콘텐츠 관리` : `${src.name} 편집`) : "새 클래스 등록"}</b>
          </p>
          {savedAt && <span className="draft">임시저장됨 {savedAt}</span>}
        </div>
      </div>

      <div className="form-wrap">
        {mode === "basic" ? (
          <div className="page-head">
            <h1>클래스 기본 정보 입력</h1>
            <p>정원과 개강일만 정확히 입력하면 사이트 노출 상태는 자동으로 관리돼요.</p>
          </div>
        ) : (
          <div className="page-head">
            <h1>클래스 콘텐츠 관리</h1>
            <p>카드 썸네일, 상단 배너, 상세페이지 본문 이미지를 올리고 실제 화면 미리보기로 확인해요.</p>
          </div>
        )}

        {tab === "basic" && (
          <div>
            <div className="card">
              <h2>분류</h2>
              <p className="desc">분류를 먼저 고르면 그에 맞는 입력 칸만 아래 나타나요.</p>
              <div className="field">
                <label htmlFor="cf-name">클래스명 <span className="req">*</span></label>
                <input id="cf-name" type="text" value={name} placeholder="예) 디자이너의 정석 레벨 2" onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="field">
                <span className="lbl">분류 <span className="req">*</span></span>
                <div className="seg cat">
                  {CATS.map((c) => (
                    <button key={c.key} type="button" className={cat === c.key ? "on" : undefined} onClick={() => changeCat(c.key)}>{c.label}</button>
                  ))}
                </div>
              </div>
              <div className="field">
                <span className="lbl">운영 유형 <span className="req">*</span></span>
                <div className="seg">
                  {TYPES.map((t) => (
                    <button key={t.key} type="button" className={type === t.key ? "on" : undefined} onClick={() => setType(t.key)}>{t.label}</button>
                  ))}
                </div>
              </div>
            </div>

            <div className="condbox mint">
              <p className="cb-label">메인 페이지 성장 로드맵 연결</p>
              <div className="field" style={{ marginBottom: 12 }}>
                <span className="lbl">이 강의가 속하는 단계</span>
                <div className="seg">
                  <button type="button" className={step === null ? "on" : undefined} onClick={() => setStep(null)}>해당 없음</button>
                  {([1, 2, 3, 4] as RoadmapStep[]).map((s) => (
                    <button key={s} type="button" className={step === s ? "on" : undefined} onClick={() => setStep(s)}>{stepLabel(s)}</button>
                  ))}
                </div>
              </div>
              {step ? (
                <p className="cb-note small">
                  ✓ 저장하면 메인 페이지 로드맵 <b>{stepLabel(step)}</b> 단계 카드에 이 강의가 자동으로 추가돼요. 레벨 교육이면 메인 강의로, 그 외 강의면 아래 &ldquo;함께 듣는 강의&rdquo; 칩으로 붙어요.
                </p>
              ) : (
                <p className="hint" style={{ margin: 0 }}>체계적 성장 코스에 해당하지 않는 단독 강의(세미나 등)는 &ldquo;해당 없음&rdquo;으로 두면 로드맵에는 안 뜨고 클래스 목록에만 노출돼요.</p>
              )}
            </div>

            {!isOnline && (
              <div className="card">
                <h2>일정 · 정원</h2>
                <p className="desc">이 두 값이 사이트의 모집중·마감 배지를 자동으로 결정해요.</p>
                <div className="row2">
                  {type !== "waitlist" && (
                    <div className="field">
                      <label htmlFor="cf-date">개강일 <span className="req">*</span></label>
                      <input id="cf-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                    </div>
                  )}
                  <div className="field">
                    <label htmlFor="cf-day">요일 <span className="req">*</span></label>
                    <select id="cf-day" value={day} onChange={(e) => setDay(e.target.value)}>
                      {DAYS.map((d) => <option key={d} value={d}>{d}요일</option>)}
                    </select>
                  </div>
                </div>
                <div className="row2">
                  <div className="field">
                    <span className="lbl">수업 시간 <span className="req">*</span></span>
                    <div className="time-range">
                      <input type="time" aria-label="시작 시간" value={timeFrom} onChange={(e) => setTimeFrom(e.target.value)} />
                      <span>~</span>
                      <input type="time" aria-label="종료 시간" value={timeTo} onChange={(e) => setTimeTo(e.target.value)} />
                    </div>
                  </div>
                  <div className="field">
                    <span className="lbl">정원 <span className="req">*</span></span>
                    <div className="stepper-inline">
                      <button type="button" aria-label="정원 줄이기" onClick={() => setCapacity((v) => Math.max(1, v - 1))}>−</button>
                      <span className="val">{capacity}</span>
                      <button type="button" aria-label="정원 늘리기" onClick={() => setCapacity((v) => v + 1)}>+</button>
                      <span className="hint" style={{ margin: 0 }}>명</span>
                    </div>
                  </div>
                </div>
                {!isSeminar && (
                  <div className="field">
                    <label htmlFor="cf-place">장소 <span className="req">*</span></label>
                    <select id="cf-place" value={place} onChange={(e) => setPlace(e.target.value)}>
                      <option>강남 본원</option>
                      <option>비주얼살롱 서면전포점</option>
                    </select>
                  </div>
                )}
              </div>
            )}

            {isSeminar && (
              <div className="condbox">
                <p className="cb-label">세미나 전용 입력</p>
                <div className="field">
                  <label htmlFor="cf-splace">장소 <span className="req">*</span></label>
                  <input id="cf-splace" type="text" value={seminarPlace} placeholder="예) 코엑스 컨퍼런스룸 B" onChange={(e) => setSeminarPlace(e.target.value)} />
                  <div className="chiprow">
                    <span className="hint" style={{ margin: 0 }}>최근 사용한 장소</span>
                    {["코엑스 컨퍼런스룸 B", "강남 aT센터 3층"].map((p) => (
                      <button key={p} type="button" className="chip-suggest" onClick={() => setSeminarPlace(p)}>{p}</button>
                    ))}
                  </div>
                </div>
                <div className="field">
                  <span className="lbl">대표 이미지 (배너)</span>
                  {classId ? (
                    <Link className="upload" href={ROUTES.adminClassContent(classId)}>콘텐츠 관리에서 업로드 · 권장 1600×800px</Link>
                  ) : (
                    <p className="hint" style={{ margin: 0 }}>저장한 뒤 대시보드의 &lsquo;콘텐츠 관리&rsquo;에서 업로드해요 · 권장 1600×800px</p>
                  )}
                </div>
              </div>
            )}

            {type === "waitlist" && (
              <div className="condbox">
                <p className="cb-label">개설 대기 안내</p>
                <p className="cb-note">개강일 없이 등록돼요. 신청자는 &ldquo;개설 알림 신청&rdquo; 버튼을 누르고, 인원이 쌓이면 대시보드에서 확인할 수 있어요. 일정이 정해지면 운영유형을 &lsquo;기수제&rsquo;로 바꿔주세요.</p>
              </div>
            )}

            {isOnline && (
              <div className="condbox">
                <p className="cb-label">온라인 강의 전용 입력</p>
                <div className="field">
                  <label htmlFor="cf-months">수강 기간 <span className="req">*</span></label>
                  <div className="months">
                    <input id="cf-months" type="number" min={1} value={months} onChange={(e) => setMonths(Number(e.target.value))} />
                    <span className="hint" style={{ margin: 0, whiteSpace: "nowrap" }}>개월</span>
                  </div>
                </div>
              </div>
            )}

            <div className="card">
              <h2>가격 · 소개</h2>
              <div className="field">
                <label htmlFor="cf-price">가격 <span className="req">*</span></label>
                <input
                  id="cf-price"
                  type="text"
                  inputMode="numeric"
                  value={price}
                  placeholder="예) 1,200,000"
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9]/g, "");
                    setPrice(raw ? parseInt(raw, 10).toLocaleString("ko-KR") : "");
                  }}
                />
                <p className="hint">숫자만 입력하면 자동으로 &ldquo;원&rdquo;이 붙어요. 입력한 가격은 소비자가 결제하는 최종 금액(과세 시 부가세 포함가) 기준이에요.</p>
              </div>
              <div className="field">
                <span className="lbl">과세 구분 <span className="req">*</span></span>
                <div className="seg">
                  <button type="button" className={taxType === "taxable" ? "on" : undefined} onClick={() => setTaxType("taxable")}>과세 (부가세 별도)</button>
                  <button type="button" className={taxType === "exempt" ? "on" : undefined} onClick={() => setTaxType("exempt")}>면세</button>
                </div>
                {priceNum > 0 && (
                  <p className="hint" style={{ marginTop: 9 }}>
                    {taxType === "taxable" ? (
                      <>공급가액 {tax.supply.toLocaleString()}원 + 부가세 {tax.vat.toLocaleString()}원 = <b style={{ color: "var(--ink)" }}>{priceNum.toLocaleString()}원</b> · 결제·영수증에 부가세가 표시돼요.</>
                    ) : (
                      <>부가세 없음 · <b style={{ color: "var(--ink)" }}>{priceNum.toLocaleString()}원</b> 전액 면세로 처리돼요. (면세 대상 교육 서비스인지 먼저 확인해주세요)</>
                    )}
                  </p>
                )}
              </div>
              <div className="field">
                <div className="charcount">
                  <label htmlFor="cf-summary">한 줄 요약</label>
                  <span className="cc-n">{summary.length}/40</span>
                </div>
                <textarea id="cf-summary" maxLength={40} style={{ minHeight: 44 }} value={summary} onChange={(e) => setSummary(e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {tab === "content" && (
          <div className="split">
            <div>
              <div className="card">
                <h2>이미지</h2>
                <p className="desc">업로드하면 오른쪽 미리보기에 바로 반영돼요. 실제 사이트에 노출하려면 하단 저장하기를 눌러주세요.</p>

                <div className="upload-block">
                  <div className="upload-block-head">
                    <h3>썸네일 (목록 카드용)</h3>
                    <span className="ratio-hint"><span className="ratio-box" style={{ width: 14, height: 14 }} />정사각형 · 800×800px</span>
                  </div>
                  {fileInput("thumb")}
                  {dropzone("thumb")}
                  <div className="preset-row">
                    {(["square", "wide", "tall"] as Shape[]).map((s) => (
                      <button key={s} type="button" className="preset-btn" onClick={() => setPreset("thumb", s)}>{SHAPE_LABEL[s]} 샘플</button>
                    ))}
                  </div>
                  {thumbWarn && <div className="warn-msg">⚠️ 정사각형이 아니에요. 카드에서 위·아래(또는 좌·우)가 잘려 보일 수 있어요.</div>}
                </div>

                <div className="upload-block">
                  <div className="upload-block-head">
                    <h3>대표 배너 (상세페이지 상단)</h3>
                    <span className="ratio-hint"><span className="ratio-box" style={{ width: 20, height: 11 }} />가로형 · 1600×800px</span>
                  </div>
                  {fileInput("banner")}
                  {dropzone("banner")}
                  <div className="preset-row">
                    {(["wide", "square", "tall"] as Shape[]).map((s) => (
                      <button key={s} type="button" className="preset-btn" onClick={() => setPreset("banner", s)}>{SHAPE_LABEL[s]} 샘플</button>
                    ))}
                  </div>
                  {bannerWarn && <div className="warn-msg">⚠️ 권장 비율(2:1)과 달라요. 클래스명 텍스트가 겹치는 부분이 잘릴 수 있어요. 오른쪽 가이드선을 확인해보세요.</div>}
                </div>
              </div>

              <div className="card">
                <h2>상세페이지 본문</h2>
                <div className="upload-block">
                  <div className="upload-block-head">
                    <h3>상세 이미지 (본문용)</h3>
                    <span className="ratio-hint"><span className="ratio-box" style={{ width: 10, height: 22 }} />세로형 · 가로 1200px · 길이 제한 없음</span>
                  </div>
                  <p className="desc" style={{ margin: "-4px 0 11px" }}>보통 매우 긴 세로 이미지예요. 업로드한 길이 그대로 상세페이지에 노출돼요 — 미리보기도 잘리지 않고 끝까지 보여드려요.</p>
                  {fileInput("detail")}
                  {dropzone("detail")}
                  <div className="preset-row">
                    {(["short", "medium", "long"] as DetailLen[]).map((l) => (
                      <button key={l} type="button" className="preset-btn" onClick={() => setDetailPreset(l)}>{{ short: "짧은", medium: "보통 길이", long: "긴" }[l]} 샘플</button>
                    ))}
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="cf-whom">이런 분께 필요합니다</label>
                  <textarea id="cf-whom" placeholder={"예) 컬러 시술 후 결과가 매번 다른 분\n손상모 진단이 어려운 분"} value={forWhom} onChange={(e) => setForWhom(e.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="cf-prep">준비물 · 유의사항</label>
                  <textarea id="cf-prep" placeholder="예) 가위, 클립, 필기구" value={prep} onChange={(e) => setPrep(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="preview-panel">
              <div className="preview-head">
                <div className="dev-tabs">
                  <button type="button" className={`dev-tab${device === "pc" ? " on" : ""}`} onClick={() => setDevice("pc")}>PC</button>
                  <button type="button" className={`dev-tab${device === "mobile" ? " on" : ""}`} onClick={() => setDevice("mobile")}>모바일</button>
                </div>
                <label className="guide-toggle"><input type="checkbox" checked={guide} onChange={(e) => setGuide(e.target.checked)} />가이드선 보기</label>
              </div>

              <div className="preview-stage">
                <div className="pv-thumb-wrap">
                  <p className="pv-label">목록 카드 미리보기</p>
                  <div className="pv-card">
                    <div className={`pv-img pv-thumb-img${images.thumb ? " has-img" : ""}`} style={imgStyle(images.thumb)} onContextMenu={(e) => openCtx(e, "thumb")}>
                      {!images.thumb && <span>썸네일 없음</span>}
                      {guide && <div className="safezone" style={{ inset: "6%" }}><span className="sz-label">카드 노출 영역</span></div>}
                    </div>
                    <div className="pv-card-body">
                      <p className="t">{displayName}</p>
                      <p className="p">{displayPrice}</p>
                    </div>
                  </div>
                </div>

                <div className={device === "mobile" ? "mobile" : undefined}>
                  <p className="pv-label">상세페이지 상단 미리보기</p>
                  <div className={`pv-img pv-banner-img${images.banner ? " has-img" : ""}`} style={imgStyle(images.banner)} onContextMenu={(e) => openCtx(e, "banner")}>
                    {!images.banner && <span>배너 없음</span>}
                    {guide && (
                      <div className="safezone" style={device === "mobile" ? { left: "6%", right: "6%", bottom: "6%", height: "30%" } : { left: "4%", right: "35%", bottom: "8%", height: "38%" }}>
                        <span className="sz-label">텍스트 겹치는 영역</span>
                      </div>
                    )}
                    <div className="pv-banner-title">{displayName}</div>
                  </div>
                </div>

                {detailImg && (
                  <div className="pv-detail-wrap">
                    <p className="pv-label">상세페이지 본문 미리보기 <span className="pv-label-sub">(실제 업로드 길이 그대로 · 잘리지 않아요)</span></p>
                    <div className="pv-img pv-detail-img has-img" style={detailStyle} onContextMenu={(e) => openCtx(e, "detail")} />
                  </div>
                )}
              </div>
              <p className="hint" style={{ marginTop: 12 }}>미리보기는 실시간 반영이고, 실제 사이트 노출은 저장하기를 눌러야 적용돼요. 이미지를 우클릭하면 바로 교체할 수 있어요.</p>
            </div>
          </div>
        )}
      </div>

      {ctx && (
        <div className="img-ctx" style={{ left: ctx.x, top: ctx.y }} role="menu">
          <p className="ctx-label">{{ thumb: "썸네일", banner: "대표 배너", detail: "상세 이미지" }[ctx.slot]} 교체</p>
          {ctx.slot === "detail"
            ? (["short", "medium", "long"] as DetailLen[]).map((l) => (
                <button key={l} type="button" role="menuitem" onClick={() => { setDetailPreset(l); setCtx(null); showToast("상세 이미지를 교체했어요"); }}>
                  <span className="ctx-swatch" style={{ background: DETAIL_COLORS[l] }} />{DETAIL_LABEL[l]}
                </button>
              ))
            : (["square", "wide", "tall"] as Shape[]).map((s) => (
                <button key={s} type="button" role="menuitem" onClick={() => { setPreset(ctx.slot as "thumb" | "banner", s); setCtx(null); showToast("이미지를 교체했어요"); }}>
                  <span className="ctx-swatch" style={{ background: IMG_COLORS[s] }} />{SHAPE_LABEL[s]} 샘플로 교체
                </button>
              ))}
          <hr />
          <button type="button" role="menuitem" onClick={() => { fileInputs[ctx.slot].current?.click(); setCtx(null); }}>내 PC에서 파일 선택…</button>
          <button type="button" role="menuitem" className="danger" onClick={() => { removeImage(ctx.slot); setCtx(null); showToast("이미지를 삭제했어요"); }}>이미지 삭제</button>
        </div>
      )}

      <div className="footerbar">
        <div className="footerbar-inner">
          <div className="btn-group">
            <button type="button" className="btn btn-ghost" onClick={tempSave}>임시저장</button>
            {mode === "content" && src && (
              <Link className="btn btn-outline" href={ROUTES.classDetail(src.slug)} target="_blank">미리보기 ↗</Link>
            )}
          </div>
          <div className="btn-group">
            <button type="button" className="btn btn-ghost" onClick={() => router.push(ROUTES.admin)}>취소</button>
            <button type="button" className="btn btn-mint" onClick={save}>저장하기</button>
          </div>
        </div>
      </div>
      {toast}
    </>
  );
}
