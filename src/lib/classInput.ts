/*
 * 관리자 클래스 폼 입력 → classes 테이블 컬럼. 브라우저(ClassForm)와 서버(API)가 같은 타입을 쓴다.
 * 폼에 없는 값(분야·대상·수료증 등)은 새 클래스면 분류에 맞춘 기본값, 편집이면 기존 값을 유지한다.
 */
import type { AcademyClass, ClassCategory, ClassType, RoadmapStep, TaxType } from "./types";

export type ClassInput = {
  name: string;
  cat: ClassCategory;
  /** 폼의 운영 유형 (세미나는 분류로 결정) */
  opType: "offline" | "waitlist" | "online";
  step: RoadmapStep | null;
  date: string | null;
  day: string | null;
  time: string | null;
  capacity: number | null;
  place: string | null;
  months: number | null;
  price: number | null;
  taxType: TaxType;
  summary: string;
  checklist: string[];
  prep: string;
  draft: boolean;
};

const CATS: ClassCategory[] = ["정석", "특강", "세미나", "경영", "온라인"];

/** 서버에서 입력 검증 — 통과하면 null */
export function validateClassInput(v: Partial<ClassInput>): string | null {
  if (!v.name?.trim()) return "클래스명을 입력해주세요";
  if (!v.cat || !CATS.includes(v.cat)) return "분류를 골라주세요";
  if (!v.opType || !["offline", "waitlist", "online"].includes(v.opType)) return "운영 유형을 골라주세요";
  if (v.draft) return null; // 임시저장은 이름·분류만 있으면 된다
  if (v.opType === "offline" && !v.date) return "개강일을 입력해주세요";
  if (v.date && !/^\d{4}-\d{2}-\d{2}$/.test(v.date)) return "개강일 형식이 올바르지 않아요";
  if (v.capacity != null && (!Number.isInteger(v.capacity) || v.capacity < 1)) return "정원을 확인해주세요";
  if (v.cat !== "세미나" && !v.price) return "가격을 입력해주세요";
  if ((v.summary ?? "").length > 40) return "한 줄 요약은 40자 이내로 입력해주세요";
  return null;
}

function dbType(v: ClassInput, prev?: AcademyClass): ClassType {
  if (v.opType === "online") return "online";
  if (v.opType === "waitlist") return prev?.type === "upcoming" ? "upcoming" : "waitlist";
  return v.cat === "세미나" ? "seminar" : "offline";
}

export function classColumns(v: ClassInput, prev?: AcademyClass) {
  const type = dbType(v, prev);
  return {
    name: v.name.trim(),
    cat: v.cat,
    type,
    field: prev?.field ?? (v.cat === "경영" || v.cat === "온라인" ? "경영·마케팅" : "모발과학"),
    target: prev?.target ?? (v.cat === "정석" && v.step === 1 ? "입문" : "전체"),
    step: v.step,
    level: v.cat === "정석" ? (v.step ?? prev?.level ?? null) : null,
    date: type === "online" || type === "waitlist" || type === "upcoming" ? null : v.date,
    day: type === "online" ? "상시" : v.day,
    time: type === "online" ? null : v.time,
    capacity: type === "online" ? null : v.capacity,
    place: type === "online" ? "온라인" : v.place,
    months: type === "online" ? v.months : null,
    price: v.price,
    tax_type: v.taxType,
    summary: v.summary.trim(),
    cert: prev?.cert ?? false,
    noob: prev?.noob ?? (v.step === 1),
    draft: v.draft,
    updated_at: new Date().toISOString(),
  };
}

/** 새 클래스 slug — 한글 이름은 URL 에 쓰기 어려워 분류+시각으로 만든다 (나중에 바꿔도 id 는 그대로) */
export function newSlug(cat: ClassCategory): string {
  const prefix: Record<ClassCategory, string> = { 정석: "designer", 특강: "special", 세미나: "seminar", 경영: "biz", 온라인: "online" };
  return `${prefix[cat]}-${Date.now().toString(36)}`;
}

/** 폼에서 비워 둔 항목은 저장하지 않는다 → 고객 화면에는 기본 문구가 나온다 */
export function detailPatch(v: Pick<ClassInput, "checklist" | "prep">, prev: Record<string, unknown> = {}) {
  const next: Record<string, unknown> = { ...prev };
  const list = v.checklist.map((s) => s.trim()).filter(Boolean);
  if (list.length) next.checklist = list;
  else delete next.checklist;
  if (v.prep.trim()) next.prep = v.prep.trim();
  else delete next.prep;
  return next;
}
