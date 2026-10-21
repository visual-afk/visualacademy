import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AdminTopbar from "@/components/admin/AdminTopbar";
import { getClassById } from "@/lib/api";
import ClassForm from "../../ClassForm";

export async function generateMetadata({ params }: PageProps<"/admin/classes/[id]/edit">): Promise<Metadata> {
  const c = getClassById(Number((await params).id));
  return { title: c ? `${c.name} 편집` : "클래스 편집" };
}

export default async function EditClassPage({ params }: PageProps<"/admin/classes/[id]/edit">) {
  const c = getClassById(Number((await params).id));
  if (!c) notFound();
  return (
    <div className="admin-ui pg-class-form">
      <AdminTopbar active="dashboard" />
      <ClassForm mode="basic" classId={c.id} />
    </div>
  );
}