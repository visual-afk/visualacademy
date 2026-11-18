import "server-only";
import { taxBreakdown } from "@/lib/format";
import { cancelIssue, getState, registIssue, type TaxinvoiceDoc } from "@/lib/popbill";
import { getAdminSupabase } from "@/lib/supabase/admin";
import type { InvoiceRecord, TaxType } from "@/lib/types";

/*
 * 결제 1건 = 세금계산서(과세) 또는 계산서(면세) 1장. payments.invoice 에 현재 상태와 이력을 같이 둔다.
 * 국세청 전송 전(발행완료)이면 발행취소 후 새로 발행하고, 전송된 뒤에는 수정세금계산서로 고친다.
 */

export type Buyer = { bizNo: string; bizName: string; ceo: string; email: string };

export class InvoiceError extends Error {}

const kstDate = (d: Date) => new Date(d.getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10);
const ymd = (d: Date) => kstDate(d).replaceAll("-", "");
const stamp = () => {
  const k = new Date(Date.now() + 9 * 3600 * 1000).toISOString();
  return `${k.slice(0, 10)} ${k.slice(11, 16)}`;
};
const dotted = (w: string) => `${w.slice(0, 4)}-${w.slice(4, 6)}-${w.slice(6)}`;

/** 발행 전 상태 300·301 은 발행취소, 304 는 수정세금계산서, 302·303 은 국세청 전송 중이라 기다려야 한다 */
const CANCELABLE = [300, 301];
const SENT = 304;
const DEAD = [305, 600]; // 전송실패 · 발행취소 — 유효한 계산서가 없는 상태

type Ctx = {
  paymentId: string;
  orderNo: string;
  itemName: string;
  taxType: TaxType;
  paidAt: Date;
  status: string;
  net: number;
  invoice: InvoiceRecord | null;
};

async function load(orderNo: string): Promise<Ctx> {
  const db = getAdminSupabase();
  const { data } = await db
    .from("payments")
    .select("id, amount, tax_type, status, refund, invoice, paid_at, created_at, orders!inner(order_no, classes(name))")
    .eq("orders.order_no", orderNo)
    .maybeSingle();
  if (!data) throw new InvoiceError("결제 정보를 찾을 수 없어요");
  const r = data as unknown as {
    id: string; amount: number; tax_type: TaxType; status: string; refund: { amount?: number } | null;
    invoice: InvoiceRecord | null; paid_at: string | null; created_at: string; orders: { order_no: string; classes: { name: string } };
  };
  return {
    paymentId: r.id,
    orderNo,
    itemName: `${r.orders.classes.name} 수강료`.slice(0, 100),
    taxType: r.tax_type,
    paidAt: new Date(r.paid_at ?? r.created_at),
    status: r.status,
    net: r.amount - (r.refund?.amount ?? 0),
    invoice: r.invoice,
  };
}

async function save(ctx: Ctx, invoice: InvoiceRecord) {
  const { error } = await getAdminSupabase().from("payments").update({ invoice }).eq("id", ctx.paymentId);
  if (error) throw new InvoiceError(`발행은 됐지만 기록 저장에 실패했어요 (${error.message}) — 팝빌에서 확인해주세요`);
}

function doc(ctx: Ctx, mgtKey: string, buyer: Buyer, writeDate: string, amount: number, extra?: Pick<TaxinvoiceDoc, "remark" | "modify">): TaxinvoiceDoc {
  const sign = amount < 0 ? -1 : 1;
  const { supply, vat } = taxBreakdown(Math.abs(amount), ctx.taxType);
  return {
    writeDate,
    taxType: ctx.taxType === "exempt" ? "면세" : "과세",
    mgtKey,
    invoicee: { corpNum: buyer.bizNo.replace(/\D/g, ""), corpName: buyer.bizName, ceoName: buyer.ceo, email: buyer.email },
    supplyCost: sign * supply,
    tax: sign * vat,
    itemName: ctx.itemName,
    ...extra,
  };
}

