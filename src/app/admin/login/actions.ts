"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, adminCookieOptions, signAdminSession } from "@/lib/adminSession";
import { verifyVisualAutoHq } from "@/lib/visualAuto";

export type AdminLoginState = { error: string };

/** visual-auto 계정으로 관리자 로그인 — 본사(hq_admin)만 통과 */
export async function loginWithVisualAuto(_: AdminLoginState, form: FormData): Promise<AdminLoginState> {
  const loginId = String(form.get("loginId") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!loginId || !password) return { error: "아이디와 비밀번호를 입력해 주세요" };

  const r = await verifyVisualAutoHq(loginId, password);
  if (!r.ok) return { error: r.reason };

  const { value, maxAge } = await signAdminSession({ sub: `va:${r.userId}`, name: r.name, via: "visual-auto" });
  (await cookies()).set(ADMIN_COOKIE, value, adminCookieOptions(maxAge));
  redirect("/admin");
}
