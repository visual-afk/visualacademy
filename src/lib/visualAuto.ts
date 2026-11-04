/*
 * visual-auto(사내 업무 앱) 계정으로 관리자 로그인 — 본사(hq_admin)만 통과.
 * 그 사람의 세션으로 본인 branch_users 행만 읽으므로 visual-auto 서비스 키는 필요 없다.
 */
import { createClient } from "@supabase/supabase-js";

/** visual-auto 로그인 아이디(휴대폰/핸들) → synthetic email — visual-auto lib/login-email.ts 와 같은 규칙 */
function loginIdToEmail(loginId: string): string {
  const safe = loginId.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
  return `${safe}@visual.local`;
}

export type VisualAutoResult = { ok: true; userId: string; name: string } | { ok: false; reason: string };

export async function verifyVisualAutoHq(loginId: string, password: string): Promise<VisualAutoResult> {
  const url = process.env.VISUAL_AUTO_SUPABASE_URL;
  const key = process.env.VISUAL_AUTO_SUPABASE_ANON_KEY;
  if (!url || !key) return { ok: false, reason: "visual-auto 연결 설정이 아직 없어요" };

  const va = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await va.auth.signInWithPassword({ email: loginIdToEmail(loginId), password });
  if (error || !data.user) return { ok: false, reason: "아이디 또는 비밀번호가 맞지 않아요" };

  const { data: member } = await va
    .from("branch_users")
    .select("display_name, role, is_active")
    .eq("user_id", data.user.id)
    .maybeSingle();
  // scope local: 이 서버 메모리의 세션만 버린다 (global 이면 그 사람의 visual-auto 로그인까지 끊긴다)
  await va.auth.signOut({ scope: "local" });

  if (!member || member.is_active === false) return { ok: false, reason: "visual-auto 멤버가 아니에요" };
  if (member.role !== "hq_admin") return { ok: false, reason: "본사 계정만 관리자 화면에 들어올 수 있어요" };
  return { ok: true, userId: data.user.id, name: member.display_name ?? "본사" };
}
