import type { Metadata } from "next";
import AdminTopbar from "@/components/admin/AdminTopbar";
import Payments from "./Payments";

export const metadata: Metadata = { title: "결제 관리" };

export default function PaymentsPage() {
  return (
    <div className="admin-ui pg-payments">
      <AdminTopbar active="payments" />
      <Payments />
    </div>
  );
}
