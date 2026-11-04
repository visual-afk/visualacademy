import { NextResponse, type NextRequest } from "next/server";
import { fullDate } from "@/lib/format";
import { notifyOnce } from "@/lib/notify";
import { getAdminSupabase } from "@/lib/supabase/admin";

/*
 * GET /api/cron/notify — Vercel Cron 이 매일 09:00 KST 에 부른다 (vercel.json).
 * ① 개강 3일 전 준비물·오시는 길 ② 온라인 수강 만료 30일 전 안내. notifyOnce 라 여러 번 돌아도 한 번만 나간다.
 */
const kstDate = (offsetDays: number) => new Date(Date.now() + 9 * 3600 * 1000 + offsetDays * 86400 * 1000).toISOString().slice(0, 10);

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const db = getAdminSupabase();
  const result = { d3: 0, expire30: 0 };

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
    .select("id, expires_at, profiles(name, phone), classes(name)")
    .gte("expires_at", from)
    .lte("expires_at", to);
  for (const e of (ens ?? []) as unknown as { id: string; expires_at: string; profiles: { name: string | null; phone: string | null }; classes: { name: string } }[]) {
    const r = await notifyOnce("expire-30", e.id, e.profiles?.phone, {
      "#{이름}": e.profiles?.name ?? "",
      "#{클래스명}": e.classes.name,
      "#{만료일}": day.replace(/-/g, "."),
    });
    if (r.sent) result.expire30++;
  }

  return NextResponse.json({ ok: true, ...result });
}
