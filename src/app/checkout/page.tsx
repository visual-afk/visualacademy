import type { Metadata } from "next";
import { connection } from "next/server";
import CheckoutFlow from "./CheckoutFlow";

export const metadata: Metadata = { title: "신청 · 결제" };

export default async function CheckoutPage({ searchParams }: PageProps<"/checkout">) {
  await connection();
  const raw = (await searchParams).cls;
  const cls = Array.isArray(raw) ? raw[0] : raw;
  return (
    <div className="site pg-checkout">
      <CheckoutFlow slug={cls ?? null} />
    </div>
  );
}
