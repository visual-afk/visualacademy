import type { AcademyClass, TaxType } from "./types";

const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];

/** 오늘 날짜(자정 기준). 백엔드 연동 후에는 서버 시간을 쓰도록 바꿀 수 있다 */
export function today(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function parseDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function dday(dateStr: string): number {
  return Math.round((parseDate(dateStr).getTime() - today().getTime()) / 86400000);
}

/** D-5 / D-day / D+3 */
export function ddayLabel(dateStr: string): string {
  const dd = dday(dateStr);
  if (dd === 0) return "D-day";
  return dd > 0 ? `D-${dd}` : `D+${Math.abs(dd)}`;
}

export function weekday(dateStr: string): string {
  return DAY_NAMES[parseDate(dateStr).getDay()];
}

/** 2026-10-21 → 10.21(수) */
export function shortDate(dateStr: string): string {
  const d = parseDate(dateStr);
  return `${d.getMonth() + 1}.${d.getDate()}(${DAY_NAMES[d.getDay()]})`;
}

/** 2026-10-21 → 2026.10.21 (수) */
export function fullDate(dateStr: string): string {
  return `${dateStr.replace(/-/g, ".")} (${weekday(dateStr)})`;
}

export function won(n: number): string {
  return n.toLocaleString("ko-KR") + "원";
}

export function priceLabel(c: Pick<AcademyClass, "price">): string {
  if (c.price === null) return "미정";
  if (c.price === 0) return "무료";
  return won(c.price);
}

export function dayLabel(day: string | null): string {
  if (!day) return "요일 미정";
  if (day === "상시") return "상시";
  if (day === "미정") return "요일 미정";
  return `${day}요일`;
}

/** 과세 상품의 입력 가격은 부가세 포함 최종가 — 공급가액 = 가격/1.1 반올림 */
export function taxBreakdown(price: number, taxType: TaxType) {
  if (taxType === "exempt") return { supply: price, vat: 0 };
  const supply = Math.round(price / 1.1);
  return { supply, vat: price - supply };
}

export function taxNote(price: number, taxType: TaxType): string {
  if (taxType === "exempt") return "부가세 없음 (면세)";
  const { supply, vat } = taxBreakdown(price, taxType);
  return `공급가액 ${won(supply)} + 부가세 ${won(vat)}`;
}
