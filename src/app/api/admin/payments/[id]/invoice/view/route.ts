import { NextResponse, type NextRequest } from "next/server";
import { bad, guardAdmin } from "@/lib/adminApi";
import { PopbillError, popbillConfigured, viewUrl } from "@/lib/popbill";
import { getAdminSupabase } from "@/lib/supabase/admin";

/** GET /api/admin/payments/:orderNo/invoice/view — 팝빌 문서 보기로 이동 (URL 은 30초만 유효해서 누를 때마다 새로 받는다) */
export async function GET(_request: NextRequest, { params }: RouteContext<"/api/admin/payments/[id]/invoice/view">) {
  const denied = await guardAdmin();
  if (denied) return denied;
  if (!popbillConfigured()) return bad("팝빌 연동 키가 아직 설정되지 않았어요", 503);
  const { data } = await getAdminSupabase()
    .from("payments")
    .select("invoice, orders!inner(order_no)")
    .eq("orders.order_no", (await params).id)
    .maybeSingle();
  const key = (data?.invoice as { mgtKey?: string } | null)?.mgtKey;
  if (!key) return bad("발행된 계산서가 없어요", 404);
  try {
    return NextResponse.redirect(await viewUrl(key));
  } catch (e) {
    if (e instanceof PopbillError) return bad(`팝빌 조회 실패: ${e.message}`, 502);
    throw e;
  }
}
