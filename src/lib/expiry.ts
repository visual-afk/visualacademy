/* 수강기한 계산 — 서버(lib/enrollments.ts)와 관리자 화면 미리보기가 같이 쓴다. expires_at = null 은 무제한 */

export function addMonths(from: Date, months: number): Date {
  const d = new Date(from);
  d.setMonth(d.getMonth() + months);
  return d;
}

/** 연장 기준 — 남은 기한이 있으면 그 끝에서, 이미 지났거나 무제한이면 지금부터 */
export const extendBase = (expiresAt: string | null) => (expiresAt && new Date(expiresAt) > new Date() ? new Date(expiresAt) : new Date());

/** 기한 바꾸는 방법 — 날짜 지정(KST 그날 23:59까지) · +N일 · +N개월(남은 기한에 이어서) · 무제한 */
export type ExpiryChange =
  | { mode: "date"; date: string }
  | { mode: "days"; n: number }
  | { mode: "months"; n: number }
  | { mode: "unlimited" };

export function nextExpiry(current: string | null, c: ExpiryChange): string | null {
  switch (c.mode) {
    case "unlimited":
      return null;
    case "date":
      return new Date(`${c.date}T23:59:59+09:00`).toISOString();
    case "days":
      return new Date(extendBase(current).getTime() + c.n * 86400 * 1000).toISOString();
    case "months":
      return addMonths(extendBase(current), c.n).toISOString();
  }
}

/** 관리자 API 요청 본문 → ExpiryChange (잘못되면 null) */
export function parseExpiryChange(v: unknown): ExpiryChange | null {
  const c = v as { mode?: string; date?: unknown; n?: unknown } | null;
  if (!c) return null;
  if (c.mode === "unlimited") return { mode: "unlimited" };
  if (c.mode === "date") return typeof c.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(c.date) ? { mode: "date", date: c.date } : null;
  const n = Number(c.n);
  if ((c.mode === "days" || c.mode === "months") && Number.isInteger(n) && n > 0 && n <= (c.mode === "days" ? 3650 : 120)) return { mode: c.mode, n };
  return null;
}

/** 만료까지 남은 날 (KST 날짜 기준, 지났으면 음수) · null = 무제한 */
export function daysLeft(expiresAt: string | null, now = new Date()): number | null {
  if (!expiresAt) return null;
  const day = (d: Date) => Math.floor((d.getTime() + 9 * 3600 * 1000) / 86400000);
  return day(new Date(expiresAt)) - day(now);
}

/** ISO → 2026.11.25 (KST) */
export const expiryLabel = (iso: string | null) =>
  iso ? new Date(new Date(iso).getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10).replaceAll("-", ".") : "무제한";
