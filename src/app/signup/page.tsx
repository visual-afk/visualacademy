import type { Metadata } from "next";
import { redirect } from "next/navigation";
import SiteFooter from "@/components/site/SiteFooter";
import { getProfile, getUser } from "@/lib/auth";
import { formatPhone } from "@/lib/format";
import { safeNext } from "@/lib/safeNext";
import { supabaseConfigured } from "@/lib/supabase/env";
import SignupFlow from "./SignupFlow";

export const metadata: Metadata = { title: "회원가입" };

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const sp = await searchParams;
  const next = safeNext(typeof sp.next === "string" ? sp.next : null, "") || null;
  const real = supabaseConfigured();
  const user = real ? await getUser() : null;
  const profile = user ? await getProfile(user.id) : null;
  /* 이미 가입을 마친 회원 */
  if (profile?.name && profile.phone) redirect(next ?? "/mypage");

  const meta = user?.user_metadata ?? {};
  return (
    <div className="site pg-login">
      <SignupFlow
        next={next}
        real={real}
        signedIn={!!user}
        prefill={{
          name: profile?.name ?? meta.name ?? meta.full_name ?? meta.nickname ?? "",
          phone: profile?.phone ? formatPhone(profile.phone) : "",
        }}
      />
      <SiteFooter />
    </div>
  );
}
