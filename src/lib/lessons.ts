/*
 * 온라인 강의 진도 규칙 — 서버(lib/vod.ts)와 플레이어가 같은 규칙을 쓴다.
 * reach = 건너뛰지 않고 실제로 재생해서 도달한 위치. 완료는 reach 가 영상 길이의 90% 를 넘었을 때.
 * 순서 잠금: 앞 강의를 완료해야 다음 강의가 열린다 (unlockAll 이면 전부 열림).
 */

export type LessonState = { sec: number; dur: number; done: boolean; reach?: number; at?: number };
export type LessonProgress = Record<string, LessonState>;

/** 끝까지 안 봐도 이만큼 보면 수강 완료로 친다 */
export const DONE_RATIO = 0.9;
/** 플레이어가 위치를 저장하는 간격 (초) */
export const SAVE_EVERY_SEC = 15;
/** 재생 속도 최대 배속 — 저장 사이에 reach 가 늘 수 있는 한도 계산에 쓴다 */
const MAX_RATE = 2;
/** 네트워크 지연·버퍼링 여유 (초) */
const SLACK_SEC = 30;

/** 예전(0008 전) 기록엔 reach 가 없다 — 완료면 끝까지, 아니면 마지막 위치까지 본 것으로 친다 */
export const reachOf = (p: LessonState | undefined) => (p ? (p.reach ?? (p.done ? p.dur : p.sec)) : 0);

/** 저장 요청이 왔을 때 새 reach — 지난 저장 이후 흐른 시간만큼만 늘 수 있다 (주소창으로 sec 를 조작해도 못 건너뛴다) */
export function nextReach(prev: LessonState | undefined, sec: number, now: number): number {
  const r = reachOf(prev);
  const elapsed = prev?.at ? Math.max(0, (now - prev.at) / 1000) : SAVE_EVERY_SEC;
  return Math.max(r, Math.min(sec, r + elapsed * MAX_RATE + SLACK_SEC));
}

export const isDone = (p: LessonState | undefined) => Boolean(p?.done);

/** 열린 강의 id — 이미 완료한 강의(다시보기)와, 앞 강의를 모두 완료한 강의 */
export function unlockedIds(videoIds: string[], progress: LessonProgress, unlockAll: boolean): Set<string> {
  if (unlockAll) return new Set(videoIds);
  const open = new Set<string>();
  let prevAllDone = true;
  for (const id of videoIds) {
    if (prevAllDone || isDone(progress[id])) open.add(id);
    prevAllDone &&= isDone(progress[id]);
  }
  return open;
}
