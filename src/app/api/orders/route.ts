import { NextResponse, type NextRequest } from "next/server";
import { getProfile, getUser } from "@/lib/auth";
import { confirmFreeOrder, createOrder, type Applicant } from "@/lib/orders";
import { tossConfigured } from "@/lib/toss";

type Body = { slug: string; applicant: Applicant; agreements: Record<string, boolean> };

/** POST /api/orders — 신청서 + 동의 → 주문(결제대기) 생성, 주문번호 발급 */
export async function POST(request: NextRequest) {
  if (!tossConfigured()) return NextResponse.json({ error: "결제 설정이 아직 연결되지 않았어요" }, { status: 503 });
  const user = await getUser();
  const profile = user ? await getProfile(user.id) : null;
  if (!profile) return NextResponse.json({ error: "로그인이 필요해요" }, { status: 401 });

  const b = (await request.json().catch(() => null)) as Body | null;
  const a = b?.applicant;
  const phone = (a?.phone ?? "").replace(/\D/g, "");
  if (!b?.slug || !a?.name?.trim() || !/^01\d{8,9}$/.test(phone)) {
    return NextResponse.json({ error: "이름과 휴대폰 번호를 정확히 입력해주세요" }, { status: 400 });
  }
  if (!b.agreements?.refund || !b.agreements?.terms) return NextResponse.json({ error: "필수 확인 사항에 동의해주세요" }, { status: 400 });

  const r = await createOrder(
    profile,
    b.slug,
    { name: a.name.trim(), phone, email: (a.email ?? "").trim(), shop: (a.shop ?? "").trim() },
    b.agreements,
  );
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: 409 });
  if (r.amount === 0) {
    const f = await confirmFreeOrder(r.orderNo);
    if (f === "full") return NextResponse.json({ error: "아쉽게도 정원이 다 찼어요" }, { status: 409 });
    if (f !== "ok") return NextResponse.json({ error: "신청하지 못했어요. 잠시 후 다시 시도해주세요." }, { status: 500 });
    return NextResponse.json({ free: true, orderNo: r.orderNo });
  }
  return NextResponse.json({ orderNo: r.orderNo, amount: r.amount, orderName: r.orderName, customerKey: profile.id });
}
