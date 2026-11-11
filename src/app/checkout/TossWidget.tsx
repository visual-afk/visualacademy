"use client";

import { loadTossPayments, type TossPaymentsWidgets } from "@tosspayments/tosspayments-sdk";
import { useEffect, useRef, useState } from "react";
import { won } from "@/lib/format";

export type PendingOrder = { orderNo: string; amount: number; orderName: string; customerKey: string };

/** 토스 결제위젯 — 결제수단·약관 UI 를 그리고, 결제하기를 누르면 토스 결제창 → /checkout/success 로 돌아온다 */
export default function TossWidget({
  order,
  customer,
  slug,
  onBack,
  taxLine,
}: {
  order: PendingOrder;
  customer: { name: string; phone: string; email: string };
  slug: string;
  onBack: () => void;
  taxLine: string;
}) {
  const widgets = useRef<TossPaymentsWidgets | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const toss = await loadTossPayments(process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!);
        const w = toss.widgets({ customerKey: order.customerKey });
        await w.setAmount({ currency: "KRW", value: order.amount });
        await Promise.all([
          w.renderPaymentMethods({ selector: "#toss-methods", variantKey: "DEFAULT" }),
          w.renderAgreement({ selector: "#toss-agreement", variantKey: "AGREEMENT" }),
        ]);
        if (cancelled) return;
        widgets.current = w;
        setReady(true);
      } catch {
        if (!cancelled) setError("결제 화면을 불러오지 못했어요. 새로고침 후 다시 시도해주세요.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [order]);

  const pay = async () => {
    if (!widgets.current) return;
    setError("");
    try {
      await widgets.current.requestPayment({
        orderId: order.orderNo,
        orderName: order.orderName,
        successUrl: `${location.origin}/checkout/success`,
        failUrl: `${location.origin}/checkout/fail?cls=${encodeURIComponent(slug)}`,
        customerName: customer.name,
        customerMobilePhone: customer.phone.replace(/\D/g, ""),
        ...(customer.email ? { customerEmail: customer.email } : {}),
      });
    } catch (e) {
      // 결제창을 닫은 경우 등 — 화면에 그대로 머문다
      const msg = (e as { message?: string }).message;
      if (msg) setError(msg);
    }
  };

  return (
    <div className="pay-wrap">
      <h2>결제 수단을 선택해주세요</h2>
      <div id="toss-methods" />
      <div id="toss-agreement" />
      <div className="pay-total"><span className="lbl">최종 결제 금액</span><span className="amt">{won(order.amount)}</span></div>
      <p className="tax-note">{taxLine}</p>
      {error && <p className="err" style={{ textAlign: "center" }}>{error}</p>}
      <button type="button" className="btn btn-mint" disabled={!ready} onClick={pay}>
        {ready ? `${won(order.amount)} 결제하기` : "결제 화면 불러오는 중…"}
      </button>
      <button type="button" className="btn btn-ghost" onClick={onBack}>이전 단계로</button>
      <p className="tax-note">주문번호 {order.orderNo}</p>
    </div>
  );
}
