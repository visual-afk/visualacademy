import type { Metadata } from "next";
import AdminTopbar from "@/components/admin/AdminTopbar";
import { getInquiries } from "@/lib/api";
import Inquiries from "./Inquiries";

export const metadata: Metadata = { title: "문의함" };

export default async function InquiriesPage() {
  const inquiries = await getInquiries();
  return (
    <div className="admin-ui pg-inquiries">
      <AdminTopbar active="inquiries" />
      <Inquiries initial={inquiries} />
    </div>
  );
}
