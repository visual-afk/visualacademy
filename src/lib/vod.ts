import "server-only";
import { getAdminSupabase } from "./supabase/admin";

/*
 * 온라인 강의 (Vimeo 비공개 영상). 영상 주소는 수강권한·기한을 서버에서 확인한 뒤에만 내려준다.
 * Vimeo 쪽에서는 영상마다 "임베드 허용 도메인"을 아카데미 도메인으로 제한해 둔다.
 */

export type ClassVideo = { id: string; title: string; vimeoId: string; vimeoHash: string | null; durationSec: number | null };
export type LessonProgress = Record<string, { sec: number; dur: number; done: boolean }>;

/** 끝까지 안 봐도 이만큼 보면 수강 완료로 친다 */
export const DONE_RATIO = 0.9;

/** vimeo.com/123 · vimeo.com/123/abcdef · player.vimeo.com/video/123?h=abcdef · 123 → { id, hash } */
export function parseVimeo(input: string): { id: string; hash: string | null } | null {
  const s = input.trim();
  if (/^\d{5,12}$/.test(s)) return { id: s, hash: null };
  let u: URL;
  try {
    u = new URL(s);
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
  videos: ClassVideo[];
  progress: LessonProgress;
  lastVideoId: string | null;
};

export type CourseAccess = { ok: true; course: Course } | { ok: false; reason: "none" | "expired" };

/** 내 수강권한 확인 — 없거나 기한이 지났으면 영상을 주지 않는다 */
export async function getMyCourse(profileId: string, classId: number): Promise<CourseAccess> {
  const { data: en } = await getAdminSupabase()
    .from("enrollments")
    .select("id, expires_at, lesson_progress, last_video_id, classes(name)")
    .eq("profile_id", profileId)
    .eq("class_id", classId)
    .maybeSingle();
  if (!en) return { ok: false, reason: "none" };
  if (en.expires_at && new Date(en.expires_at) < new Date()) return { ok: false, reason: "expired" };
  return {
    ok: true,
    course: {
      enrollmentId: en.id,
      classId,
      name: (en.classes as unknown as { name: string } | null)?.name ?? "",
      expiresAt: en.expires_at,
      videos: await getClassVideos(classId),
      progress: (en.lesson_progress ?? {}) as LessonProgress,
      lastVideoId: en.last_video_id,
    },
  };
}

/** 플레이어가 주기적으로 보내는 시청 위치 저장 — 완료는 한 번 되면 되돌리지 않는다 */
export async function saveProgress(course: Course, videoId: string, sec: number, dur: number) {
  const video = course.videos.find((v) => v.id === videoId);
  if (!video) return null;
  const prev = course.progress[videoId];
  const done = Boolean(prev?.done) || (dur > 0 && sec >= dur * DONE_RATIO);
  const progress: LessonProgress = { ...course.progress, [videoId]: { sec: Math.floor(sec), dur: Math.floor(dur), done } };
  const doneCount = course.videos.filter((v) => progress[v.id]?.done).length;
  const pct = course.videos.length ? Math.round((doneCount / course.videos.length) * 100) : 0;

  const db = getAdminSupabase();
  await db
    .from("enrollments")
    .update({ lesson_progress: progress, last_video_id: videoId, last_position_sec: Math.floor(sec), progress: pct })
    .eq("id", course.enrollmentId);
  if (!video.durationSec && dur > 0) await db.from("class_videos").update({ duration_sec: Math.round(dur) }).eq("id", videoId);
  return { pct, done };
}
