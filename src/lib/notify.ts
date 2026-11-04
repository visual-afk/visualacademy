/*
 * 알림 (서버 전용) — 카카오 알림톡(Solapi) + 본사 Google Chat.
 * 키·템플릿이 없으면 조용히 건너뛴다 → 키만 .env/Vercel 에 넣으면 켜진다. 알림 실패가 결제·신청을 막지 않도록 절대 throw 하지 않는다.
 * visual-auto lib/notifications/kakao.ts 와 같은 Solapi 방식. 발신 프로필은 아카데미 채널(KAKAO_SENDER_KEY)만 쓴다 (살롱 채널로 나가지 않게 기본값 없음).
 *
 * 환경변수: SOLAPI_API_KEY, SOLAPI_API_SECRET, KAKAO_SENDER_KEY(아카데미 채널 pfId), KAKAO_SENDER_PHONE(선택, SMS 대체)
 *          KAKAO_TMPL_PAID · KAKAO_TMPL_VBANK · KAKAO_TMPL_D3 · KAKAO_TMPL_EXPIRE30 · KAKAO_TMPL_WAITLIST_OPEN (알림톡 템플릿 ID)
 *          ACADEMY_CHAT_WEBHOOK_URL (본사 Google Chat 스페이스 webhook)
 */
import crypto from "crypto";
import { getAdminSupabase } from "./supabase/admin";

export type NotifyKind = "paid" | "vbank" | "d-3" | "expire-30" | "waitlist-open";

const TEMPLATE_ENV: Record<NotifyKind, string> = {
  paid: "KAKAO_TMPL_PAID",
  vbank: "KAKAO_TMPL_VBANK",
  "d-3": "KAKAO_TMPL_D3",
  "expire-30": "KAKAO_TMPL_EXPIRE30",
  "waitlist-open": "KAKAO_TMPL_WAITLIST_OPEN",
};

function alimtalkReady(kind: NotifyKind): string | null {
  if (!process.env.SOLAPI_API_KEY || !process.env.SOLAPI_API_SECRET || !process.env.KAKAO_SENDER_KEY) return null;
  return process.env[TEMPLATE_ENV[kind]] || null;
}

function solapiAuth(): string {
  const date = new Date().toISOString();
  const salt = crypto.randomBytes(32).toString("hex");
  const signature = crypto.createHmac("sha256", process.env.SOLAPI_API_SECRET!).update(date + salt).digest("hex");
  return `HMAC-SHA256 apiKey=${process.env.SOLAPI_API_KEY}, date=${date}, salt=${salt}, signature=${signature}`;
}

async function sendAlimtalk(to: string, templateId: string, variables: Record<string, string>) {
  const from = (process.env.KAKAO_SENDER_PHONE || "").replace(/\D/g, "");
  const res = await fetch("https://api.solapi.com/messages/v4/send", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: solapiAuth() },
    body: JSON.stringify({
      message: { to, from: from || undefined, type: "ATA", kakaoOptions: { pfId: process.env.KAKAO_SENDER_KEY, templateId, variables } },
    }),
  });
  const text = await res.text().catch(() => "");
  return { ok: res.ok, status: res.status, body: text.slice(0, 500) };
}

/**
 * 같은 알림을 두 번 보내지 않는다 — notification_log(kind, ref_id) 유니크로 먼저 자리를 잡고 보낸다.
 * 키·템플릿이 아직 없으면 기록도 남기지 않는다(나중에 켜졌을 때 웹훅 재시도 등으로 보낼 수 있게).
 */
export async function notifyOnce(kind: NotifyKind, refId: string, phone: string | null | undefined, variables: Record<string, string>) {
  try {
    const templateId = alimtalkReady(kind);
    const to = (phone ?? "").replace(/\D/g, "");
    if (!templateId || !to) return { sent: false, reason: templateId ? "no_recipient" : "not_configured" };

    const db = getAdminSupabase();
    const { error: dup } = await db.from("notification_log").insert({ kind, ref_id: refId, phone: to });
    if (dup) return { sent: false, reason: "already_sent" };

    const r = await sendAlimtalk(to, templateId, variables);
    await db.from("notification_log").update({ result: r }).eq("kind", kind).eq("ref_id", refId);
    if (!r.ok) console.error("[alimtalk] failed", kind, refId, r.status, r.body);
    return { sent: r.ok, reason: r.ok ? undefined : `http_${r.status}` };
  } catch (e) {
    console.error("[alimtalk] error", kind, refId, (e as Error).message);
    return { sent: false, reason: "exception" };
  }
}

/** 본사 Google Chat 스페이스로 한 줄 알림 (새 신청·문의 등) */
export async function notifyHq(text: string) {
  const url = process.env.ACADEMY_CHAT_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, { method: "POST", headers: { "Content-Type": "application/json; charset=UTF-8" }, body: JSON.stringify({ text }) });
  } catch (e) {
    console.error("[chat] error", (e as Error).message);
  }
}
