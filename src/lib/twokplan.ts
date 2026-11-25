import "server-only";
import { createClient } from "@supabase/supabase-js";

/*
 * 기존 워크시트 시스템 연결 (서버 전용) — 2000플랜 · 오토사장반은 별도 Supabase 프로젝트에 있다
 * (~/Desktop/2000planworksheet: 아임웹 위젯 → Cloudflare Workers → Supabase → Claude 채점 → Resend 메일).
 * 여기선 ① 수강생을 2000플랜 users 에 등록(만료일 동기화) ② 제출 여부 확인만 한다. 채점·메일은 Workers 가 그대로 한다.
 * 두 시스템 모두 이메일로 사람을 구분한다. env: TWOKPLAN_SUPABASE_URL · TWOKPLAN_SUPABASE_SERVICE_KEY
 */

export type WsSource = "2000plan" | "autoceo";
export type WsLink = { source: WsSource; part: number; lecture: number | null };
/** grading = 제출했고 채점 중, scored = 결과 메일까지 나감 */
export type WsState = { status: "grading" | "scored"; at: string };

/** 2000플랜 users.expires_at 은 비울 수 없어서 무제한 수강권은 먼 미래로 둔다 */
const FOREVER = "2099-12-31T14:59:59.000Z";

export const twokplanConfigured = () => Boolean(process.env.TWOKPLAN_SUPABASE_URL && process.env.TWOKPLAN_SUPABASE_SERVICE_KEY);

function db() {
  return createClient(process.env.TWOKPLAN_SUPABASE_URL!, process.env.TWOKPLAN_SUPABASE_SERVICE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const wsKey = (l: WsLink) => (l.source === "2000plan" ? `2000plan:${l.part}-${l.lecture ?? 0}` : `autoceo:${l.part}`);

/** 워커와 같은 기준 — 눈에 안 보이는 문자 제거 · 소문자 */
export const cleanEmail = (raw: string) => raw.replace(/[​-‍﻿⁠￼� \s]/g, "").toLowerCase();
export const validEmail = (e: string) => /^[\x21-\x7E]+@[\x21-\x7E]+\.[\x21-\x7E]+$/.test(e);

async function findUser(email: string) {
  // 워커 getUserByEmail 과 같이 대소문자 무시 — ilike 의 _ % 는 와일드카드라 결과에서 한 번 더 정확히 고른다
  const { data } = await db().from("users").select("id, email, name, expires_at").ilike("email", email).limit(20);
  return (data ?? []).find((u) => String(u.email).toLowerCase() === email) ?? null;
}

/**
 * 2000플랜 수강생 등록 — 위젯의 /verify 가 users 행과 만료일을 본다.
 * 이미 있으면 만료일은 늦은 쪽으로만 맞춘다 (아임웹에서 따로 산 기간을 줄이지 않게).
 */
export async function ensure2000User(email: string, name: string | null, expiresAt: string | null) {
  const exp = expiresAt ?? FOREVER;
  const u = await findUser(email);
  if (!u) {
    const { error } = await db().from("users").insert({ email, name: name || null, type: "individual", expires_at: exp });
    if (error) throw new Error(`2000플랜 수강생 등록 실패: ${error.message}`);
    return;
  }
  const patch: Record<string, string> = {};
  if (new Date(exp) > new Date(u.expires_at)) patch.expires_at = exp;
  if (!u.name && name) patch.name = name;
  if (Object.keys(patch).length) await db().from("users").update(patch).eq("id", u.id);
}

/** 이 이메일로 낸 워크시트 { [wsKey]: 상태 } — 채점 실패(error) 건은 안 낸 것으로 본다 */
export async function getWsStates(email: string, links: WsLink[]): Promise<Record<string, WsState>> {
  const out: Record<string, WsState> = {};
  const put = (key: string, status: string, at: string) => {
    const s: WsState = { status: status === "scored" ? "scored" : "grading", at };
    // 여러 번 냈으면 채점 끝난 것 > 최근 것
    const prev = out[key];
    if (!prev || (s.status === "scored" && prev.status !== "scored") || (s.status === prev.status && at > prev.at)) out[key] = s;
  };
  const plan = links.filter((l) => l.source === "2000plan");
  const auto = links.filter((l) => l.source === "autoceo");
  const [user, autoRows] = await Promise.all([
    plan.length ? findUser(email) : null,
    auto.length
      ? db().from("autoceo_submissions").select("part_number, status, created_at").eq("email", email).in("status", ["pending", "scored"])
      : null,
  ]);
  if (user) {
    const { data } = await db().from("submissions").select("part, lecture, status, submitted_at").eq("user_id", user.id).in("status", ["pending", "scored"]);
    for (const r of data ?? []) put(`2000plan:${r.part}-${r.lecture}`, r.status, r.submitted_at);
  }
  for (const r of autoRows?.data ?? []) put(`autoceo:${r.part_number}`, r.status, r.created_at);
  return out;
}

/** 관리자 수강생 화면 — 여러 사람의 낸 워크시트 키를 한 번에 { [email]: Set<wsKey> } */
export async function getWsKeysByEmails(emails: string[], links: WsLink[]): Promise<Record<string, Set<string>>> {
  const out: Record<string, Set<string>> = {};
  const add = (email: string, key: string) => (out[email] ??= new Set()).add(key);
  if (!emails.length || !links.length) return out;
  if (links.some((l) => l.source === "autoceo")) {
    const { data } = await db().from("autoceo_submissions").select("email, part_number").in("email", emails).in("status", ["pending", "scored"]);
    for (const r of data ?? []) add(r.email, `autoceo:${r.part_number}`);
  }
  if (links.some((l) => l.source === "2000plan")) {
    // users.email 은 대소문자가 섞여 있을 수 있어 소문자 비교로 고른다
    const { data: users } = await db().from("users").select("id, email").or(emails.map((e) => `email.ilike."${e}"`).join(","));
    const byId = new Map((users ?? []).filter((u) => emails.includes(String(u.email).toLowerCase())).map((u) => [u.id, String(u.email).toLowerCase()]));
    if (byId.size) {
      const { data } = await db().from("submissions").select("user_id, part, lecture").in("user_id", [...byId.keys()]).in("status", ["pending", "scored"]);
      for (const r of data ?? []) add(byId.get(r.user_id)!, `2000plan:${r.part}-${r.lecture}`);
    }
  }
  return out;
}
