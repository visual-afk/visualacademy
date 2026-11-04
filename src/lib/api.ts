/*
 * 데이터 접근 레이어 (서버 전용) — Supabase 에서 읽는다.
 * Supabase 키가 아직 없으면 src/data 목업을 그대로 돌려줘서 화면 확인은 계속 할 수 있다.
 * 브라우저 컴포넌트는 이 파일을 import 하지 말고, 서버 page 에서 조회해 props 로 받는다.
 */
import { CLASS_ALIASES, classes as mockClasses } from "@/data/classes";
import { instructors as mockInstructors } from "@/data/instructors";
import { payments as mockPayments } from "@/data/payments";
import { getAdminSupabase } from "./supabase/admin";
import { serviceRoleConfigured } from "./supabase/env";
import type { AcademyClass, ClassDetail, Instructor, Payment } from "./types";

export { getClassDetail, refundPolicy } from "./classes";

/** class_with_counts view 한 행 (snake_case) */
type ClassRow = {
  id: number; slug: string; name: string; cat: AcademyClass["cat"]; field: AcademyClass["field"]; target: AcademyClass["target"];
  type: AcademyClass["type"]; day: string | null; time: string | null; place: string | null; date: string | null;
  capacity: number | null; applied: number | null; price: number | null; tax_type: AcademyClass["taxType"];
  cert: boolean; noob: boolean; step: AcademyClass["step"]; level: AcademyClass["level"] | null; summary: string;
  weeks: number | null; months: number | null; manual_end: boolean; draft: boolean;
  detail: Partial<ClassDetail> | null; detail_image_url: string | null;
};

function rowToClass(r: ClassRow): AcademyClass {
  const detail = r.detail && Object.keys(r.detail).length > 0 ? (r.detail as ClassDetail) : undefined;
  return {
    id: r.id, slug: r.slug, name: r.name, cat: r.cat, field: r.field, target: r.target,
    day: r.day, time: r.time, place: r.place, date: r.date, capacity: r.capacity,
    // 개설 예정(upcoming)은 신청 인원 개념이 없어 목업처럼 null 로 둔다
    applied: r.type === "upcoming" && !r.applied ? null : r.applied,
    price: r.price, type: r.type, cert: r.cert, noob: r.noob, step: r.step,
    ...(r.level ? { level: r.level } : {}),
    taxType: r.tax_type, summary: r.summary,
    ...(r.weeks ? { weeks: r.weeks } : {}),
    ...(r.months ? { months: r.months } : {}),
    ...(r.manual_end ? { manualEnd: true } : {}),
    ...(detail ? { detail: { ...detail, ...(r.detail_image_url ? { detailImage: r.detail_image_url } : {}) } } : {}),
  };
}

/** GET /api/classes — 고객 화면은 임시저장(draft) 클래스를 빼고, 관리자는 includeDraft */
export async function getClasses(opts: { includeDraft?: boolean } = {}): Promise<AcademyClass[]> {
  if (!serviceRoleConfigured()) return mockClasses;
  let q = getAdminSupabase().from("class_with_counts").select("*").order("sort_order").order("id");
  if (!opts.includeDraft) q = q.eq("draft", false);
  const { data, error } = await q;
  if (error) throw new Error(`클래스 조회 실패: ${error.message}`);
  return (data as ClassRow[]).map(rowToClass);
}

/** GET /api/classes/:slug (프로토타입 ?cls=offline|online 별칭 호환) */
export async function getClass(slugOrAlias: string | null | undefined): Promise<AcademyClass | undefined> {
  if (!slugOrAlias) return undefined;
  const slug = CLASS_ALIASES[slugOrAlias] ?? slugOrAlias;
  if (!serviceRoleConfigured()) return mockClasses.find((c) => c.slug === slug);
  const { data, error } = await getAdminSupabase().from("class_with_counts").select("*").eq("slug", slug).eq("draft", false).maybeSingle();
  if (error) throw new Error(`클래스 조회 실패: ${error.message}`);
  return data ? rowToClass(data as ClassRow) : undefined;
}

/** GET /api/admin/classes/:id */
export async function getClassById(id: number): Promise<AcademyClass | undefined> {
  if (!Number.isFinite(id)) return undefined;
  if (!serviceRoleConfigured()) return mockClasses.find((c) => c.id === id);
  const { data, error } = await getAdminSupabase().from("class_with_counts").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`클래스 조회 실패: ${error.message}`);
  return data ? rowToClass(data as ClassRow) : undefined;
}

export async function getInstructors(): Promise<Instructor[]> {
  if (!serviceRoleConfigured()) return mockInstructors;
  const { data, error } = await getAdminSupabase().from("instructors").select("id, initial, name, role, desc").order("sort_order");
  if (error) throw new Error(`강사 조회 실패: ${error.message}`);
  return data as Instructor[];
}

/** GET /api/admin/payments — 결제 연동(P3) 전까지는 목업 */
export async function getPayments(): Promise<Payment[]> {
  return mockPayments;
}
