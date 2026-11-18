import { NextResponse, type NextRequest } from "next/server";
import { getProfile, getUser } from "@/lib/auth";
import { notifyHq } from "@/lib/notify";
import { getAdminSupabase } from "@/lib/supabase/admin";
import type { InvoiceRecord } from "@/lib/types";

const kstStamp = () => {
  const k = new Date(Date.now() + 9 * 3600 * 1000).toISOString();
  return `${k.slice(0, 10)} ${k.slice(11, 16)}`;
};

/** POST /api/me/orders/:id/invoice — 사업자 고객의 세금계산서 신청. 발행은 본사가 관리자 결제 화면에서 한다 */
export async function POST(request: NextRequest, { params }: RouteContext<"/api/me/orders/[id]/invoice">) {
  const user = await getUser();
  const profile = user ? await getProfile(user.id) : null;
  if (!profile) return NextResponse.json({ error: "로그인이 필요해요" }, { status: 401 });

  const b = ((await request.json().catch(() => null)) ?? {}) as Partial<Record<"bizNo" | "bizName" | "ceo" | "email", string>>;
  const bizNo = (b.bizNo ?? "").replace(/\D/g, "");
  if (bizNo.length !== 10) return NextResponse.json({ error: "사업자등록번호 10자리를 확인해주세요" }, { status: 400 });
  if (!b.bizName?.trim() || !b.ceo?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email ?? "")) {
    return NextResponse.json({ error: "상호·대표자명·이메일을 확인해주세요" }, { status: 400 });
  }

  const db = getAdminSupabase();
  const { data: order } = await db.from("orders").select("id, order_no, profile_id, classes(name)").eq("id", (await params).id).maybeSingle();
  if (!order || order.profile_id !== profile.id) return NextResponse.json({ error: "주문을 찾을 수 없어요" }, { status: 404 });
  const { data: pay } = await db.from("payments").select("id, status, invoice").eq("order_id", order.id).maybeSingle();
  if (!pay || !["결제완료", "부분환불"].includes(pay.status)) return NextResponse.json({ error: "결제가 끝난 건만 신청할 수 있어요" }, { status: 409 });
  const prev = pay.invoice as InvoiceRecord | null;
  if (prev?.mgtKey && !prev.canceled) return NextResponse.json({ error: "이미 발행된 건이에요. 정보를 바꾸려면 카카오채널로 문의해주세요." }, { status: 409 });

  // 예전에 발행했다 취소된 건이면 문서번호가 겹치지 않게 순번·이력만 이어받는다
  const invoice: InvoiceRecord = {
    bizNo, bizName: b.bizName.trim(), ceo: b.ceo.trim(), email: b.email!.trim(), issuedAt: "", requestedAt: kstStamp(),
    ...(prev?.seq ? { seq: prev.seq, history: prev.history } : {}),
  };
  const { error } = await db.from("payments").update({ invoice }).eq("id", pay.id);
  if (error) return NextResponse.json({ error: "신청하지 못했어요. 잠시 후 다시 시도해주세요." }, { status: 500 });

  const cls = (order.classes as unknown as { name: string } | null)?.name ?? "";
  await notifyHq(`🧾 세금계산서 신청 · ${order.order_no}\n${cls} · ${invoice.bizName} (${bizNo}) · ${invoice.email}\n관리자 > 결제 관리에서 발행해주세요`);
  return NextResponse.json({ ok: true });
}
