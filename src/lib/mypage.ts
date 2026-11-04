/* 마이페이지 데이터 (서버 전용) — 로그인한 회원의 신청·결제·온라인 수강권한 */
import type { ApplicationStatus, MyApplication, MyCourse, MyPayment, MyPaymentStatus } from "@/data/mypage";
import { fullDate } from "./format";
import { CATEGORY_LABELS } from "./status";
import { getAdminSupabase } from "./supabase/admin";
import type { TaxType } from "./types";

const APP_STATUS: Record<string, ApplicationStatus> = {
  수강확정: "수강 확정", 입금대기: "입금 대기", 수강완료: "수강 완료", 취소신청: "취소 요청", 신청취소: "신청 취소",
};
const PAY_STATUS: Record<string, MyPaymentStatus> = { 결제완료: "결제완료", 입금대기: "입금 대기", 부분환불: "부분환불", 환불완료: "환불완료" };

const dot = (iso: string) => iso.slice(0, 10).replace(/-/g, ".");

type Row = {
  id: string; status: string; amount: number; created_at: string;
  classes: { slug: string; name: string; cat: string; date: string | null; time: string | null; place: string | null; type: string; tax_type: TaxType; draft: boolean };
  payments: { method: string | null; status: string; amount: number; paid_at: string | null; created_at: string; raw: { receipt?: { url?: string } } | null }[];
};

export async function getMyPageData(profileId: string): Promise<{ applications: MyApplication[]; payments: MyPayment[]; courses: MyCourse[] }> {
  const db = getAdminSupabase();
  const { data: rows } = await db
    .from("orders")
    .select("id, status, amount, created_at, classes(slug, name, cat, date, time, place, type, tax_type, draft), payments(method, status, amount, paid_at, created_at, raw)")
    .eq("profile_id", profileId)
    .not("status", "in", "(결제대기,승인중)") // 결제를 끝내지 않은 주문은 보여주지 않는다
    .order("created_at", { ascending: false });

  const orders = (rows ?? []) as unknown as Row[];
  const today = new Date().toISOString().slice(0, 10);

  const applications: MyApplication[] = orders.map((o) => {
    const c = o.classes;
    let status = APP_STATUS[o.status] ?? "입금 대기";
    // 오프라인 수업은 개강일이 지나면 수강 완료로 보여준다
    if (status === "수강 확정" && c.type !== "online" && c.date && c.date < today) status = "수강 완료";
    return {
      orderId: o.id,
      cat: CATEGORY_LABELS[c.cat] ?? c.cat,
      title: c.name,
      slug: c.draft ? undefined : c.slug,
      when: c.type === "online" ? "온라인 · 상시 수강" : c.date ? `${fullDate(c.date)}${c.time ? ` ${c.time.split("~")[0]}` : ""}` : "일정 미정",
      place: c.type === "online" ? "온라인" : `비주얼아카데미 ${c.place ?? ""}`.trim(),
      status,
      price: o.amount,
      thumb: "",
    };
  });

  const payments: MyPayment[] = orders.flatMap((o) =>
    o.payments
      .filter((p) => PAY_STATUS[p.status])
      .map((p) => ({
        date: dot(p.paid_at ?? p.created_at),
        item: o.classes.name,
        method: p.method ?? "-",
        status: PAY_STATUS[p.status],
        amount: p.amount,
        taxType: o.classes.tax_type,
        receiptUrl: p.raw?.receipt?.url,
      })),
  );

  const { data: ens } = await db
    .from("enrollments")
    .select("progress, expires_at, classes(name, months)")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false });
  const courses: MyCourse[] = ((ens ?? []) as unknown as { progress: number; expires_at: string | null; classes: { name: string; months: number | null } }[]).map((e) => ({
    title: e.classes.name,
    meta: `${e.classes.months ?? ""}개월 수강권`,
    pct: e.progress,
    expiry: e.expires_at ? dot(e.expires_at) : "-",
    thumb: "",
    done: e.progress >= 100,
  }));

  return { applications, payments, courses };
}
