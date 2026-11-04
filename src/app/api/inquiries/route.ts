import { NextResponse, type NextRequest } from "next/server";
import { notifyHq } from "@/lib/notify";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { serviceRoleConfigured } from "@/lib/supabase/env";

const TYPES = ["가맹 개설 문의", "교육 제휴 문의", "기업 단체 교육 문의", "기타"];
const clip = (v: unknown, n: number) => String(v ?? "").trim().slice(0, n);

/** POST /api/inquiries — 제휴·가맹 문의 저장 + 본사 채팅 알림 (로그인 불필요) */
export async function POST(request: NextRequest) {
  if (!serviceRoleConfigured()) return NextResponse.json({ error: "아직 문의를 받을 수 없어요" }, { status: 503 });
  const b = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  // 사람 눈에 안 보이는 칸(website)이 채워져 오면 스팸 봇으로 보고 조용히 성공 처리
  if (b?.website) return NextResponse.json({ ok: true });
  const payload = {
    name: clip(b?.name, 40),
    shop: clip(b?.shop, 80),
    phone: clip(b?.phone, 20),
    type: TYPES.includes(String(b?.type)) ? String(b?.type) : "기타",
    body: clip(b?.body, 2000),
  };
  if (!payload.name || !/^[0-9-+\s]{9,20}$/.test(payload.phone)) {
    return NextResponse.json({ error: "담당자명과 연락처를 정확히 입력해주세요" }, { status: 400 });
  }
  const { error } = await getAdminSupabase().from("inquiries").insert({ kind: "partner", payload });
  if (error) return NextResponse.json({ error: "접수하지 못했어요. 잠시 후 다시 시도해주세요." }, { status: 500 });
  await notifyHq(`📮 ${payload.type} · ${payload.name}${payload.shop ? ` (${payload.shop})` : ""} · ${payload.phone}\n${payload.body.slice(0, 300)}`);
  return NextResponse.json({ ok: true });
}
