import "server-only";
import { getAdminSupabase } from "./supabase/admin";

/* 관리자 — 클래스별 신청자 · 개설 알림 신청자 */

export type Applicant = {
  orderNo: string;
  name: string;
  phone: string;
  email: string;
  shop: string;
  status: string;
  amount: number;
  method: string;
  source: string;
  appliedAt: string;
};
export type WaitlistEntry = { name: string; phone: string; requestedAt: string; notifiedAt: string | null };

const kst = (iso: string) => {
  const k = new Date(new Date(iso).getTime() + 9 * 3600 * 1000).toISOString();
  return `${k.slice(0, 10)} ${k.slice(11, 16)}`;
};

export async function getApplicants(classId: number): Promise<{ applicants: Applicant[]; waitlist: WaitlistEntry[] }> {
  const db = getAdminSupabase();
  const [{ data: orders, error }, { data: alerts }] = await Promise.all([
    db
      .from("orders")
      .select("order_no, status, amount, source, applicant, created_at, payments(method)")
      .eq("class_id", classId)
      .not("status", "in", "(결제대기,승인중)") // 결제창에서 나간 건은 신청자가 아니다
      .order("created_at", { ascending: true }),
    db.from("waitlist_alerts").select("phone, created_at, notified_at, profiles(name)").eq("class_id", classId).order("created_at"),
  ]);
  if (error) throw new Error(`신청자 조회 실패: ${error.message}`);

  type Row = { order_no: string; status: string; amount: number; source: string; applicant: Record<string, string> | null; created_at: string; payments: { method: string | null }[] };
  const applicants = ((orders ?? []) as unknown as Row[]).map((o) => ({
    orderNo: o.order_no,
    name: o.applicant?.name ?? "",
    phone: o.applicant?.phone ?? "",
    email: o.applicant?.email ?? "",
    shop: o.applicant?.shop ?? "",
    status: o.status,
    amount: o.amount,
    method: o.payments[0]?.method ?? (o.amount === 0 ? "무료" : "-"),
    source: o.source,
    appliedAt: kst(o.created_at),
  }));
  type Alert = { phone: string; created_at: string; notified_at: string | null; profiles: { name: string | null } | null };
  const waitlist = ((alerts ?? []) as unknown as Alert[]).map((a) => ({
    name: a.profiles?.name ?? "",
    phone: a.phone,
    requestedAt: kst(a.created_at),
    notifiedAt: a.notified_at ? kst(a.notified_at) : null,
  }));
  return { applicants, waitlist };
}
