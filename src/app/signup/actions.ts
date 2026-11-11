"use server";

import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { getAdminSupabase } from "@/lib/supabase/admin";

export type SignupState = { error: string; done?: { name: string } };

const normPhone = (s: string) => s.replace(/\D/g, "");

/** 회원가입 2단계 — 이름·휴대폰(알림톡·아임웹 회원 연결용)·근무 매장 + 약관 동의 */
export async function saveSignup(_: SignupState, form: FormData): Promise<SignupState> {
  const user = await getUser();
  if (!user) redirect("/signup");
  const name = String(form.get("name") ?? "").trim();
  const phone = normPhone(String(form.get("phone") ?? ""));
  const shop = String(form.get("shop") ?? "").trim();
  const required = ["terms", "privacy", "age"].every((k) => form.get(k) === "on");
  if (name.length < 2) return { error: "이름을 입력해 주세요" };
  if (!/^01\d{8,9}$/.test(phone)) return { error: "휴대폰 번호를 정확히 입력해 주세요 (예: 010-1234-5678)" };
  if (!required) return { error: "필수 약관에 모두 동의해 주세요" };

  const db = getAdminSupabase();
  const base = { name, phone, shop: shop || null, updated_at: new Date().toISOString() };
  let { error } = await db
    .from("profiles")
    .update({ ...base, agreed_at: new Date().toISOString(), marketing_opt_in: form.get("marketing") === "on" })
    .eq("user_id", user.id);
  // 0003 SQL 실행 전이면 동의 기록 칸이 없다 — 가입은 막지 않고 기본 정보만 저장
  if (error?.message.includes("agreed_at") || error?.message.includes("marketing_opt_in")) {
    ({ error } = await db.from("profiles").update(base).eq("user_id", user.id));
  }
  if (error) return { error: "저장하지 못했어요. 잠시 후 다시 시도해 주세요." };
  return { error: "", done: { name } };
}
