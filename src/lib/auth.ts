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
  /** 회원가입(약관 동의)을 마친 시각 — 없으면 /signup 으로 보낸다 */
  agreed_at: string | null;
};

/** 카카오 동의항목 이름·전화번호 (provider_token 으로 직접 조회) */
export type KakaoAccount = { name: string | null; phone: string | null };

/** +82 10-1234-5678 → 01012345678 */
const kakaoPhone = (v?: string) => (v ? v.replace(/^\+82\s*/, "0").replace(/\D/g, "") : null);

export async function fetchKakaoAccount(providerToken: string | null | undefined): Promise<KakaoAccount> {
  if (!providerToken) return { name: null, phone: null };
  try {
    const res = await fetch("https://kapi.kakao.com/v2/user/me", { headers: { Authorization: `Bearer ${providerToken}` }, cache: "no-store" });
    if (!res.ok) return { name: null, phone: null };
    const a = ((await res.json()) as { kakao_account?: { name?: string; phone_number?: string } }).kakao_account ?? {};
    const phone = kakaoPhone(a.phone_number);
    return { name: a.name ?? null, phone: phone && /^01\d{8,9}$/.test(phone) ? phone : null };
  } catch {
    return { name: null, phone: null };
  }
}

/** 로그인한 고객 (proxy 가 매 요청 토큰을 검증·갱신한다) */
export async function getUser(): Promise<User | null> {
  if (!supabaseConfigured()) return null;
  const { data } = await (await getServerSupabase()).auth.getUser();
  return data.user;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data } = await getAdminSupabase()
    .from("profiles")
    .select("id, user_id, name, phone, email, shop, agreed_at")
    .eq("user_id", userId)
    .maybeSingle();
  return data as Profile | null;
}

/** 카카오 로그인 직후 — 회원 행이 없으면 만든다. 휴대폰이 비어 있으면 호출한 쪽이 입력 화면으로 보낸다 */
export async function ensureProfile(user: User, kakao: KakaoAccount = { name: null, phone: null }): Promise<Profile> {
  const cols = "id, user_id, name, phone, email, shop, agreed_at";
  const db = getAdminSupabase();
  const existing = await getProfile(user.id);
  if (existing) {
    // 예전에 휴대폰 없이 만들어진 회원 — 카카오 값으로 빈 칸만 채운다
    if ((!existing.phone && kakao.phone) || (!existing.name && kakao.name)) {
      const { data } = await db
        .from("profiles")
        .update({ phone: existing.phone ?? kakao.phone, name: existing.name ?? kakao.name, updated_at: new Date().toISOString() })
        .eq("id", existing.id)
        .select(cols)
        .single();
      return (data as Profile | null) ?? existing;
    }
    return existing;
  }
  const meta = user.user_metadata ?? {};
  const kakaoId = meta.provider_id ?? meta.sub ?? null;

  // 아임웹에서 옮겨 온 회원(아직 로그인 계정 없음)과 휴대폰이 같으면 그 회원에 연결한다 — 지난 수강·결제 내역이 이어진다
  if (kakao.phone) {
    const { data: migrated } = await db.from("profiles").select("id, email").is("user_id", null).eq("phone", kakao.phone).limit(1).maybeSingle();
    if (migrated) {
      const { data, error } = await db
        .from("profiles")
        .update({ user_id: user.id, kakao_id: kakaoId, email: migrated.email ?? user.email ?? null, updated_at: new Date().toISOString() })
        .eq("id", migrated.id)
        .select(cols)
        .single();
      if (!error && data) return data as Profile;
    }
  }

  const { data, error } = await db
    .from("profiles")
    .insert({
      user_id: user.id,
      name: kakao.name ?? meta.name ?? meta.full_name ?? meta.nickname ?? null,
      phone: kakao.phone,
      email: user.email ?? null,
      kakao_id: kakaoId,
    })
    .select(cols)
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
