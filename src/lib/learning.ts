import { daysLeft } from "./expiry";

/*
 * 수강생 학습 상태 — 관리자 수강생 화면 배지와 매일 09:00 알림(api/cron/notify)이 같은 규칙을 쓴다.
 * 안 본 날 = 마지막 시청(없으면 수강 시작)부터. 기한 임박 저진도 = 만료 30일 안 진도 50% 미만 · 7일 안 80% 미만.
 */

export type Learning = "done" | "expired" | "behind" | "risk" | "warn" | "ok";
export type LearnerInput = { expiresAt: string | null; lastWatchedAt: string | null; startedAt: string; progress: number; completedAt: string | null };

/** 무활동 알림 단계 (안 본 날 수) */
export const IDLE_STAGES = [3, 7, 14] as const;
/** 기한 임박 저진도 — 만료까지 남은 날 이하이고 진도가 이 % 미만이면 */
export const BEHIND_STAGES = [
  { days: 30, below: 50 },
  { days: 7, below: 80 },
] as const;

export const LEARNING_LABEL: Record<Learning, string> = {
  done: "완강",
  expired: "만료",
  behind: "기한 임박 · 진도 낮음",
  risk: "이탈 위험",
  warn: "주의",
  ok: "잘 듣는 중",
};

/** 마지막으로 들어온 뒤 지난 날 (KST 날짜 기준) */
export const idleDays = (s: Pick<LearnerInput, "lastWatchedAt" | "startedAt">, now = new Date()) => -(daysLeft(s.lastWatchedAt ?? s.startedAt, now) ?? 0);

/** 지금 해당하는 저진도 단계 (가장 급한 것) — 없으면 null */
export function behindStage(s: LearnerInput, now = new Date()) {
  const left = daysLeft(s.expiresAt, now);
  if (left === null || left < 0) return null;
  return [...BEHIND_STAGES].reverse().find((b) => left <= b.days && s.progress < b.below) ?? null;
}

/** 지금 해당하는 무활동 단계 (가장 긴 것) — 없으면 null */
export function idleStage(s: LearnerInput, now = new Date()) {
  const d = idleDays(s, now);
  return [...IDLE_STAGES].reverse().find((n) => d >= n) ?? null;
}

export function learningStatus(s: LearnerInput, now = new Date()): Learning {
  if (s.completedAt || s.progress >= 100) return "done";
  if (s.expiresAt && new Date(s.expiresAt) <= now) return "expired";
  if (behindStage(s, now)) return "behind";
  const d = idleDays(s, now);
  if (d >= 14) return "risk";
  if (d >= 7) return "warn";
  return "ok";
}
