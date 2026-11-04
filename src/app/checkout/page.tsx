import type { Metadata } from "next";
import { connection } from "next/server";
import { getClass } from "@/lib/api";
import { getProfile, getUser } from "@/lib/auth";
import { formatPhone } from "@/lib/format";
import CheckoutFlow, { type Prefill } from "./CheckoutFlow";

export const metadata: Metadata = { title: "신청 · 결제" };

export default async function CheckoutPage({ searchParams }: PageProps<"/checkout">) {
  await connection();
  const raw = (await searchParams).cls;
  const cls = Array.isArray(raw) ? raw[0] : raw;
  const c = await getClass(cls);
  const user = await getUser();
  const p = user ? await getProfile(user.id) : null;
  const prefill: Prefill | undefined = p
    ? { name: p.name ?? "", phone: p.phone ? formatPhone(p.phone) : "", email: p.email ?? "", shop: p.shop ?? "" }
    : undefined;
  return (
    <div className="site pg-checkout">
      <CheckoutFlow c={c} prefill={prefill} />
    </div>
  );
}
