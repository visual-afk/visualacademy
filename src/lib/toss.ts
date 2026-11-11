/* 토스페이먼츠 서버 API (시크릿 키 사용 — 서버 전용) */

const API = "https://api.tosspayments.com/v1";

export type TossPayment = {
  paymentKey: string;
  orderId: string;
  orderName: string;
  status: "READY" | "IN_PROGRESS" | "WAITING_FOR_DEPOSIT" | "DONE" | "CANCELED" | "PARTIAL_CANCELED" | "ABORTED" | "EXPIRED";
  method: string | null;
  totalAmount: number;
  balanceAmount: number;
  approvedAt: string | null;
  secret?: string | null;
  card?: { approveNo?: string } | null;
  easyPay?: { provider?: string } | null;
  virtualAccount?: { accountNumber: string; bankCode: string; customerName: string; dueDate: string } | null;
  cancels?: { cancelAmount: number; cancelReason: string; canceledAt: string }[] | null;
  receipt?: { url: string } | null;
};

export class TossError extends Error {
  constructor(public code: string, message: string, public status: number) {
    super(message);
  }
}

export function tossConfigured(): boolean {
  return Boolean(process.env.TOSS_SECRET_KEY && process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY);
}

async function call<T>(path: string, init: { method: "GET" | "POST"; body?: unknown; idempotencyKey?: string }): Promise<T> {
  const auth = Buffer.from(`${process.env.TOSS_SECRET_KEY}:`).toString("base64");
  const res = await fetch(`${API}${path}`, {
    method: init.method,
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
      ...(init.idempotencyKey ? { "Idempotency-Key": init.idempotencyKey } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new TossError(data.code ?? "UNKNOWN", data.message ?? "결제사 응답 오류", res.status);
  return data as T;
}

/** 결제 승인 — successUrl 로 돌아온 paymentKey·orderId·amount 로 호출 */
export const confirmPayment = (paymentKey: string, orderId: string, amount: number) =>
  call<TossPayment>("/payments/confirm", { method: "POST", body: { paymentKey, orderId, amount }, idempotencyKey: `confirm-${orderId}` });

export const getPaymentByOrderId = (orderId: string) => call<TossPayment>(`/payments/orders/${encodeURIComponent(orderId)}`, { method: "GET" });

/** 결제 취소 — cancelAmount 없으면 전액 */
export const cancelPayment = (paymentKey: string, reason: string, cancelAmount?: number, idempotencyKey?: string) =>
  call<TossPayment>(`/payments/${encodeURIComponent(paymentKey)}/cancel`, {
    method: "POST",
    body: { cancelReason: reason, ...(cancelAmount ? { cancelAmount } : {}) },
    idempotencyKey,
  });

/** 토스 결제수단 → 화면 표기 */
export function methodLabel(p: Pick<TossPayment, "method" | "easyPay">): string {
  if (p.method === "간편결제" && p.easyPay?.provider) return p.easyPay.provider;
  if (p.method === "카드") return "신용카드";
  return p.method ?? "-";
}

const BANKS: Record<string, string> = {
  "39": "경남은행", "34": "광주은행", "12": "단위농협", "32": "부산은행", "45": "새마을금고", "64": "산림조합", "88": "신한은행",
  "48": "신협", "27": "씨티은행", "20": "우리은행", "71": "우체국", "50": "저축은행", "37": "전북은행", "35": "제주은행",
  "90": "카카오뱅크", "89": "케이뱅크", "92": "토스뱅크", "81": "하나은행", "54": "HSBC", "03": "IBK기업은행", "06": "KB국민은행",
  "31": "DGB대구은행", "02": "KDB산업은행", "11": "NH농협은행", "23": "SC제일은행", "07": "수협은행",
};
export const bankName = (code: string) => BANKS[code] ?? `은행(${code})`;
