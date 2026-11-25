import "server-only";
import { addMonths, extendBase, nextExpiry, type ExpiryChange } from "./expiry";
import { getAdminSupabase } from "./supabase/admin";

/*
 * 온라인 수강권 · 개인별 수강기한 (서버 전용).
 * 기본 기한은 결제일 + 클래스 수강 기간(months), 관리자가 사람마다 바꿀 수 있다. 바뀐 건 전부 enrollment_changes 에 남긴다.
 */

type Db = ReturnType<typeof getAdminSupabase>;
export type ChangeKind = "grant" | "repurchase" | "change" | "revoke";
export type EnrollmentSource = "order" | "admin" | "imweb";

async function logChange(
  db: Db,
  c: { enrollmentId: string; kind: ChangeKind; prev: string | null; next: string | null; reason?: string | null; actor: string; orderId?: string | null },
) {
  await db.from("enrollment_changes").insert({
    enrollment_id: c.enrollmentId,
    kind: c.kind,
    prev_expires_at: c.prev,
    new_expires_at: c.next,
    reason: c.reason ?? null,
    actor: c.actor,
    order_id: c.orderId ?? null,
  });
}

/* ── 결제 연동 (lib/orders.ts) ── */

/** 결제 완료 → 수강권 발급. 이미 수강권이 있으면(재결제) 남은 기한에 이어서 연장한다. 같은 주문 웹훅이 여러 번 와도 한 번만 반영 */
export async function issueForOrder(db: Db, order: { id: string; profile_id: string; class_id: number }, months: number | null) {
  const m = months ?? 12;
  const { data: en } = await db
    .from("enrollments")
    .select("id, order_id, expires_at")
    .eq("profile_id", order.profile_id)
    .eq("class_id", order.class_id)
    .maybeSingle();
  if (!en) {
    const exp = addMonths(new Date(), m).toISOString();
    const { data: created } = await db
      .from("enrollments")
      .insert({ profile_id: order.profile_id, class_id: order.class_id, order_id: order.id, expires_at: exp, source: "order" })
      .select("id")
      .single();
    if (created) await logChange(db, { enrollmentId: created.id, kind: "grant", prev: null, next: exp, reason: "결제", actor: "system", orderId: order.id });
    return;
  }
  if (en.order_id === order.id) return;
  // 무제한 수강권은 그대로 두고 주문만 이어 붙인다
  const exp = en.expires_at ? addMonths(extendBase(en.expires_at), m).toISOString() : null;
  await db.from("enrollments").update({ order_id: order.id, expires_at: exp }).eq("id", en.id);
  await logChange(db, { enrollmentId: en.id, kind: "repurchase", prev: en.expires_at, next: exp, reason: "재결제 연장", actor: "system", orderId: order.id });
}

/** 전액 취소 → 그 주문으로 생긴 수강권 회수. 재결제분이 취소되면 연장 전 기한으로 되돌린다 */
export async function revokeForOrder(db: Db, orderId: string) {
  const { data: en } = await db.from("enrollments").select("id, expires_at").eq("order_id", orderId).maybeSingle();
  if (!en) return;
  const { data: paid } = await db
    .from("enrollment_changes")
    .select("kind, order_id, prev_expires_at")
    .eq("enrollment_id", en.id)
    .in("kind", ["grant", "repurchase"])
    .order("created_at", { ascending: false });
  const mine = (paid ?? []).find((c) => c.order_id === orderId);
  if (mine?.kind !== "repurchase") {
    await db.from("enrollments").delete().eq("id", en.id);
    return;
  }
  const before = (paid ?? []).find((c) => c.order_id && c.order_id !== orderId);
  await db.from("enrollments").update({ expires_at: mine.prev_expires_at, order_id: before?.order_id ?? null }).eq("id", en.id);
  await logChange(db, { enrollmentId: en.id, kind: "revoke", prev: en.expires_at, next: mine.prev_expires_at, reason: "재결제 취소", actor: "system", orderId });
}

/* ── 관리자 ── */

export type EnrollmentChange = { kind: ChangeKind; prev: string | null; next: string | null; reason: string | null; actor: string; at: string };
export type Student = {
  id: string;
  name: string;
  phone: string;
  email: string;
  shop: string;
  source: EnrollmentSource;
  expiresAt: string | null;
  progress: number;
  note: string;
  startedAt: string;
  history: EnrollmentChange[];
};