/** 팝빌로 실제 발행돼 아직 살아 있는 계산서 (발행 버튼 목업으로 남은 기록·전액 취소된 건 제외) */
type Issued = InvoiceRecord & Required<Pick<InvoiceRecord, "mgtKey" | "ntsConfirmNum" | "writeDate" | "amount" | "history">>;
const active = (i: InvoiceRecord | null): Issued | null => (i && !i.canceled && i.mgtKey ? (i as Issued) : null);

const nextKey = (ctx: Ctx) => `${ctx.orderNo}-${(ctx.invoice?.seq ?? 0) + 1}`;

function record(ctx: Ctx, buyer: Buyer, writeDate: string, ntsConfirmNum: string, mgtKey: string, log: Issued["history"]): InvoiceRecord {
  return {
    ...buyer,
    issuedAt: stamp(),
    mgtKey,
    ntsConfirmNum,
    writeDate,
    amount: ctx.net,
    seq: Number(mgtKey.split("-").pop()),
    history: [...(ctx.invoice?.history ?? []), ...log],
  };
}

/** 관리자 발행·재발행 (재발행 = 공급받는자 정보 정정) */
export async function issueInvoice(orderNo: string, buyer: Buyer): Promise<InvoiceRecord> {
  const ctx = await load(orderNo);
  if (!["결제완료", "부분환불"].includes(ctx.status)) throw new InvoiceError("결제완료·부분환불 건만 발행할 수 있어요");
  if (ctx.net <= 0) throw new InvoiceError("환불 후 남은 금액이 없어요");
  const prev = active(ctx.invoice);
  const writeDate = prev?.writeDate ?? ymd(ctx.paidAt);

  if (!prev) {
    const key = nextKey(ctx);
    const nts = await registIssue(doc(ctx, key, buyer, writeDate, ctx.net));
    const rec = record(ctx, buyer, writeDate, nts, key, [{ at: stamp(), kind: "발행", mgtKey: key, amount: ctx.net, ntsConfirmNum: nts }]);
    await save(ctx, rec);
    return rec;
  }

  const { stateCode } = await getState(prev.mgtKey);
  if (CANCELABLE.includes(stateCode)) {
    await cancelIssue(prev.mgtKey, "공급받는자 정보 정정");
    const key = nextKey(ctx);
    const nts = await registIssue(doc(ctx, key, buyer, writeDate, ctx.net));
    const rec = record(ctx, buyer, writeDate, nts, key, [
      { at: stamp(), kind: "발행취소", mgtKey: prev.mgtKey, amount: -prev.amount },
      { at: stamp(), kind: "발행", mgtKey: key, amount: ctx.net, ntsConfirmNum: nts },
    ]);
    await save(ctx, rec);
    return rec;
  }
  if (stateCode === SENT) {
    // 기재사항 착오정정: 당초분을 (-)로 지우고 바른 내용으로 (+) 한 장 더. 둘 다 당초 작성일자.
    const minusKey = nextKey(ctx);
    const minusNts = await registIssue(doc(ctx, minusKey, prev, writeDate, -prev.amount, { modify: { code: 1, orgNtsConfirmNum: prev.ntsConfirmNum } }));
    const plusKey = `${ctx.orderNo}-${Number(minusKey.split("-").pop()) + 1}`;
    const plusNts = await registIssue(doc(ctx, plusKey, buyer, writeDate, ctx.net, { modify: { code: 1, orgNtsConfirmNum: prev.ntsConfirmNum } }));
    const rec = record(ctx, buyer, writeDate, plusNts, plusKey, [
      { at: stamp(), kind: "수정발행", mgtKey: minusKey, amount: -prev.amount, ntsConfirmNum: minusNts, modifyCode: 1 },
      { at: stamp(), kind: "수정발행", mgtKey: plusKey, amount: ctx.net, ntsConfirmNum: plusNts, modifyCode: 1 },
    ]);
    await save(ctx, rec);
    return rec;
  }
  if (DEAD.includes(stateCode)) {
    const key = nextKey(ctx);
    const nts = await registIssue(doc(ctx, key, buyer, writeDate, ctx.net));
    const rec = record(ctx, buyer, writeDate, nts, key, [{ at: stamp(), kind: "발행", mgtKey: key, amount: ctx.net, ntsConfirmNum: nts }]);
    await save(ctx, rec);
    return rec;
  }
  throw new InvoiceError("국세청으로 전송 중인 계산서예요. 전송이 끝난 뒤(보통 다음 날) 다시 시도해주세요");
}

