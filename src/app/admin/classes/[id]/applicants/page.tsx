import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AdminTopbar from "@/components/admin/AdminTopbar";
import { getClassById } from "@/lib/api";
import { getApplicants } from "@/lib/applicants";
import { serviceRoleConfigured } from "@/lib/supabase/env";
import Applicants from "./Applicants";

export const metadata: Metadata = { title: "신청자 목록" };

export default async function ApplicantsPage({ params }: PageProps<"/admin/classes/[id]/applicants">) {
  const c = await getClassById(Number((await params).id));
  if (!c) notFound();
  const data = serviceRoleConfigured() ? await getApplicants(c.id) : { applicants: [], waitlist: [] };
  return (
    <div className="admin-ui pg-payments">
      <AdminTopbar active="dashboard" />
      <Applicants cls={{ name: c.name, capacity: c.capacity ?? null, date: c.date ?? null, type: c.type }} {...data} />
    </div>
  );
}
