import type { Metadata } from "next";
import { connection } from "next/server";
import { getClass } from "@/lib/api";
import { getProfile, getUser } from "@/lib/auth";
import { formatPhone } from "@/lib/format";
import { supabaseConfigured } from "@/lib/supabase/env";
import CheckoutFlow, { type Prefill } from "./CheckoutFlow";

export const metadata: Metadata = { title: "신청 · 결제" };

export default async function CheckoutPage({ searchParams }: PageProps<"/checkout">) {
  await connection();
  const sp = await searchParams;
  const raw = sp.cls;
  const cls = Array.isArray(raw) ? raw[0] : raw;
  // 상세 페이지에서 고른 가격 옵션 (?opt=1)
  const opt = Number(Array.isArray(sp.opt) ? sp.opt[0] : sp.opt);
  const c = await getClass(cls);
  const user = await getUser();
  const p = user ? await getProfile(user.id) : null;
  const prefill: Prefill | undefined = p
    ? { name: p.name ?? "", phone: p.phone ? formatPhone(p.phone) : "", email: p.email ?? "", shop: p.shop ?? "" }
    : undefined;
  return (
    <div className="site pg-checkout">
      <CheckoutFlow c={c} prefill={prefill} loggedIn={supabaseConfigured() ? !!user : undefined} initialOption={Number.isInteger(opt) ? opt : 0} />
    </div>
  );
}
