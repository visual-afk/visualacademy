import { NextResponse, type NextRequest } from "next/server";
import { getClass } from "@/lib/api";
import { getProfile, getUser } from "@/lib/auth";
import { getAdminSupabase } from "@/lib/supabase/admin";

/** POST /api/classes/:slug/waitlist — 개설 알림 신청 (로그인 회원의 휴대폰으로, 일정이 정해지면 알림톡) */
export async function POST(_: NextRequest, { params }: RouteContext<"/api/classes/[slug]/waitlist">) {
  const user = await getUser();
  const profile = user ? await getProfile(user.id) : null;
  if (!profile?.phone) return NextResponse.json({ error: "로그인이 필요해요" }, { status: 401 });

  const c = await getClass((await params).slug);
  if (!c || (c.type !== "waitlist" && c.type !== "upcoming")) return NextResponse.json({ error: "개설 알림을 받을 수 없는 클래스예요" }, { status: 409 });

  const { error } = await getAdminSupabase()
    .from("waitlist_alerts")
    .upsert({ class_id: c.id, profile_id: profile.id, phone: profile.phone }, { onConflict: "class_id,phone", ignoreDuplicates: true });
  if (error) return NextResponse.json({ error: "신청하지 못했어요. 잠시 후 다시 시도해주세요." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