/**
 * 환불 직후 호출 — 발행된 계산서가 있으면 금액을 맞춘다.
 * 전송 전: 발행취소(전액) 또는 취소 후 남은 금액으로 재발행(부분). 전송 후: 수정세금계산서 (전액 4 계약의 해제 / 부분 2 공급가액 변동).
 * 반환: 처리 내용 한 줄 (없으면 null)
 */
export async function adjustInvoiceForRefund(orderNo: string, refundDelta: number): Promise<string | null> {
  const ctx = await load(orderNo);
  const prev = active(ctx.invoice);
  if (!prev) return null;
  const full = ctx.net <= 0;
  const { stateCode } = await getState(prev.mgtKey);
  const buyer: Buyer = { bizNo: prev.bizNo, bizName: prev.bizName, ceo: prev.ceo, email: prev.email };

  if (CANCELABLE.includes(stateCode)) {
    await cancelIssue(prev.mgtKey, full ? "결제 전액 환불" : "결제 부분 환불");
    if (full) {
      await save(ctx, { ...prev, canceled: true, amount: 0, history: [...prev.history, { at: stamp(), kind: "발행취소", mgtKey: prev.mgtKey, amount: -prev.amount }] });
      return "발행했던 계산서를 발행취소했어요 (국세청 전송 전)";
    }
    const key = nextKey(ctx);
    const nts = await registIssue(doc(ctx, key, buyer, prev.writeDate, ctx.net));
    await save(ctx, record(ctx, buyer, prev.writeDate, nts, key, [
      { at: stamp(), kind: "발행취소", mgtKey: prev.mgtKey, amount: -prev.amount },
      { at: stamp(), kind: "발행", mgtKey: key, amount: ctx.net, ntsConfirmNum: nts },
    ]));
    return "계산서를 남은 금액으로 다시 발행했어요";
  }
  if (stateCode === SENT) {
    const minus = full ? prev.amount : refundDelta;
    const key = nextKey(ctx);
    const code = full ? 4 : 2;
    const nts = await registIssue(
      doc(ctx, key, buyer, ymd(new Date()), -minus, { modify: { code, orgNtsConfirmNum: prev.ntsConfirmNum }, remark: `당초 작성일자 ${dotted(prev.writeDate)}` }),
    );
    const rec = record(ctx, buyer, prev.writeDate, prev.ntsConfirmNum, prev.mgtKey, [
      { at: stamp(), kind: "수정발행", mgtKey: key, amount: -minus, ntsConfirmNum: nts, modifyCode: code },
    ]);
    await save(ctx, { ...rec, issuedAt: prev.issuedAt, seq: Number(key.split("-").pop()), amount: Math.max(ctx.net, 0), canceled: full });
    return `수정세금계산서(${full ? "계약의 해제" : "공급가액 변동"}) -${minus.toLocaleString("ko-KR")}원을 발행했어요`;
  }
  if (DEAD.includes(stateCode)) return null;
  throw new InvoiceError("계산서가 국세청으로 전송 중이라 지금은 고칠 수 없어요. 내일 팝빌에서 수정세금계산서를 발행해주세요");
}
