import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";
import { getClass, getClassDetail, getInstructors } from "@/lib/api";
import { getProfile, getUser } from "@/lib/auth";
import { pickInstructor } from "@/lib/classes";
import { getAdminSupabase } from "@/lib/supabase/admin";
import ClassDetailView from "./ClassDetailView";

export async function generateMetadata({ params }: PageProps<"/classes/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const c = await getClass(slug);
  return { title: c ? c.name : "클래스" };
}

export default async function ClassDetailPage({ params }: PageProps<"/classes/[slug]">) {
  await connection();
  const { slug } = await params;
  const c = await getClass(slug);
  if (!c) notFound();
  const inst = pickInstructor(await getInstructors(), getClassDetail(c).instructorId);
  if (!inst) notFound();

  // 이미 개설 알림을 신청한 회원이면 버튼을 '알림 신청 완료'로 보여준다
  let waitlisted = false;
  if (c.type === "waitlist" || c.type === "upcoming") {
    const user = await getUser();
    const p = user ? await getProfile(user.id) : null;
    if (p?.phone) {
      const { count } = await getAdminSupabase().from("waitlist_alerts").select("id", { count: "exact", head: true }).eq("class_id", c.id).eq("phone", p.phone);
      waitlisted = Boolean(count);
    }
  }

  return (
    <div className="site pg-detail">
      <SiteHeader active={c.cat === "온라인" ? "online" : "classes"} />
      <ClassDetailView c={c} inst={inst} waitlisted={waitlisted} />
      <SiteFooter />
    </div>
  );
}
