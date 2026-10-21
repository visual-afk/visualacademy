import { dday } from "./format";
import type { AcademyClass, ClassStatus, RoadmapStep } from "./types";

export const STEP_NAMES = ["초보", "중급", "고급", "오토사장"] as const;

export function stepLabel(step: RoadmapStep): string {
  return `STEP ${step} · ${STEP_NAMES[step - 1]}`;
}

export const CATEGORY_LABELS: Record<string, string> = {
  정석: "디자이너의 정석",
  특강: "단독 특강",
  세미나: "세미나",
  경영: "경영·컨설팅",
  온라인: "온라인",
};

/**
 * 정원·개강일만으로 상태 배지를 자동 결정한다 (관리자가 상태를 직접 고르지 않음).
 * 마감임박 기준: 소규모는 잔여 2석 이하, 정원 50명 초과(세미나)는 잔여 10% 이하.
 */
export function computeStatus(c: AcademyClass): ClassStatus {
  if (c.manualEnd) return "종료";
  if (c.type === "upcoming") return "개설예정";
  if (c.type === "online") return "온라인상시";
  if (c.type === "waitlist") return "개설대기";
  if (!c.date || c.capacity == null || c.applied == null) return "모집중";
  if (dday(c.date) < 0) return "종료";
  if (c.applied >= c.capacity) return "마감";
  const ratio = (c.capacity - c.applied) / c.capacity;
  const threshold = c.capacity > 50 ? 0.1 : 2 / c.capacity;
  if (ratio <= threshold) return "마감임박";
  return "모집중";
}

export function badgeClass(status: ClassStatus): string {
  if (status === "모집중" || status === "온라인상시") return "badge-mint";
  if (status === "마감임박") return "badge-amber";
  if (status === "마감") return "badge-red";
  if (status === "종료") return "badge-ended";
  return "badge-line";
}

/** 상태별 신청 버튼 문구 */
export function ctaLabel(c: AcademyClass, status: ClassStatus): string {
  if (status === "종료") return "모집 종료";
  if (status === "마감") return "모집 마감";
  if (c.type === "online") return "바로 수강 신청";
  if (c.type === "waitlist" || c.type === "upcoming") return "개설 알림 신청";
  return "신청하기";
}
