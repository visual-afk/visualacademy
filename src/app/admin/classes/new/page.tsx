import type { Metadata } from "next";
import AdminTopbar from "@/components/admin/AdminTopbar";
import ClassForm from "../ClassForm";

export const metadata: Metadata = { title: "새 클래스 등록" };

export default function NewClassPage() {
  return (
    <div className="admin-ui pg-class-form">
      <AdminTopbar active="dashboard" />
      <ClassForm mode="basic" />
    </div>
  );
}