/* 가격 옵션 계산 (서버·브라우저 공용) — 얼리버드는 마감일(KST, 그날 포함)까지만 적용 */
import type { PriceOption } from "./types";

export const todayKst = () => new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);

export function earlyActive(o: PriceOption, today = todayKst()): boolean {
  return o.earlyPrice != null && !!o.earlyUntil && today <= o.earlyUntil;
}

/** 지금 결제할 금액 */
export function optionPrice(o: PriceOption, today = todayKst()): number {
  return earlyActive(o, today) ? o.earlyPrice! : o.price;
}

/** 취소선으로 보여줄 원래 가격 (할인이 없으면 null) */
export function optionCompare(o: PriceOption, today = todayKst()): number | null {
  const now = optionPrice(o, today);
  const before = earlyActive(o, today) ? Math.max(o.listPrice ?? 0, o.price) : (o.listPrice ?? 0);
  return before > now ? before : null;
}

export const discountPct = (before: number, now: number) => Math.round((1 - now / before) * 100);
