import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";
import { getClass, getClassDetail, getInstructors } from "@/lib/api";
import { pickInstructor } from "@/lib/classes";
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

  return (
    <div className="site pg-detail">
      <SiteHeader active={c.cat === "온라인" ? "online" : "classes"} />
      <ClassDetailView c={c} inst={inst} />
      <SiteFooter />
    </div>
  );
}
