import { NextResponse, type NextRequest } from "next/server";
import { bad, guardAdmin } from "@/lib/adminApi";
import { classColumns, detailPatch, newSlug, validateClassInput, type ClassInput } from "@/lib/classInput";
import { getAdminSupabase } from "@/lib/supabase/admin";

/** POST /api/admin/classes — 새 클래스 등록 (draft: true 면 임시저장, 고객 화면에 안 보임) */
export async function POST(request: NextRequest) {
  const denied = await guardAdmin();
  if (denied) return denied;
  const v = (await request.json().catch(() => null)) as ClassInput | null;
  if (!v) return bad("요청 형식이 올바르지 않아요");
  const err = validateClassInput(v);
  if (err) return bad(err);

  const db = getAdminSupabase();
  const { data: last } = await db.from("classes").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
  const { data, error } = await db
    .from("classes")
    .insert({ ...classColumns(v), slug: newSlug(v.cat), sort_order: (last?.sort_order ?? 0) + 1 })
    .select("id, slug")
    .single();
  if (error) return bad(`저장하지 못했어요: ${error.message}`, 500);

  await db.from("class_contents").insert({ class_id: data.id, detail: detailPatch(v) });
  return NextResponse.json(data);
}