export async function getStudents(classId: number): Promise<Student[]> {
  const { data, error } = await getAdminSupabase()
    .from("enrollments")
    .select("id, source, expires_at, progress, note, created_at, profiles(name, phone, email, shop), enrollment_changes(kind, prev_expires_at, new_expires_at, reason, actor, created_at)")
    .eq("class_id", classId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`수강생 조회 실패: ${error.message}`);
  type Row = {
    id: string; source: EnrollmentSource; expires_at: string | null; progress: number; note: string | null; created_at: string;
    profiles: { name: string | null; phone: string | null; email: string | null; shop: string | null } | null;
    enrollment_changes: { kind: ChangeKind; prev_expires_at: string | null; new_expires_at: string | null; reason: string | null; actor: string; created_at: string }[];
  };
  return ((data ?? []) as unknown as Row[]).map((r) => ({
    id: r.id,
    name: r.profiles?.name ?? "",
    phone: r.profiles?.phone ?? "",
    email: r.profiles?.email ?? "",
    shop: r.profiles?.shop ?? "",
    source: r.source,
    expiresAt: r.expires_at,
    progress: r.progress,
    note: r.note ?? "",
    startedAt: r.created_at,
    history: r.enrollment_changes
      .map((c) => ({ kind: c.kind, prev: c.prev_expires_at, next: c.new_expires_at, reason: c.reason, actor: c.actor, at: c.created_at }))
      .sort((a, b) => b.at.localeCompare(a.at)),
  }));
}

export async function changeExpiry(id: string, change: ExpiryChange, reason: string, actor: string) {
  const db = getAdminSupabase();
  const { data: en } = await db.from("enrollments").select("id, expires_at").eq("id", id).maybeSingle();
  if (!en) return null;
  const next = nextExpiry(en.expires_at, change);
  const { error } = await db.from("enrollments").update({ expires_at: next }).eq("id", id);
  if (error) throw new Error(error.message);
  await logChange(db, { enrollmentId: id, kind: "change", prev: en.expires_at, next, reason, actor });
  return { expiresAt: next };
}

/** 회수 — 행은 지우지 않고 지금 바로 만료시킨다 (진도가 남아서 다시 기한을 주면 이어볼 수 있다) */
export async function revokeEnrollment(id: string, reason: string, actor: string) {
  const db = getAdminSupabase();
  const { data: en } = await db.from("enrollments").select("id, expires_at").eq("id", id).maybeSingle();
  if (!en) return null;
  const next = new Date().toISOString();
  const { error } = await db.from("enrollments").update({ expires_at: next }).eq("id", id);
  if (error) throw new Error(error.message);
  await logChange(db, { enrollmentId: id, kind: "revoke", prev: en.expires_at, next, reason, actor });
  return { expiresAt: next };
}

export async function updateNote(id: string, note: string) {
  const { error } = await getAdminSupabase().from("enrollments").update({ note: note || null }).eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * 결제 없이 수강권 직접 부여 — 휴대폰번호로 회원을 찾고, 없으면 회원 행을 먼저 만든다
 * (카카오 첫 로그인 때 휴대폰이 같으면 그 행에 연결된다 — lib/auth.ts ensureProfile).
 * 이미 수강권이 있으면 새로 만들지 않고 기한만 바꾼다.
 */
export async function grantEnrollment(
  classId: number,
  input: { phone: string; name: string; change: ExpiryChange; reason: string },
  actor: string,
): Promise<{ id: string; created: boolean; expiresAt: string | null }> {
  const db = getAdminSupabase();
  let { data: profile } = await db.from("profiles").select("id").eq("phone", input.phone).order("user_id", { nullsFirst: false }).limit(1).maybeSingle();
  if (!profile) {
    const { data, error } = await db.from("profiles").insert({ phone: input.phone, name: input.name || null }).select("id").single();
    if (error) throw new Error(`회원을 만들지 못했어요: ${error.message}`);
    profile = data;
  }
  const { data: en } = await db.from("enrollments").select("id").eq("profile_id", profile.id).eq("class_id", classId).maybeSingle();
  if (en) {
    const r = await changeExpiry(en.id, input.change, input.reason, actor);
    return { id: en.id, created: false, expiresAt: r?.expiresAt ?? null };
  }
  const exp = nextExpiry(null, input.change);
  const { data: created, error } = await db
    .from("enrollments")
    .insert({ profile_id: profile.id, class_id: classId, expires_at: exp, source: "admin" })
    .select("id")
    .single();
  if (error) throw new Error(`수강권을 만들지 못했어요: ${error.message}`);
  await logChange(db, { enrollmentId: created.id, kind: "grant", prev: null, next: exp, reason: input.reason, actor });
  return { id: created.id, created: true, expiresAt: exp };
}
