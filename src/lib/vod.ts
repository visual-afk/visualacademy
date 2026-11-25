import "server-only";
import { coursePct, DONE_RATIO, nextReach, unlockedIds, type LessonProgress } from "./lessons";
import { getAdminSupabase } from "./supabase/admin";
import { cleanEmail, ensure2000User, getWsStates, twokplanConfigured, wsKey, type WsLink, type WsState } from "./twokplan";

/*
 * 온라인 강의 (Vimeo 비공개 영상). 영상 주소는 수강권한·기한을 서버에서 확인한 뒤에만 내려준다.
 * Vimeo 쪽에서는 영상마다 "임베드 허용 도메인"을 아카데미 도메인으로 제한해 둔다.
 */

/** ws = 이 강의 뒤에 붙는 기존 워크시트 (2000플랜 파트·강 / 오토사장반 파트) */
export type ClassVideo = { id: string; title: string; vimeoId: string; vimeoHash: string | null; durationSec: number | null; ws: WsLink | null };
export type { LessonProgress } from "./lessons";
/** 잠긴 강의는 영상 주소를 빼고 내려준다 */
export type CourseVideo = ClassVideo & { locked: boolean };

/** vimeo.com/123 · vimeo.com/123/abcdef · player.vimeo.com/video/123?h=abcdef · 123 → { id, hash } */
export function parseVimeo(input: string): { id: string; hash: string | null } | null {
  const s = input.trim();
  if (/^\d{5,12}$/.test(s)) return { id: s, hash: null };
  let u: URL;
  try {
    u = new URL(/^https?:\/\//.test(s) ? s : `https://${s}`);
  } catch {
    return null;
  }
  if (!/(^|\.)vimeo\.com$/.test(u.hostname)) return null;
  const parts = u.pathname.split("/").filter(Boolean);
  const i = parts.findIndex((p) => /^\d{5,12}$/.test(p));
  if (i < 0) return null;
  const hash = u.searchParams.get("h") ?? (parts[i + 1] && /^[0-9a-f]{6,20}$/i.test(parts[i + 1]) ? parts[i + 1] : null);
  return { id: parts[i], hash };
}

export async function getClassVideos(classId: number): Promise<ClassVideo[]> {
  const { data, error } = await getAdminSupabase()
    .from("class_videos")
    .select("id, title, vimeo_id, vimeo_hash, duration_sec, ws_source, ws_part, ws_lecture")
    .eq("class_id", classId)
    .order("sort_order");
  if (error) throw new Error(`강의 영상 조회 실패: ${error.message}`);
  return (data ?? []).map((v) => ({
    id: v.id,
    title: v.title,
    vimeoId: v.vimeo_id,
    vimeoHash: v.vimeo_hash,
    durationSec: v.duration_sec,
    ws: v.ws_source && v.ws_part != null ? { source: v.ws_source, part: v.ws_part, lecture: v.ws_lecture } : null,
  }));
}

export type Course = {
  enrollmentId: string;
  classId: number;
  name: string;
  expiresAt: string | null;
  videos: CourseVideo[];
  progress: LessonProgress;
  lastVideoId: string | null;
  unlockAll: boolean;
  startedAt: string | null;
  completedAt: string | null;
  /** 워크시트를 낸 강의 id (2000플랜 DB 확인 결과를 담아 둔 것 — refreshWorksheets) */
  wsDone: string[];
};

export type CourseAccess = { ok: true; course: Course } | { ok: false; reason: "none" | "expired" };

/** 잠금 상태 다시 계산 — 잠긴 강의는 vimeoId 를 비운다 */
function withLocks(videos: ClassVideo[], progress: LessonProgress, unlockAll: boolean, wsDone: string[]): CourseVideo[] {
  // 2000플랜 DB 연결 전(env 없음)에는 워크시트로 막지 않는다 — 확인할 방법이 없어 영영 못 넘어가게 되므로
  const gate = twokplanConfigured();
  const wsPending = (id: string) => gate && Boolean(videos.find((v) => v.id === id)?.ws) && !wsDone.includes(id);
  const open = unlockedIds(videos.map((v) => v.id), progress, unlockAll, wsPending);
  return videos.map((v) => (open.has(v.id) ? { ...v, locked: false } : { ...v, vimeoId: "", vimeoHash: null, locked: true }));
}

/** 내 수강권한 확인 — 없거나 기한이 지났으면 영상을 주지 않는다 */
export async function getMyCourse(profileId: string, classId: number): Promise<CourseAccess> {
  const { data: en } = await getAdminSupabase()
    .from("enrollments")
    .select("id, expires_at, lesson_progress, last_video_id, unlock_all, started_at, completed_at, ws_done, classes(name)")
    .eq("profile_id", profileId)
    .eq("class_id", classId)
    .maybeSingle();
  if (!en) return { ok: false, reason: "none" };
  if (en.expires_at && new Date(en.expires_at) < new Date()) return { ok: false, reason: "expired" };
  const progress = (en.lesson_progress ?? {}) as LessonProgress;
  const wsDone = (en.ws_done ?? []) as string[];
  return {
    ok: true,
    course: {
      enrollmentId: en.id,
      classId,
      name: (en.classes as unknown as { name: string } | null)?.name ?? "",
      expiresAt: en.expires_at,
      videos: withLocks(await getClassVideos(classId), progress, en.unlock_all, wsDone),
      progress,
      lastVideoId: en.last_video_id,
      unlockAll: en.unlock_all,
      startedAt: en.started_at,
      completedAt: en.completed_at,
      wsDone,
    },
  };
}

const pctOf = (videos: ClassVideo[], progress: LessonProgress, wsDone: string[]) =>
  coursePct(videos.map((v) => v.id), progress, videos.filter((v) => v.ws).length, videos.filter((v) => v.ws && wsDone.includes(v.id)).length);

/**
 * 플레이어가 주기적으로 보내는 시청 위치 저장.
 * 잠긴 강의는 저장하지 않고, 완료는 건너뛰지 않고 본 위치(reach)로만 판단한다. 완료는 한 번 되면 되돌리지 않는다.
 */
export async function saveProgress(course: Course, videoId: string, sec: number, dur: number) {
  const video = course.videos.find((v) => v.id === videoId);
  if (!video) return null;
  if (video.locked) return { locked: true as const };
  // 길이는 한 번 알게 되면 DB 값을 믿는다 (요청의 dur 를 줄여서 완료를 만드는 것 방지)
  const len = video.durationSec ?? dur;
  const prev = course.progress[videoId];
  const now = Date.now();
  const reach = Math.floor(nextReach(prev, Math.min(sec, len), now));
  const done = Boolean(prev?.done) || (len > 0 && reach >= len * DONE_RATIO);
  const progress: LessonProgress = { ...course.progress, [videoId]: { sec: Math.floor(sec), dur: Math.floor(len), done, reach, at: now } };
  const pct = pctOf(course.videos, progress, course.wsDone);

  const at = new Date(now).toISOString();
  const db = getAdminSupabase();
  await db
    .from("enrollments")
    .update({
      lesson_progress: progress,
      last_video_id: videoId,
      last_position_sec: Math.floor(sec),
      progress: pct,
      last_watched_at: at,
      ...(course.startedAt ? {} : { started_at: at }),
      ...(pct === 100 && !course.completedAt ? { completed_at: at } : {}),
    })
    .eq("id", course.enrollmentId);
  if (!video.durationSec && dur > 0) await db.from("class_videos").update({ duration_sec: Math.round(dur) }).eq("id", videoId);
  // 방금 완료돼서 열린 다음 강의는 영상 주소를 같이 보내준다 (플레이어가 새로고침 없이 이어서 재생)
  const next = done && !prev?.done ? withLocks(await getClassVideos(course.classId), progress, course.unlockAll, course.wsDone) : null;
  return { locked: false as const, pct, done, reach, videos: next };
}

/* ── 기존 워크시트(2000플랜 · 오토사장반) 연결 ── */

export type WorksheetSync = {
  /** 채점 결과를 받을 이메일 — 없으면 수강생에게 먼저 물어본다 */
  email: string | null;
  /** 강의 id → 낸 워크시트 상태 */
  states: Record<string, WsState>;
  videos: CourseVideo[];
  pct: number;
  /** 2000플랜 DB 연결이 아직 안 됐으면 false (env 없음) */
  connected: boolean;
};

/**
 * 워크시트 제출 여부를 2000플랜 DB 에서 다시 확인해 잠금·진도에 반영한다 — 강의 화면을 열 때와 위젯에서 제출했을 때 부른다.
 * 2000플랜 위젯이 이메일을 확인할 수 있게 수강생 등록(만료일 동기화)도 여기서 한다.
 */
export async function refreshWorksheets(course: Course, profile: { name: string | null; email: string | null; worksheetEmail: string | null }): Promise<WorksheetSync> {
  const raw = profile.worksheetEmail || profile.email;
  const email = raw ? cleanEmail(raw) : null;
  const all = await getClassVideos(course.classId);
  const linked = all.filter((v) => v.ws);
  const base = { email, states: {}, videos: course.videos, pct: pctOf(all, course.progress, course.wsDone), connected: twokplanConfigured() };
  if (!linked.length || !email || !base.connected) return base;

  if (linked.some((v) => v.ws!.source === "2000plan")) {
    await ensure2000User(email, profile.name, course.expiresAt).catch((e) => console.error("[2000plan] 등록 실패", (e as Error).message));
  }
  let byKey: Record<string, WsState>;
  try {
    byKey = await getWsStates(email, linked.map((v) => v.ws!));
  } catch (e) {
    console.error("[2000plan] 제출 확인 실패", (e as Error).message);
    return base;
  }
  const states: Record<string, WsState> = {};
  for (const v of linked) if (byKey[wsKey(v.ws!)]) states[v.id] = byKey[wsKey(v.ws!)];
  // 한 번 낸 워크시트는 다시 잠그지 않는다 (이메일을 바꿔도 이미 열린 강의는 그대로)
  const wsDone = [...new Set([...course.wsDone, ...Object.keys(states)])].filter((id) => linked.some((v) => v.id === id));
  const pct = pctOf(all, course.progress, wsDone);
  const changed = wsDone.length !== course.wsDone.length || wsDone.some((id) => !course.wsDone.includes(id));
  if (changed) {
    await getAdminSupabase()
      .from("enrollments")
      .update({ ws_done: wsDone, progress: pct, ...(pct === 100 && !course.completedAt ? { completed_at: new Date().toISOString() } : {}) })
      .eq("id", course.enrollmentId);
  }
  return { email, states, videos: changed ? withLocks(all, course.progress, course.unlockAll, wsDone) : course.videos, pct, connected: true };
}

export async function getWorksheetEmail(profileId: string): Promise<string | null> {
  const { data } = await getAdminSupabase().from("profiles").select("worksheet_email").eq("id", profileId).maybeSingle();
  return data?.worksheet_email ?? null;
}

export async function setWorksheetEmail(profileId: string, email: string) {
  const { error } = await getAdminSupabase().from("profiles").update({ worksheet_email: email, updated_at: new Date().toISOString() }).eq("id", profileId);
  if (error) throw new Error(error.message);
}
