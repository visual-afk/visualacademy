import "server-only";
import { untilLabel } from "./expiry";
import { notifyOnce, type NotifyKind } from "./notify";
import { getAdminSupabase } from "./supabase/admin";

/*
 * 온라인 강의 넛지 알림톡 (서버 전용). 언제 보내는지는 lib/learning.ts, 매일 도는 건 api/cron/notify.
 * 카카오 검수가 "1회성 안내만" 허용한다고 경고해서 독려성 알림은 묶어서 제한한다:
 *  - 한 사람(수강권)에게 하루 1통
 *  - 독려(시작·무활동·워크시트)는 7일에 2통까지
 * 기한 임박·축하·기한 변경 안내는 꼭 필요한 정보라 7일 제한에서 뺀다 (하루 1통은 지킨다 — 축하·기한 변경은 사람이 한 일이 있을 때만 나가서 예외).
 * ref_id 는 항상 "수강권id:..." 로 시작한다 → 수강권별로 보낸 기록을 셀 수 있다.
 */

/** 7일에 2통 제한을 받는 독려 알림 */
export const PUSH_KINDS: NotifyKind[] = ["start", "idle", "ws-pending"];
/** 하루 1통을 세는 알림 (매일 cron 이 보내는 것) */
const DAILY_KINDS: NotifyKind[] = [...PUSH_KINDS, "behind", "expired"];
const PUSH_PER_WEEK = 2;

const kstTodayStart = () => {
  const d = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
  return new Date(`${d}T00:00:00+09:00`).toISOString();
};

/** 이 수강권에 오늘 이미 보냈는지 · 이번 주 독려를 다 썼는지 */
export async function nudgeBudget(enrollmentId: string): Promise<{ sentToday: boolean; pushLeft: number }> {
  const since = new Date(Date.now() - 7 * 86400 * 1000).toISOString();
  const { data } = await getAdminSupabase()
    .from("notification_log")
    .select("kind, created_at")
    .like("ref_id", `${enrollmentId}:%`)
    .in("kind", DAILY_KINDS)
    .gte("created_at", since);
  const rows = data ?? [];
  const today = kstTodayStart();
  return {
    sentToday: rows.some((r) => r.created_at >= today),
    pushLeft: PUSH_PER_WEEK - rows.filter((r) => PUSH_KINDS.includes(r.kind as NotifyKind)).length,
  };
}

type EnrollmentInfo = {
  id: string; class_id: number; expires_at: string | null; progress: number;
  profiles: { name: string | null; phone: string | null } | null; classes: { name: string } | null;
};

async function loadEnrollment(id: string): Promise<EnrollmentInfo | null> {
  const { data } = await getAdminSupabase()
    .from("enrollments")
    .select("id, class_id, expires_at, progress, profiles(name, phone), classes(name)")
    .eq("id", id)
    .maybeSingle();
  return data as unknown as EnrollmentInfo | null;
}

export const courseLink = (origin: string, classId: number) => `${origin}/mypage/courses/${classId}`;

/**
 * 진도 이정표 — 절반(50%)·완강. 진도를 저장할 때 넘는 순간 한 번.
 * remaining = 남은 강의(영상+워크시트) 수
 */
export async function notifyMilestone(enrollmentId: string, kind: "half" | "done", origin: string, remaining = 0) {
  try {
    const e = await loadEnrollment(enrollmentId);
    if (!e) return;
    await notifyOnce(kind, `${e.id}:${kind}`, e.profiles?.phone, {
      "#{이름}": e.profiles?.name ?? "",
      "#{클래스명}": e.classes?.name ?? "",
      ...(kind === "half" ? { "#{남은강의}": `${remaining}개` } : { "#{만료일}": untilLabel(e.expires_at) }),
      "#{링크}": courseLink(origin, e.class_id),
    });
  } catch (err) {
    console.error("[nudge] milestone", kind, (err as Error).message);
  }
}

/** 관리자가 수강권을 주거나 기한을 바꿨을 때 — 바뀐 기한마다 한 번 */
export async function notifyAccess(enrollmentId: string, origin: string) {
  try {
    const e = await loadEnrollment(enrollmentId);
    if (!e) return;
    await notifyOnce("access", `${e.id}:${e.expires_at ?? "unlimited"}`, e.profiles?.phone, {
      "#{이름}": e.profiles?.name ?? "",
      "#{클래스명}": e.classes?.name ?? "",
      "#{만료일}": untilLabel(e.expires_at),
      "#{링크}": courseLink(origin, e.class_id),
    });
  } catch (err) {
    console.error("[nudge] access", (err as Error).message);
  }
}
