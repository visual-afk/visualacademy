import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AdminTopbar from "@/components/admin/AdminTopbar";
import { getClassById } from "@/lib/api";
import { serviceRoleConfigured } from "@/lib/supabase/env";
import { getClassVideos } from "@/lib/vod";
import VideoEditor from "./VideoEditor";

export const metadata: Metadata = { title: "강의 영상 관리" };

export default async function VideosPage({ params }: PageProps<"/admin/classes/[id]/videos">) {
  const c = await getClassById(Number((await params).id));
  if (!c || c.type !== "online") notFound();
  const videos = serviceRoleConfigured() ? await getClassVideos(c.id) : [];
  return (
    <div className="admin-ui pg-payments">
      <AdminTopbar active="dashboard" />
      <VideoEditor
        classId={c.id}
        name={c.name}
        initial={videos.map((v) => ({ id: v.id, title: v.title, url: `https://vimeo.com/${v.vimeoId}${v.vimeoHash ? `/${v.vimeoHash}` : ""}` }))}
      />
    </div>
  );
}
