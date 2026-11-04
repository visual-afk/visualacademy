/* 고객·관리자 로그인 정보 조회 (서버 전용) */
import type { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, adminGateEnabled, verifyAdminSession, type AdminSession } from "./adminSession";
import { getAdminSupabase } from "./supabase/admin";
import { serviceRoleConfigured, supabaseConfigured } from "./supabase/env";
import { getServerSupabase } from "./supabase/server";

export type Profile = {
  id: string;
  user_id: string | null;
  name: string | null;
  phone: string | null;
  email: string | null;
  shop: string | null;
};

/** 로그인한 고객 (proxy 가 매 요청 토큰을 검증·갱신한다) */
export async function getUser(): Promise<User | null> {
  if (!supabaseConfigured()) return null;
  const { data } = await (await getServerSupabase()).auth.getUser();
  return data.user;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data } = await getAdminSupabase()
    .from("profiles")
    .select("id, user_id, name, phone, email, shop")
    .eq("user_id", userId)
    .maybeSingle();
  return data as Profile | null;
}

/** 카카오 로그인 직후 — 회원 행이 없으면 만든다. 휴대폰이 비어 있으면 호출한 쪽이 입력 화면으로 보낸다 */
export async function ensureProfile(user: User): Promise<Profile> {
  const existing = await getProfile(user.id);
  if (existing) return existing;
  const meta = user.user_metadata ?? {};
  const { data, error } = await getAdminSupabase()
    .from("profiles")
    .insert({
      user_id: user.id,
      name: meta.name ?? meta.full_name ?? meta.nickname ?? null,
      email: user.email ?? null,
      kakao_id: meta.provider_id ?? meta.sub ?? null,
    })
    .select("id, user_id, name, phone, email, shop")
    .single();
  if (error) throw new Error(`회원 생성 실패: ${error.message}`);
  return data as Profile;
}

/** 카카오 계정이 관리자 허용 목록에 있는지 (미리 이메일로 등록해 둔 사람은 이때 user_id 를 연결) */
export async function findKakaoAdmin(user: User): Promise<{ name: string } | null> {
  if (!serviceRoleConfigured()) return null;
  const db = getAdminSupabase();
  const { data: byId } = await db.from("admins").select("name").eq("user_id", user.id).maybeSingle();
  if (byId) return byId;
  if (!user.email) return null;
  const { data: byEmail } = await db.from("admins").select("id, name").eq("email", user.email).is("user_id", null).maybeSingle();
  if (!byEmail) return null;
  await db.from("admins").update({ user_id: user.id }).eq("id", byEmail.id);
  return { name: byEmail.name };
}

/** 현재 관리자 세션. 게이트가 꺼져 있으면(목업 단계) 임시 관리자로 본다 */
export async function getAdmin(): Promise<AdminSession | null> {
  if (!adminGateEnabled()) return { sub: "dev", name: "개발 모드", via: "visual-auto", exp: Infinity };
  return verifyAdminSession((await cookies()).get(ADMIN_COOKIE)?.value);
}
