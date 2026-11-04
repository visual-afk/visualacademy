import { NextResponse, type NextRequest } from "next/server";
import { syncFromToss } from "@/lib/orders";

/*
 * POST /api/payments/webhook — 토스 개발자센터 > 웹훅에 이 주소를 등록한다.
 * 가상계좌 입금(DEPOSIT_CALLBACK)·결제 상태 변경(PAYMENT_STATUS_CHANGED) 모두 주문번호만 꺼내고,
 * 본문 내용은 믿지 않고 시크릿 키로 토스에 다시 조회해서 반영한다 (위조된 요청이 와도 상태를 못 바꾼다).
 */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { eventType?: string; data?: { orderId?: string }; orderId?: string } | null;
  const orderId = body?.data?.orderId ?? body?.orderId;
  if (!orderId) return NextResponse.json({ ok: true, skipped: "no orderId" });
  try {
    const found = await syncFromToss(orderId);
    return NextResponse.json({ ok: true, found });
  } catch (e) {
    // 500 이면 토스가 다시 보내준다
    console.error("webhook sync failed", orderId, (e as Error).message);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
