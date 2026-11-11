/*
 * 신청·결제 처리 (서버 전용).
 * 순서: createOrder(결제대기) → 토스 결제창 → finalizeOrder(자리 잡기 → 승인 → 상태 반영)
 * 가상계좌는 입금대기로 끝나고, 입금되면 웹훅이 syncFromToss 로 수강확정한다.
 */
import { getClass } from "./api";
import type { Profile } from "./auth";
import { fullDate, won } from "./format";
import { notifyHq, notifyOnce } from "./notify";
import { computeStatus } from "./status";
import { getAdminSupabase } from "./supabase/admin";
import { bankName, cancelPayment, confirmPayment, getPaymentByOrderId, methodLabel, TossError, type TossPayment } from "./toss";
import type { AcademyClass } from "./types";

export type Applicant = { name: string; phone: string; email: string; shop: string };

export type OrderRow = {
  id: string; order_no: string; profile_id: string; class_id: number; applicant: Applicant;
  amount: number; status: string; created_at: string;
};

const PURCHASABLE_BLOCK = ["종료", "마감", "개설대기", "개설예정"];

/** 신청 가능 여부 — 0원(무료 세미나)도 신청은 받는다 */
export function canPurchase(c: AcademyClass): boolean {
  return c.price !== null && c.price >= 0 && !PURCHASABLE_BLOCK.includes(computeStatus(c));
}

/** 주문 생성 — 금액은 항상 DB 의 클래스 가격으로 정한다 (브라우저가 보낸 금액은 믿지 않음) */
export async function createOrder(profile: Profile, slug: string, applicant: Applicant, agreements: Record<string, boolean>) {
  const c = await getClass(slug);
  if (!c) return { error: "클래스를 찾을 수 없어요" } as const;
  if (!canPurchase(c)) return { error: "지금은 신청할 수 없는 클래스예요" } as const;

  const db = getAdminSupabase();
  const { data: no, error: noErr } = await db.rpc("next_order_no");
  if (noErr) throw new Error(noErr.message);
  const { data, error } = await db
    .from("orders")
    .insert({ order_no: no as string, profile_id: profile.id, class_id: c.id, applicant, agreements, amount: c.price!, status: "결제대기" })
    .select("order_no, amount")
    .single();
  if (error) throw new Error(error.message);
  return { orderNo: data.order_no as string, amount: data.amount as number, orderName: c.name, cls: c } as const;
}

async function getOrderByNo(orderNo: string): Promise<OrderRow | null> {
  const { data } = await getAdminSupabase().from("orders").select("*").eq("order_no", orderNo).maybeSingle();
  return data as OrderRow | null;
}

/** 토스 결제 결과를 주문·결제·수강권한에 반영 (승인 직후 · 웹훅 · 재조회 모두 이 함수 하나로) */
export async function applyTossPayment(order: OrderRow, p: TossPayment) {
  const db = getAdminSupabase();
  const now = new Date().toISOString();
  const cancelled = (p.cancels ?? []).reduce((s, x) => s + x.cancelAmount, 0);
  const lastCancel = p.cancels?.[p.cancels.length - 1];

  let orderStatus: string;
  let payStatus: string;
  switch (p.status) {
    case "DONE":
      orderStatus = order.status === "수강완료" || order.status === "취소신청" ? order.status : "수강확정";
      payStatus = "결제완료";
      break;
    case "WAITING_FOR_DEPOSIT":
      orderStatus = "입금대기";
      payStatus = "입금대기";
      break;
    case "PARTIAL_CANCELED":
      orderStatus = order.status === "취소신청" ? "신청취소" : order.status;
      payStatus = "부분환불";
      break;
    case "CANCELED":
    case "EXPIRED":
    case "ABORTED":
      orderStatus = "신청취소";
      payStatus = cancelled > 0 ? "환불완료" : "실패";
      break;
    default:
      return;
  }

  const { data: cls } = await db.from("classes").select("name, date, time, place, tax_type, type, months").eq("id", order.class_id).single();
  const { error: payErr } = await db.from("payments").upsert(
    {
      order_id: order.id,
      toss_payment_key: p.paymentKey,
      method: methodLabel(p),
      amount: p.totalAmount,
      tax_type: cls?.tax_type ?? "taxable",
      status: payStatus,
      order_name: p.orderName,
      approved_no: p.card?.approveNo ?? null,
      virtual_account: p.virtualAccount
        ? { bank: bankName(p.virtualAccount.bankCode), account: p.virtualAccount.accountNumber, holder: p.virtualAccount.customerName, dueDate: p.virtualAccount.dueDate }
        : null,
      refund: cancelled > 0 && lastCancel
        ? { type: cancelled >= p.totalAmount ? "full" : "partial", amount: cancelled, reason: lastCancel.cancelReason, refundedAt: lastCancel.canceledAt }
        : null,
      ...(p.secret ? { toss_secret: p.secret } : {}),
      raw: p,
      paid_at: p.status === "DONE" || p.status === "PARTIAL_CANCELED" ? (p.approvedAt ?? now) : null,
    },
    { onConflict: "order_id" },
  );
  if (payErr) throw new Error(payErr.message);
  await db.from("orders").update({ status: orderStatus, updated_at: now }).eq("id", order.id);

  // 처음 수강확정 / 처음 입금대기가 된 순간에만 알림 (웹훅이 여러 번 와도 notifyOnce 가 한 번만 보낸다)
  if (cls && orderStatus === "수강확정" && order.status !== "수강확정") await onConfirmed(order, cls);
  if (cls && orderStatus === "입금대기" && order.status !== "입금대기" && p.virtualAccount) {
    await notifyOnce("vbank", order.id, order.applicant?.phone, {
      "#{이름}": order.applicant?.name ?? "",
      "#{클래스명}": cls.name,
      "#{금액}": won(p.totalAmount),
      "#{은행}": bankName(p.virtualAccount.bankCode),
      "#{계좌번호}": p.virtualAccount.accountNumber,
      "#{입금기한}": kstLabel(p.virtualAccount.dueDate),
      "#{주문번호}": order.order_no,
    });
  }

  // 온라인 강의는 결제 완료 시 수강권한 발급, 전액 취소되면 회수
  if (cls?.type === "online") {
    if (payStatus === "결제완료") {
      const exp = new Date();
      exp.setMonth(exp.getMonth() + (cls.months ?? 12));
      await db.from("enrollments").upsert(
        { profile_id: order.profile_id, class_id: order.class_id, order_id: order.id, expires_at: exp.toISOString() },
        { onConflict: "profile_id,class_id", ignoreDuplicates: true },
      );
    } else if (orderStatus === "신청취소") {
      await db.from("enrollments").delete().eq("order_id", order.id);
    }
  }
}

