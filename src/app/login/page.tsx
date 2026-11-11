import type { Metadata } from "next";
import { redirect } from "next/navigation";
import SiteFooter from "@/components/site/SiteFooter";
import { getUser } from "@/lib/auth";
import { safeNext } from "@/lib/safeNext";
import { supabaseConfigured } from "@/lib/supabase/env";
import LoginFlow from "./LoginFlow";

export const metadata: Metadata = { title: "로그인" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  /* 로그인 후 돌아갈 주소 — 신청·결제에서 넘어왔을 때만 있다 */
  const next = safeNext(typeof sp.next === "string" ? sp.next : null, "") || null;
  const error = typeof sp.error === "string" ? sp.error : "";
  if (await getUser()) redirect(next ?? "/mypage");

  return (
    <div className="site pg-login">
      <LoginFlow next={next} real={supabaseConfigured()} error={error} />
      <SiteFooter />
    </div>
  );
}
