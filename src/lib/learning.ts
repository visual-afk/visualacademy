import { daysLeft } from "./expiry";

/*
 * 수강생 학습 상태 — 관리자 수강생 화면 배지와 매일 09:00 알림(api/cron/notify)이 같은 규칙을 쓴다.
 * 안 본 날 = 마지막 시청(없으면 수강 시작)부터. 기한 임박 저진도 = 만료 30일 안 진도 50% 미만 · 7일 안 80% 미만.
 */

export type Learning = "done" | "expired" | "behind" | "risk" | "warn" | "ok";
export type LearnerInput = { expiresAt: string | null; lastWatchedAt: string | null; startedAt: string; progress: number; completedAt: string | null };

/** 무활동 알림 단계 (마지막 시청 후 안 본 날 수) */
export const IDLE_STAGES = [3, 7, 14] as const;
/** 결제하고 한 번도 안 튼 사람 — 수강 시작 후 날 수 */
export const START_STAGES = [1, 3, 7] as const;
/** 영상은 다 봤는데 워크시트를 안 낸 사람 — 마지막 시청 후 날 수 */
export const WS_PENDING_STAGES = [2, 7] as const;
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

const stageOf = (stages: readonly number[], d: number) => [...stages].reverse().find((n) => d >= n) ?? null;

/** 지금 해당하는 무활동 단계 (가장 긴 것) — 한 번도 안 튼 사람은 시작 안내(startStage)가 맡는다 */
export function idleStage(s: LearnerInput, now = new Date()) {
  return s.lastWatchedAt ? stageOf(IDLE_STAGES, idleDays(s, now)) : null;
}

/** 결제 후 아직 한 번도 안 튼 사람의 시작 안내 단계 */
export function startStage(s: LearnerInput, now = new Date()) {
  return s.lastWatchedAt ? null : stageOf(START_STAGES, idleDays(s, now));
}

/** 워크시트만 남은 사람의 안내 단계 (영상을 다 본 강의의 워크시트를 안 냈을 때) */
export const wsPendingStage = (s: LearnerInput, now = new Date()) => (s.lastWatchedAt ? stageOf(WS_PENDING_STAGES, idleDays(s, now)) : null);

export function learningStatus(s: LearnerInput, now = new Date()): Learning {
  if (s.completedAt || s.progress >= 100) return "done";
  if (s.expiresAt && new Date(s.expiresAt) <= now) return "expired";
  if (behindStage(s, now)) return "behind";
  const d = idleDays(s, now);
  if (d >= 14) return "risk";
  if (d >= 7) return "warn";
  return "ok";
}
