import type { Metadata } from "next";
import AdminTopbar from "@/components/admin/AdminTopbar";
import { getPayments } from "@/lib/api";
import Payments from "./Payments";

export const metadata: Metadata = { title: "결제 관리" };

export default async function PaymentsPage() {
  const payments = await getPayments();
  return (
    <div className="admin-ui pg-payments">
      <AdminTopbar active="payments" />
      <Payments initial={payments} />
    </div>
  );
}
