/** 로그인 후 돌아갈 주소 — 우리 사이트 안쪽 경로만 허용 (//evil.com 같은 외부 이동 차단) */
export function safeNext(raw: string | null | undefined, fallback = "/"): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return fallback;
  return raw;
}
