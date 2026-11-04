"use server";

import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { safeNext } from "@/lib/safeNext";
import { getAdminSupabase } from "@/lib/supabase/admin";

export type ProfileFormState = { error: string };

const normPhone = (s: string) => s.replace(/\D/g, "");

/** 첫 로그인 정보 입력 — 이름·휴대폰(알림톡·아임웹 회원 연결용)·근무 매장 */
export async function saveProfile(_: ProfileFormState, form: FormData): Promise<ProfileFormState> {
  const user = await getUser();
  if (!user) redirect("/login");
  const name = String(form.get("name") ?? "").trim();
  const phone = normPhone(String(form.get("phone") ?? ""));
  const shop = String(form.get("shop") ?? "").trim();
  if (!name) return { error: "이름을 입력해 주세요" };
  if (!/^01\d{8,9}$/.test(phone)) return { error: "휴대폰 번호를 정확히 입력해 주세요 (예: 010-1234-5678)" };

  const { error } = await getAdminSupabase()
    .from("profiles")
    .update({ name, phone, shop: shop || null, updated_at: new Date().toISOString() })
    .eq("user_id", user.id);
  if (error) return { error: "저장하지 못했어요. 잠시 후 다시 시도해 주세요." };
  redirect(safeNext(String(form.get("next") ?? ""), "/mypage"));
}
