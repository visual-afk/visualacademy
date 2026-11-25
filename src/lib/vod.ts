import "server-only";
import { DONE_RATIO, nextReach, unlockedIds, type LessonProgress } from "./lessons";
import { getAdminSupabase } from "./supabase/admin";

/*
 * 온라인 강의 (Vimeo 비공개 영상). 영상 주소는 수강권한·기한을 서버에서 확인한 뒤에만 내려준다.
 * Vimeo 쪽에서는 영상마다 "임베드 허용 도메인"을 아카데미 도메인으로 제한해 둔다.
 */

export type ClassVideo = { id: string; title: string; vimeoId: string; vimeoHash: string | null; durationSec: number | null };
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
    .select("id, title, vimeo_id, vimeo_hash, duration_sec")
    .eq("class_id", classId)
    .order("sort_order");
  if (error) throw new Error(`강의 영상 조회 실패: ${error.message}`);
  return (data ?? []).map((v) => ({ id: v.id, title: v.title, vimeoId: v.vimeo_id, vimeoHash: v.vimeo_hash, durationSec: v.duration_sec }));
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
};

export type CourseAccess = { ok: true; course: Course } | { ok: false; reason: "none" | "expired" };

/** 잠금 상태 다시 계산 — 잠긴 강의는 vimeoId 를 비운다 */
function withLocks(videos: ClassVideo[], progress: LessonProgress, unlockAll: boolean): CourseVideo[] {
  const open = unlockedIds(videos.map((v) => v.id), progress, unlockAll);
  return videos.map((v) => (open.has(v.id) ? { ...v, locked: false } : { ...v, vimeoId: "", vimeoHash: null, locked: true }));
}

/** 내 수강권한 확인 — 없거나 기한이 지났으면 영상을 주지 않는다 */
export async function getMyCourse(profileId: string, classId: number): Promise<CourseAccess> {
  const { data: en } = await getAdminSupabase()
    .from("enrollments")
    .select("id, expires_at, lesson_progress, last_video_id, unlock_all, started_at, completed_at, classes(name)")
    .eq("profile_id", profileId)
    .eq("class_id", classId)
    .maybeSingle();
  if (!en) return { ok: false, reason: "none" };
  if (en.expires_at && new Date(en.expires_at) < new Date()) return { ok: false, reason: "expired" };
  const progress = (en.lesson_progress ?? {}) as LessonProgress;
  return {
    ok: true,
    course: {
      enrollmentId: en.id,
      classId,
      name: (en.classes as unknown as { name: string } | null)?.name ?? "",
      expiresAt: en.expires_at,
      videos: withLocks(await getClassVideos(classId), progress, en.unlock_all),
      progress,
      lastVideoId: en.last_video_id,
      unlockAll: en.unlock_all,
      startedAt: en.started_at,
      completedAt: en.completed_at,
    },
  };
}

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
  const doneCount = course.videos.filter((v) => progress[v.id]?.done).length;
  const pct = course.videos.length ? Math.round((doneCount / course.videos.length) * 100) : 0;

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
  const next = done && !prev?.done ? withLocks(await getClassVideos(course.classId), progress, course.unlockAll) : null;
  return { locked: false as const, pct, done, reach, videos: next };
}
