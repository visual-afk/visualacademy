import { NextResponse, type NextRequest } from "next/server";
import { bad, guardAdmin } from "@/lib/adminApi";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { IMAGE_BUCKET, IMAGE_TYPES, MAX_IMAGE_BYTES, type ImageSlot } from "@/lib/uploads";

type Body = { classId: number; slot: ImageSlot; contentType: string; size: number };

/**
 * POST /api/admin/uploads — 이미지 1장 업로드용 서명 주소 발급.
 * 파일은 브라우저가 Supabase Storage 로 직접 올리고(서버 용량 제한 회피), 끝나면 publicUrl 을 콘텐츠 저장 API 에 넘긴다.
 */
export async function POST(request: NextRequest) {
  const denied = await guardAdmin();
  if (denied) return denied;
  const b = (await request.json().catch(() => null)) as Body | null;
  if (!b || !Number.isInteger(b.classId) || !["thumb", "banner", "detail"].includes(b.slot)) return bad("요청 형식이 올바르지 않아요");
  const ext = IMAGE_TYPES[b.contentType];
  if (!ext) return bad("JPG · PNG · WEBP · GIF 이미지만 올릴 수 있어요");
  if (!(b.size > 0 && b.size <= MAX_IMAGE_BYTES)) return bad("이미지는 10MB 이하로 올려주세요");

  const path = `classes/${b.classId}/${b.slot}-${Date.now().toString(36)}.${ext}`;
  const storage = getAdminSupabase().storage.from(IMAGE_BUCKET);
  const { data, error } = await storage.createSignedUploadUrl(path);
  if (error) return bad(`업로드 주소를 만들지 못했어요: ${error.message}`, 500);
  return NextResponse.json({ path, token: data.token, publicUrl: storage.getPublicUrl(path).data.publicUrl });
}
