import { NextResponse, type NextRequest } from "next/server";
import { bad, guardAdmin } from "@/lib/adminApi";
import { sanitizeDetailHtml } from "@/lib/detailHtml";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { IMAGE_BUCKET } from "@/lib/uploads";

/** detailHtml: 상세 본문(글·사진). 키가 없으면 건드리지 않고, null·빈 문자열이면 지운다 */
type Body = { thumb: string | null; banner: string | null; detail: string | null; detailHtml?: string | null };

/** PUT /api/admin/classes/:id/content — 썸네일 · 배너 · 상세 이미지 주소 + 상세 본문 저장 (업로드는 /api/admin/uploads) */
export async function PUT(request: NextRequest, { params }: RouteContext<"/api/admin/classes/[id]/content">) {
  const denied = await guardAdmin();
  if (denied) return denied;
  const id = Number((await params).id);
  const b = (await request.json().catch(() => null)) as Body | null;
  if (!b) return bad("요청 형식이 올바르지 않아요");

  // 우리 저장소에 올린 이미지 주소만 받는다
  const prefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${IMAGE_BUCKET}/`;
  for (const u of [b.thumb, b.banner, b.detail]) {
    if (u != null && !u.startsWith(prefix)) return bad("업로드한 이미지 주소가 올바르지 않아요");
  }

  const db = getAdminSupabase();
  const row: Record<string, unknown> = {
    class_id: id,
    thumbnail_url: b.thumb,
    banner_url: b.banner,
    detail_image_url: b.detail,
    updated_at: new Date().toISOString(),
  };
  if (b.detailHtml !== undefined) {
    // 본문 사진은 우리 저장소 주소만 남긴다 (아임웹에서 옮긴 사진도 이미 우리 저장소에 있음)
    const html = b.detailHtml ? sanitizeDetailHtml(b.detailHtml, (src) => (src.startsWith(prefix) ? src : null)).trim() : "";
    const { data: cc } = await db.from("class_contents").select("detail").eq("class_id", id).maybeSingle();
    const detail = { ...((cc?.detail as Record<string, unknown> | null) ?? {}) };
    if (html) detail.detailHtml = html;
    else delete detail.detailHtml;
    row.detail = detail;
  }

  const { error } = await db.from("class_contents").upsert(row);
  if (error) return bad(`저장하지 못했어요: ${error.message}`, 500);
  return NextResponse.json({ ok: true });
}
