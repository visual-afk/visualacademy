import { NextResponse, type NextRequest } from "next/server";
import { getProfile, getUser } from "@/lib/auth";
import { requestCancel } from "@/lib/orders";

/** POST /api/me/orders/:id/cancel — 입금 전이면 바로 취소, 수강확정이면 취소 신청(관리자 환불) */
export async function POST(request: NextRequest, { params }: RouteContext<"/api/me/orders/[id]/cancel">) {
  const user = await getUser();
  const profile = user ? await getProfile(user.id) : null;
  if (!profile) return NextResponse.json({ error: "로그인이 필요해요" }, { status: 401 });
  const { reason } = ((await request.json().catch(() => ({}))) ?? {}) as { reason?: string };
  try {
    const r = await requestCancel(profile, (await params).id, (reason ?? "").slice(0, 200));
    if ("error" in r) return NextResponse.json({ error: r.error }, { status: 409 });
    return NextResponse.json(r);
  } catch {
    return NextResponse.json({ error: "취소하지 못했어요. 카카오채널로 문의해주세요." }, { status: 500 });
  }
}
