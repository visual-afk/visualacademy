import { NextResponse, type NextRequest } from "next/server";
import { bad, guardAdmin } from "@/lib/adminApi";
import { InvoiceError, issueInvoice, type Buyer } from "@/lib/invoice";
import { PopbillError, popbillConfigured } from "@/lib/popbill";

/** POST /api/admin/payments/:orderNo/invoice — 세금계산서(면세는 계산서) 즉시발행 · 재발행 */
export async function POST(request: NextRequest, { params }: RouteContext<"/api/admin/payments/[id]/invoice">) {
  const denied = await guardAdmin();
  if (denied) return denied;
  if (!popbillConfigured()) return bad("팝빌 연동 키가 아직 설정되지 않았어요", 503);
  const b = (await request.json().catch(() => null)) as Buyer | null;
  const bizNo = b?.bizNo?.replace(/\D/g, "") ?? "";
  if (bizNo.length !== 10) return bad("사업자등록번호 10자리를 확인해주세요");
  if (!b?.bizName?.trim() || !b.ceo?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email ?? "")) return bad("상호·대표자명·이메일을 확인해주세요");

  try {
    const invoice = await issueInvoice((await params).id, { bizNo, bizName: b.bizName.trim(), ceo: b.ceo.trim(), email: b.email.trim() });
    return NextResponse.json({ ok: true, invoice });
  } catch (e) {
    if (e instanceof InvoiceError) return bad(e.message);
    if (e instanceof PopbillError) return bad(`팝빌 발행 실패: ${e.message} (${e.code})`, 502);
    throw e;
  }
}