type ClassInfo = { name: string; date: string | null; time: string | null; place: string | null; type: string; months: number | null };

export function kstLabel(iso: string) {
  const k = new Date(new Date(iso).getTime() + 9 * 3600 * 1000).toISOString();
  return `${k.slice(0, 10).replace(/-/g, ".")} ${k.slice(11, 16)}`;
}

/** 수강확정 순간 — 고객 알림톡 + 본사 채팅 */
async function onConfirmed(order: OrderRow, cls: ClassInfo) {
  const online = cls.type === "online";
  await notifyOnce("paid", order.id, order.applicant?.phone, {
    "#{이름}": order.applicant?.name ?? "",
    "#{클래스명}": cls.name,
    "#{주문번호}": order.order_no,
    "#{일정}": online ? `결제일로부터 ${cls.months ?? ""}개월` : cls.date ? `${fullDate(cls.date)} ${cls.time?.split("~")[0] ?? ""}`.trim() : "추후 안내",
    "#{장소}": online ? "온라인 (마이페이지 > 온라인 수강권한)" : cls.place ?? "",
  });
  await notifyHq(`🎓 새 수강 확정 · ${cls.name}\n${order.applicant?.name ?? "-"} · ${order.amount ? won(order.amount) : "무료"} · ${order.order_no}`);
}

export type FinalizeResult =
  | { ok: true; orderNo: string; status: "수강확정" | "입금대기"; virtualAccount: { bank: string; account: string; dueDate: string } | null; method: string }
  | { ok: false; message: string };

