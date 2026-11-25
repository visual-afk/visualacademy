import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AdminTopbar from "@/components/admin/AdminTopbar";
import { getClassById } from "@/lib/api";
import { getStudents } from "@/lib/enrollments";
import { serviceRoleConfigured } from "@/lib/supabase/env";
import Students from "./Students";

export const metadata: Metadata = { title: "수강생 관리" };

export default async function StudentsPage({ params }: PageProps<"/admin/classes/[id]/students">) {
  const c = await getClassById(Number((await params).id));
  if (!c || c.type !== "online") notFound();
  const students = serviceRoleConfigured() ? await getStudents(c.id) : [];
  return (
    <div className="admin-ui pg-payments pg-students">
      <AdminTopbar active="dashboard" />
      <Students cls={{ id: c.id, name: c.name, months: c.months ?? null }} students={students} />
    </div>
  );
}
