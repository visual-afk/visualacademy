import { NextResponse, type NextRequest } from "next/server";
import { bad, guardAdmin } from "@/lib/adminApi";
import { applyTossPayment, type OrderRow } from "@/lib/orders";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { cancelPayment, TossError } from "@/lib/toss";

type Body = { type: "full" | "partial"; amount?: number; reason: string; memo?: string };

/** POST /api/admin/payments/:orderNo/refund — 토스 결제 취소(전액/부분) 후 주문·결제 상태 반영 */
export async function POST(request: NextRequest, { params }: RouteContext<"/api/admin/payments/[id]/refund">) {
  const denied = await guardAdmin();
  if (denied) return denied;
  const orderNo = (await params).id;
  const b = (await request.json().catch(() => null)) as Body | null;
  if (!b || !["full", "partial"].includes(b.type) || !b.reason) return bad("요청 형식이 올바르지 않아요");

  const db = getAdminSupabase();
  const { data: order } = await db.from("orders").select("*").eq("order_no", orderNo).maybeSingle();
  if (!order) return bad("주문을 찾을 수 없어요", 404);
  const { data: pay } = await db.from("payments").select("toss_payment_key, amount, status, refund").eq("order_id", order.id).maybeSingle();
  if (!pay?.toss_payment_key) return bad("토스 결제 정보가 없는 건이에요 (이관·수기 건은 직접 환불해주세요)");
  if (!["결제완료", "부분환불"].includes(pay.status)) return bad("환불할 수 있는 상태가 아니에요");

  const refunded = (pay.refund as { amount?: number } | null)?.amount ?? 0;
  const balance = pay.amount - refunded;
  const amount = b.type === "full" ? undefined : Math.floor(Number(b.amount));
  if (amount !== undefined && !(amount > 0 && amount < balance)) return bad(`부분 환불은 1원 이상 ${(balance - 1).toLocaleString("ko-KR")}원 이하로 입력해주세요`);

  try {
    const reason = b.memo ? `${b.reason} · ${b.memo}`.slice(0, 200) : b.reason;
    const p = await cancelPayment(pay.toss_payment_key, reason, amount, `refund-${order.id}-${refunded}-${amount ?? "full"}`);
    await applyTossPayment(order as OrderRow, p);
    return NextResponse.json({ ok: true, status: p.status === "CANCELED" ? "환불완료" : "부분환불", refunded: p.totalAmount - p.balanceAmount });
  } catch (e) {
    return bad(e instanceof TossError ? `환불 실패: ${e.message}` : "환불 중 문제가 생겼어요", 502);
  }
}