/** successUrl 에서 호출 — 주인 확인 · 금액 대조 · 자리 잡기 · 승인 */
export async function finalizeOrder(profile: Profile, paymentKey: string, orderNo: string, amount: number): Promise<FinalizeResult> {
  const order = await getOrderByNo(orderNo);
  if (!order || order.profile_id !== profile.id) return { ok: false, message: "주문을 찾을 수 없어요" };
  if (order.amount !== amount) return { ok: false, message: "결제 금액이 주문 금액과 달라 결제를 진행하지 않았어요" };

  const db = getAdminSupabase();
  // 새로고침 등으로 다시 들어온 경우 — 이미 처리된 결과를 보여준다
  if (order.status !== "결제대기") {
    const { data: pay } = await db.from("payments").select("method, virtual_account").eq("order_id", order.id).maybeSingle();
    if (order.status === "수강확정" || order.status === "입금대기") {
      return { ok: true, orderNo, status: order.status, virtualAccount: pay?.virtual_account ?? null, method: pay?.method ?? "" };
    }
    return { ok: false, message: "이미 처리된 주문이에요. 마이페이지에서 확인해주세요." };
  }

  const { data: hold, error: holdErr } = await db.rpc("hold_seat", { p_order: order.id });
  if (holdErr) throw new Error(holdErr.message);
  if (hold === "full") return { ok: false, message: "아쉽게도 그 사이 정원이 다 찼어요. 결제는 진행되지 않았어요." };
  if (hold !== "ok") return { ok: false, message: "이미 처리된 주문이에요. 마이페이지에서 확인해주세요." };

  let p: TossPayment;
  try {
    p = await confirmPayment(paymentKey, orderNo, amount);
  } catch (e) {
    if (e instanceof TossError && e.code === "ALREADY_PROCESSED_PAYMENT") {
      p = await getPaymentByOrderId(orderNo);
    } else {
      await db.rpc("release_seat", { p_order: order.id });
      return { ok: false, message: e instanceof TossError ? e.message : "결제 승인 중 문제가 생겼어요. 잠시 후 다시 시도해주세요." };
    }
  }

  await applyTossPayment({ ...order, status: "승인중" }, p);
  if (p.status !== "DONE" && p.status !== "WAITING_FOR_DEPOSIT") return { ok: false, message: "결제가 완료되지 않았어요" };
  return {
    ok: true,
    orderNo,
    status: p.status === "DONE" ? "수강확정" : "입금대기",
    virtualAccount: p.virtualAccount ? { bank: bankName(p.virtualAccount.bankCode), account: p.virtualAccount.accountNumber, dueDate: p.virtualAccount.dueDate } : null,
    method: methodLabel(p),
  };
}

/** 무료 클래스 — 결제 없이 자리만 잡고 바로 수강확정 */
export async function confirmFreeOrder(orderNo: string): Promise<"ok" | "full" | "error"> {
  const order = await getOrderByNo(orderNo);
  if (!order || order.amount !== 0) return "error";
  const db = getAdminSupabase();
  const { data: hold } = await db.rpc("hold_seat", { p_order: order.id });
  if (hold === "full") return "full";
  if (hold !== "ok") return "error";
  await db.from("orders").update({ status: "수강확정", updated_at: new Date().toISOString() }).eq("id", order.id);
  const { data: cls } = await db.from("classes").select("name, date, time, place, type, months").eq("id", order.class_id).single();
  if (cls) await onConfirmed(order, cls);
  return "ok";
}

/** 무료 신청 완료 화면용 — 본인 주문이고 수강확정이면 true */
export async function isConfirmedFreeOrder(profile: Profile, orderNo: string): Promise<boolean> {
  const o = await getOrderByNo(orderNo);
  return Boolean(o && o.profile_id === profile.id && o.amount === 0 && o.status === "수강확정");
}

/** 웹훅·관리자 재조회 — 토스에 현재 상태를 물어 그대로 반영 */
export async function syncFromToss(orderNo: string) {
  const order = await getOrderByNo(orderNo);
  if (!order) return false;
  const p = await getPaymentByOrderId(orderNo);
  await applyTossPayment(order, p);
  return true;
}

/** 고객 취소: 입금 전(가상계좌 대기)이면 바로 취소, 수강확정이면 취소 신청 → 관리자가 규정대로 환불 */
export async function requestCancel(profile: Profile, orderId: string, reason: string) {
  const db = getAdminSupabase();
  const { data: order } = await db.from("orders").select("*").eq("id", orderId).eq("profile_id", profile.id).maybeSingle();
  if (!order) return { error: "신청 내역을 찾을 수 없어요" };
  const o = order as OrderRow;
  if (o.status === "입금대기") {
    const { data: pay } = await db.from("payments").select("toss_payment_key").eq("order_id", o.id).maybeSingle();
    if (pay?.toss_payment_key) {
      const p = await cancelPayment(pay.toss_payment_key, reason || "고객 취소 (입금 전)", undefined, `cancel-${o.id}`);
      await applyTossPayment(o, p);
    } else {
      await db.from("orders").update({ status: "신청취소", updated_at: new Date().toISOString() }).eq("id", o.id);
    }
    return { status: "신청취소" };
  }
  // 무료 신청은 환불할 돈이 없어 바로 취소한다
  if (o.status === "수강확정" && o.amount === 0) {
    await db.from("orders").update({ status: "신청취소", updated_at: new Date().toISOString() }).eq("id", o.id);
    return { status: "신청취소" };
  }
  if (o.status === "수강확정") {
    await db
      .from("orders")
      .update({ status: "취소신청", cancel_request: { reason, requestedAt: new Date().toISOString() }, updated_at: new Date().toISOString() })
      .eq("id", o.id);
    return { status: "취소신청" };
  }
  return { error: "취소할 수 없는 상태예요" };
}
