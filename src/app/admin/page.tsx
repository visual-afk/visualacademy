import type { Metadata } from "next";
import { connection } from "next/server";
import AdminTopbar from "@/components/admin/AdminTopbar";
import Dashboard from "./Dashboard";

export const metadata: Metadata = { title: "관리자 대시보드" };

export default async function AdminPage() {
  await connection();
  return (
    <div className="admin-ui pg-dashboard">
      <AdminTopbar active="dashboard" />
      <Dashboard />
    </div>
  );
}
