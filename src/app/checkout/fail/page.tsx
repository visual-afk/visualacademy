import type { Metadata } from "next";
import Link from "next/link";
import { ROUTES } from "@/data/site";

export const metadata: Metadata = { title: "결제 실패" };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

/** 토스 결제창에서 실패·취소했을 때 돌아오는 곳 (주문은 결제대기로 남고 자리는 잡히지 않는다) */
export default async function CheckoutFail({ searchParams }: PageProps<"/checkout/fail">) {
  const sp = await searchParams;
  const slug = one(sp.cls);
  const code = one(sp.code);
  const message = code === "PAY_PROCESS_CANCELED" ? "결제를 취소하셨어요." : one(sp.message) || "결제가 승인되지 않았어요.";
  return (
    <div className="site pg-checkout">
      <div className="topbar">
        <div className="wrap topbar-inner">
          <Link href={ROUTES.home} className="co-logo"><span className="dot" />비주얼아카데미</Link>
        </div>
      </div>
      <div className="center-state">
        <div className="result-icon fail">✕</div>
        <h2>결제가 완료되지 않았어요</h2>
        <p>{message}</p>
        <div className="fail-reason">결제 금액은 청구되지 않았어요. 다시 시도하시거나 다른 결제 수단을 이용해주세요.</div>
        <div className="center-actions">
          {slug && <Link className="btn btn-mint" href={ROUTES.checkout(slug)}>다시 결제하기</Link>}
          <Link className="btn btn-ghost" href={ROUTES.classes}>클래스 목록 보기</Link>
        </div>
        <p className="refund-note">계속 문제가 있다면 카카오채널로 문의해주세요.</p>
      </div>
    </div>
  );
}
