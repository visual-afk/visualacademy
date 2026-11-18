/* 가격 옵션 계산 (서버·브라우저 공용) — 얼리버드는 마감일(KST, 그날 포함)까지만 적용 */
import type { AcademyClass, PriceOption } from "./types";

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

/** 개강일 없이 회차를 골라 신청하는 클래스의 일정 문구 — "4회차 · 10회차 중 선택" (옵션이 하나 이하면 null) */
export function optionLine(c: Pick<AcademyClass, "options">): string | null {
  return c.options && c.options.length > 1 ? `${c.options.map((o) => o.label.replace(/회$/, "회차")).join(" · ")} 중 선택` : null;
}
