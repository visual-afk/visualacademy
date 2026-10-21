import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AdminTopbar from "@/components/admin/AdminTopbar";
import { getClassById } from "@/lib/api";
import ClassForm from "../../ClassForm";

export async function generateMetadata({ params }: PageProps<"/admin/classes/[id]/content">): Promise<Metadata> {
  const c = getClassById(Number((await params).id));
  return { title: c ? `${c.name} 콘텐츠 관리` : "클래스 콘텐츠 관리" };
}

export default async function ClassContentPage({ params }: PageProps<"/admin/classes/[id]/content">) {
  const c = getClassById(Number((await params).id));
  if (!c) notFound();
  return (
    <div className="admin-ui pg-class-form">
      <AdminTopbar active="dashboard" />
      <ClassForm mode="content" classId={c.id} />
    </div>
  );
}