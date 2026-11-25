import { NextResponse, type NextRequest } from "next/server";
import { bad, guardAdmin } from "@/lib/adminApi";
import { getAdmin } from "@/lib/auth";
import { grantEnrollment } from "@/lib/enrollments";
import { parseExpiryChange } from "@/lib/expiry";
import { notifyAccess } from "@/lib/nudges";
import { getAdminSupabase } from "@/lib/supabase/admin";

type Body = { phone?: string; name?: string; change?: unknown; reason?: string; notify?: boolean };

/** POST /api/admin/classes/:id/students — 결제 없이 수강권 직접 부여 (이미 있으면 기한만 바꾼다) */
export async function POST(request: NextRequest, { params }: RouteContext<"/api/admin/classes/[id]/students">) {
  const denied = await guardAdmin();
  if (denied) return denied;
  const classId = Number((await params).id);
  const b = (await request.json().catch(() => null)) as Body | null;
  const phone = (b?.phone ?? "").replace(/\D/g, "");
  const change = parseExpiryChange(b?.change);
  const reason = b?.reason?.trim() ?? "";
  if (!/^01\d{8,9}$/.test(phone)) return bad("휴대폰 번호를 정확히 입력해 주세요");
  if (!change) return bad("수강기한을 확인해 주세요");
  if (!reason) return bad("부여 사유를 적어 주세요");

  const { data: cls } = await getAdminSupabase().from("classes").select("type").eq("id", classId).maybeSingle();
  if (!cls) return bad("클래스를 찾을 수 없어요", 404);
  if (cls.type !== "online") return bad("온라인 강의에만 수강권을 줄 수 있어요");

  const admin = await getAdmin();
  try {
    const r = await grantEnrollment(classId, { phone, name: b?.name?.trim() ?? "", change, reason }, admin?.name ?? "관리자");
    if (b?.notify !== false) await notifyAccess(r.id, request.nextUrl.origin);
    return NextResponse.json(r);
  } catch (e) {
    return bad(e instanceof Error ? e.message : "수강권을 주지 못했어요", 500);
  }
}
