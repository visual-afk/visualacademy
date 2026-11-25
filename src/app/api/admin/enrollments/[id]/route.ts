import { NextResponse, type NextRequest } from "next/server";
import { bad, guardAdmin } from "@/lib/adminApi";
import { getAdmin } from "@/lib/auth";
import { changeExpiry, revokeEnrollment, setUnlockAll, updateNote } from "@/lib/enrollments";
import { parseExpiryChange } from "@/lib/expiry";

type Body = { action?: "expiry" | "revoke" | "note" | "unlock"; change?: unknown; reason?: string; note?: string; on?: boolean };

/** PATCH /api/admin/enrollments/:id — 기한 변경 · 회수(즉시 만료) · 메모 · 순서 잠금 해제 */
export async function PATCH(request: NextRequest, { params }: RouteContext<"/api/admin/enrollments/[id]">) {
  const denied = await guardAdmin();
  if (denied) return denied;
  const id = (await params).id;
  const b = (await request.json().catch(() => null)) as Body | null;
  const reason = b?.reason?.trim() ?? "";
  const actor = (await getAdmin())?.name ?? "관리자";

  try {
    if (b?.action === "note") {
      await updateNote(id, (b.note ?? "").trim().slice(0, 500));
      return NextResponse.json({ ok: true });
    }
    if (b?.action === "unlock") {
      await setUnlockAll(id, Boolean(b.on));
      return NextResponse.json({ ok: true });
    }
    if (b?.action !== "expiry" && b?.action !== "revoke") return bad("요청 형식이 올바르지 않아요");
    if (!reason) return bad("사유를 적어 주세요");
    let r;
    if (b.action === "revoke") {
      r = await revokeEnrollment(id, reason, actor);
    } else {
      const change = parseExpiryChange(b.change);
      if (!change) return bad("수강기한을 확인해 주세요");
      r = await changeExpiry(id, change, reason, actor);
    }
    if (!r) return bad("수강권을 찾을 수 없어요", 404);
    return NextResponse.json(r);
  } catch (e) {
    return bad(e instanceof Error ? e.message : "저장하지 못했어요", 500);
  }
}
