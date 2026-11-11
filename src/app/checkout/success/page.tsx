import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ROUTES } from "@/data/site";
import { getClassById } from "@/lib/api";
import { getProfile, getUser } from "@/lib/auth";
import { getClassDetail } from "@/lib/classes";
import { won } from "@/lib/format";
import { finalizeOrder, isConfirmedFreeOrder, type FinalizeResult } from "@/lib/orders";
import { getAdminSupabase } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "신청 완료" };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

function dueLabel(iso: string) {
  const d = new Date(iso);
  const z = (n: number) => String(n).padStart(2, "0");
  const k = new Date(d.getTime() + 9 * 3600 * 1000); // KST
  return `${k.getUTCFullYear()}.${z(k.getUTCMonth() + 1)}.${z(k.getUTCDate())} ${z(k.getUTCHours())}:${z(k.getUTCMinutes())}`;
}

/** 토스 결제창이 돌려보내는 곳 — 여기서 서버가 금액을 대조하고 결제를 승인한다 */
export default async function CheckoutSuccess({ searchParams }: PageProps<"/checkout/success">) {
  const sp = await searchParams;
  const paymentKey = one(sp.paymentKey);
  const orderNo = one(sp.orderId);
  const amount = Number(one(sp.amount));
  const user = await getUser();
  if (!user) redirect("/login");
  const profile = await getProfile(user.id);
  const free = one(sp.free) === "1";
  if (!profile || !orderNo || (!free && (!paymentKey || !Number.isFinite(amount)))) redirect(ROUTES.mypage);

  const r: FinalizeResult = free
    ? (await isConfirmedFreeOrder(profile, orderNo))
      ? { ok: true, orderNo, status: "수강확정", virtualAccount: null, method: "무료" }
      : { ok: false, message: "신청 내역을 찾을 수 없어요" }
    : await finalizeOrder(profile, paymentKey, orderNo, amount);
  const { data: order } = await getAdminSupabase().from("orders").select("class_id").eq("order_no", orderNo).maybeSingle();
  const c = order ? await getClassById(order.class_id) : undefined;

  const topbar = (
    <div className="topbar">
      <div className="wrap topbar-inner">
        <Link href={ROUTES.home} className="co-logo"><span className="dot" />비주얼아카데미</Link>
      </div>
    </div>
  );

  if (!r.ok) {
    return (
      <div className="site pg-checkout">
        {topbar}
        <div className="center-state">
          <div className="result-icon fail">✕</div>
          <h2>결제가 완료되지 않았어요</h2>
          <p>{r.message}</p>
          <div className="fail-reason">승인되지 않은 결제는 청구되지 않아요.</div>
          <div className="center-actions">
            {c && <Link className="btn btn-mint" href={ROUTES.checkout(c.slug)}>다시 신청하기</Link>}
            <Link className="btn btn-ghost" href={ROUTES.mypage}>마이페이지</Link>
          </div>
        </div>
      </div>
    );
  }

  const waiting = r.status === "입금대기";
  const isOnline = c?.type === "online";
  const notes = c ? (getClassDetail(c).doneNotes ?? []) : [];
  return (
    <div className="site pg-checkout">
      {topbar}
      <div className="done-wrap">
        <div className="result-icon ok">✓</div>
        <h2>{waiting ? "신청이 접수됐어요" : "신청이 완료됐어요"}</h2>
        {c && <p className="done-title">{c.name}</p>}
        <div className="order-no">주문번호 {r.orderNo}</div>
        {waiting && r.virtualAccount ? (
          <div className="waiting-box">
            입금을 기다리고 있어요
            <div className="wb-sub">
              가상계좌: {r.virtualAccount.bank} {r.virtualAccount.account} · 입금기한 {dueLabel(r.virtualAccount.dueDate)}까지 · {won(amount)}
            </div>
          </div>
        ) : (
          <div className="done-panel">
            <h3>안내드려요</h3>
            <ul className="done-list">
              {notes.map((n) => <li key={n}>{n}</li>)}
            </ul>
          </div>
        )}
        <div className="done-cta">
          <Link className="btn btn-mint" href={isOnline && !waiting ? "/mypage?tab=online" : ROUTES.mypage}>
            {isOnline && !waiting ? "바로 수강하기" : "마이페이지에서 확인하기"}
          </Link>
          <Link className="btn btn-ghost" href={ROUTES.classes}>클래스 목록으로 돌아가기</Link>
        </div>
      </div>
    </div>
  );
}
