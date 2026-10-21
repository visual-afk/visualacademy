import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";
import { getClass } from "@/lib/api";
import ClassDetailView from "./ClassDetailView";

export async function generateMetadata({ params }: PageProps<"/classes/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const c = getClass(slug);
  return { title: c ? c.name : "클래스" };
}

export default async function ClassDetailPage({ params }: PageProps<"/classes/[slug]">) {
  await connection();
  const { slug } = await params;
  const c = getClass(slug);
  if (!c) notFound();

  return (
    <div className="site pg-detail">
      <SiteHeader active={c.cat === "온라인" ? "online" : "classes"} />
      <ClassDetailView slug={c.slug} />
      <SiteFooter />
    </div>
  );
}
