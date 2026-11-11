/*
 * 관리자 세션 쿠키 — visual-auto 계정·카카오 로그인 두 경로를 하나의 서명 쿠키로 합친다.
 * Web Crypto(HMAC-SHA256)만 써서 proxy(엣지)와 서버 양쪽에서 같은 코드로 검증한다.
 */

export const ADMIN_COOKIE = "va_admin";
const MAX_AGE_SEC = 60 * 60 * 12; // 12시간

export type AdminSession = { sub: string; name: string; via: "visual-auto" | "kakao"; exp: number };

const enc = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let s = "";
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64url(s: string): Uint8Array {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function hmac(data: string): Promise<string> {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("ADMIN_SESSION_SECRET 미설정");
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(data))));
}

/** 관리자 게이트를 켤지 — 비밀값이 없으면(목업 단계) 관리자 화면을 그대로 연다 */
export function adminGateEnabled(): boolean {
  return Boolean(process.env.ADMIN_SESSION_SECRET);
}

export async function signAdminSession(s: Omit<AdminSession, "exp">): Promise<{ value: string; maxAge: number }> {
  const payload = b64url(enc.encode(JSON.stringify({ ...s, exp: Math.floor(Date.now() / 1000) + MAX_AGE_SEC })));
  return { value: `${payload}.${await hmac(payload)}`, maxAge: MAX_AGE_SEC };
}

export async function verifyAdminSession(value: string | undefined): Promise<AdminSession | null> {
  if (!value || !adminGateEnabled()) return null;
  const [payload, sig] = value.split(".");
  if (!payload || !sig) return null;
  // 길이가 같을 때만 비교 — 서명은 항상 같은 길이라 타이밍 차이로 새는 정보가 없다
  const expected = await hmac(payload);
  if (expected.length !== sig.length) return null;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  if (diff !== 0) return null;
  try {
    const s = JSON.parse(new TextDecoder().decode(fromB64url(payload))) as AdminSession;
    return s.exp > Date.now() / 1000 ? s : null;
  } catch {
    return null;
  }
}

export const adminCookieOptions = (maxAge: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge,
});
