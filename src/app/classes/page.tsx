import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";
import ClassList from "./ClassList";

export const metadata: Metadata = { title: "클래스" };

export default async function ClassesPage() {
  await connection();
  return (
    <div className="site pg-classes">
      <SiteHeader active="classes" />
      <Suspense>
        <ClassList />
      </Suspense>
      <SiteFooter />
    </div>
  );
}
