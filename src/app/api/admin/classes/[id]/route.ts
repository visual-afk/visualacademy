import { NextResponse, type NextRequest } from "next/server";
import { bad, guardAdmin } from "@/lib/adminApi";
import { getClassById } from "@/lib/api";
import { classColumns, detailPatch, validateClassInput, type ClassInput } from "@/lib/classInput";
import { fullDate } from "@/lib/format";
import { notifyOnce } from "@/lib/notify";
import { getAdminSupabase } from "@/lib/supabase/admin";

/** PUT /api/admin/classes/:id — 기본 정보 저장 */
export async function PUT(request: NextRequest, { params }: RouteContext<"/api/admin/classes/[id]">) {
  const denied = await guardAdmin();
  if (denied) return denied;
  const id = Number((await params).id);
  const prev = await getClassById(id);
  if (!prev) return bad("클래스를 찾을 수 없어요", 404);
  const v = (await request.json().catch(() => null)) as ClassInput | null;
  if (!v) return bad("요청 형식이 올바르지 않아요");
  const err = validateClassInput(v);
  if (err) return bad(err);

  const db = getAdminSupabase();
  const { error } = await db.from("classes").update(classColumns(v, prev)).eq("id", id);
  if (error) return bad(`저장하지 못했어요: ${error.message}`, 500);

  // 상세 콘텐츠는 폼에 있는 항목(이런 분께·준비물)만 덮어쓰고 커리큘럼 등은 그대로 둔다
  const { data: cc } = await db.from("class_contents").select("detail").eq("class_id", id).maybeSingle();
  const detail = detailPatch(v, (cc?.detail as Record<string, unknown>) ?? {});
  const { error: ccErr } = await db.from("class_contents").upsert({ class_id: id, detail, updated_at: new Date().toISOString() });
  if (ccErr) return bad(`상세 정보를 저장하지 못했어요: ${ccErr.message}`, 500);

  // 개설 대기 → 일정 확정으로 공개하면 알림 신청자에게 한 번 알린다
  const opened = (prev.type === "waitlist" || prev.type === "upcoming") && v.opType === "offline" && !v.draft && v.date;
  let notified = 0;
  if (opened) {
    const { data: alerts } = await db.from("waitlist_alerts").select("id, phone").eq("class_id", id).is("notified_at", null);
    const link = `${request.nextUrl.origin}/classes/${prev.slug}`;
    for (const a of alerts ?? []) {
      const r = await notifyOnce("waitlist-open", a.id, a.phone, {
        "#{클래스명}": v.name,
        "#{일정}": `${fullDate(v.date!)} ${v.time?.split("~")[0] ?? ""}`.trim(),
        "#{링크}": link,
      });
      if (r.sent) {
        notified++;
        await db.from("waitlist_alerts").update({ notified_at: new Date().toISOString() }).eq("id", a.id);
      }
    }
  }
  return NextResponse.json({ id, slug: prev.slug, notified });
}

type Patch = { capacity?: number; date?: string; manualEnd?: boolean };

/** PATCH /api/admin/classes/:id — 대시보드 카드의 정원 조정 · 개강일 변경 · 강제 종료/취소 */
export async function PATCH(request: NextRequest, { params }: RouteContext<"/api/admin/classes/[id]">) {
  const denied = await guardAdmin();
  if (denied) return denied;
  const id = Number((await params).id);
  const prev = await getClassById(id);
  if (!prev) return bad("클래스를 찾을 수 없어요", 404);
  const p = (await request.json().catch(() => null)) as Patch | null;
  if (!p) return bad("요청 형식이 올바르지 않아요");

  const cols: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (p.capacity !== undefined) {
    if (!Number.isInteger(p.capacity) || p.capacity < 1) return bad("정원을 확인해주세요");
    if (prev.applied != null && p.capacity < prev.applied) return bad(`이미 ${prev.applied}명이 신청해서 그보다 줄일 수 없어요`);
    cols.capacity = p.capacity;
  }
  if (p.date !== undefined) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(p.date)) return bad("개강일 형식이 올바르지 않아요");
    cols.date = p.date;
  }
  if (p.manualEnd !== undefined) cols.manual_end = Boolean(p.manualEnd);

  const { error } = await getAdminSupabase().from("classes").update(cols).eq("id", id);
  if (error) return bad(`저장하지 못했어요: ${error.message}`, 500);
  return NextResponse.json({ ok: true });
}
