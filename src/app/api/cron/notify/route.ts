import { NextResponse, type NextRequest } from "next/server";
import { daysLeft, expiryLabel } from "@/lib/expiry";
import { fullDate } from "@/lib/format";
import { behindStage, idleDays, idleStage, type LearnerInput } from "@/lib/learning";
import type { LessonProgress } from "@/lib/lessons";
import { notifyHq, notifyOnce } from "@/lib/notify";
import { getAdminSupabase } from "@/lib/supabase/admin";

/*
 * GET /api/cron/notify — Vercel Cron 이 매일 09:00 KST 에 부른다 (vercel.json).
 * ① 개강 3일 전 준비물·오시는 길 ② 온라인 수강 만료 30일 전 안내
 * ③ 온라인 강의를 3·7·14일 안 본 사람 ④ 기한 임박인데 진도가 낮은 사람 (규칙은 lib/learning.ts).
 * notifyOnce 라 여러 번 돌아도 한 번만 나간다. 템플릿 ID 가 아직 없으면 조용히 건너뛴다.
 */
const kstDate = (offsetDays: number) => new Date(Date.now() + 9 * 3600 * 1000 + offsetDays * 86400 * 1000).toISOString().slice(0, 10);

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const db = getAdminSupabase();
  const result = { d3: 0, expire30: 0, idle: 0, behind: 0 };

  // ① 개강 3일 전
  const d3 = kstDate(3);
  const { data: classes } = await db.from("class_with_counts").select("id, name, date, time, place, detail").eq("date", d3).neq("type", "online");
  for (const c of classes ?? []) {
    const { data: orders } = await db.from("orders").select("id, applicant").eq("class_id", c.id).eq("status", "수강확정");
    const prep = (c.detail as { prep?: string } | null)?.prep ?? "개강 안내 문자를 확인해주세요";
    for (const o of orders ?? []) {
      const r = await notifyOnce("d-3", o.id, o.applicant?.phone, {
        "#{이름}": o.applicant?.name ?? "",
        "#{클래스명}": c.name,
        "#{일정}": `${fullDate(c.date)} ${c.time?.split("~")[0] ?? ""}`.trim(),
        "#{장소}": c.place ?? "",
        "#{준비물}": prep.split("\n")[0],
      });
      if (r.sent) result.d3++;
    }
  }

  // ② 수강 만료 30일 전 (KST 그날 하루 안에 만료되는 수강권)
  const day = kstDate(30);
  const from = new Date(`${day}T00:00:00+09:00`).toISOString();
  const to = new Date(`${day}T23:59:59.999+09:00`).toISOString();
  const { data: ens } = await db
    .from("enrollments")
    .select("id, expires_at, progress, profiles(name, phone), classes(name)")
    .gte("expires_at", from)
    .lte("expires_at", to);
  for (const e of (ens ?? []) as unknown as { id: string; expires_at: string; progress: number; profiles: { name: string | null; phone: string | null }; classes: { name: string } }[]) {
    // 진도가 낮은 사람은 ④ 저진도 안내가 같은 날 나간다
    if (e.progress < 50) continue;
    const r = await notifyOnce("expire-30", e.id, e.profiles?.phone, {
      "#{이름}": e.profiles?.name ?? "",
      "#{클래스명}": e.classes.name,
      "#{만료일}": day.replace(/-/g, "."),
    });
    if (r.sent) result.expire30++;
  }

  // ③④ 온라인 강의 학습 독려 — 수강 중(만료 전·완강 전)인 수강권만
  const now = new Date();
  const { data: learners } = await db
    .from("enrollments")
    .select("id, class_id, expires_at, progress, created_at, last_watched_at, completed_at, lesson_progress, ws_done, profiles(name, phone), classes(name)")
    .is("completed_at", null)
    .lt("progress", 100)
    .or(`expires_at.is.null,expires_at.gt.${now.toISOString()}`);
  type Learner = {
    id: string; class_id: number; expires_at: string | null; progress: number; created_at: string; last_watched_at: string | null; completed_at: string | null;
    lesson_progress: LessonProgress | null; ws_done: string[] | null;
    profiles: { name: string | null; phone: string | null } | null; classes: { name: string } | null;
  };
  const rows = (learners ?? []) as unknown as Learner[];
  const classIds = [...new Set(rows.map((r) => r.class_id))];
  const { data: vids } = classIds.length
    ? await db.from("class_videos").select("id, class_id, title, ws_source").in("class_id", classIds).order("sort_order")
    : { data: [] };
  /** 다음에 들을 강의 — 영상을 다 안 봤거나 워크시트를 안 낸 첫 강의 */
  const nextLesson = (r: Learner) =>
    (vids ?? []).find((v) => v.class_id === r.class_id && (!r.lesson_progress?.[v.id]?.done || (v.ws_source && !(r.ws_done ?? []).includes(v.id))))?.title ?? "";
  const newlyAtRisk: string[] = [];
  for (const r of rows) {
    const s: LearnerInput = { expiresAt: r.expires_at, lastWatchedAt: r.last_watched_at, startedAt: r.created_at, progress: r.progress, completedAt: r.completed_at };
    const link = `${request.nextUrl.origin}/mypage/courses/${r.class_id}`;
    const base = { "#{이름}": r.profiles?.name ?? "", "#{클래스명}": r.classes?.name ?? "", "#{링크}": link };
    // 본사에는 그날 새로 위험해진 사람만 한 번 알린다
    if (idleDays(s, now) === 14 || (daysLeft(r.expires_at, now) === 7 && r.progress < 80)) newlyAtRisk.push(`${r.profiles?.name ?? "이름 없음"}(${r.classes?.name ?? ""} ${r.progress}%)`);
    const behind = behindStage(s, now);
    if (behind) {
      // 기한을 바꾸면(연장) 새 기한 기준으로 다시 보낼 수 있게 만료일을 ref 에 넣는다
      const res = await notifyOnce("behind", `${r.id}:${r.expires_at?.slice(0, 10)}:${behind.days}`, r.profiles?.phone, {
        ...base,
        "#{만료일}": expiryLabel(r.expires_at),
        "#{진도}": `${r.progress}%`,
      });
      if (res.sent) result.behind++;
      continue; // 같은 날 무활동 알림까지 두 번 보내지 않는다
    }
    const stage = idleStage(s, now);
    if (stage) {
      // 다시 보면 마지막 시청일이 바뀌어 단계가 처음부터 다시 센다
      const res = await notifyOnce("idle", `${r.id}:${(r.last_watched_at ?? r.created_at).slice(0, 10)}:${stage}`, r.profiles?.phone, {
        ...base,
        "#{다음강의}": nextLesson(r),
      });
      if (res.sent) result.idle++;
    }
  }
  if (newlyAtRisk.length) {
    await notifyHq(`[아카데미 온라인] 오늘 챙겨야 할 수강생 ${newlyAtRisk.length}명 — 14일째 안 봄 · 만료 7일 전 진도 80% 미만\n${newlyAtRisk.slice(0, 20).join(", ")}${newlyAtRisk.length > 20 ? " 외" : ""}`);
  }

  return NextResponse.json({ ok: true, ...result });
}
