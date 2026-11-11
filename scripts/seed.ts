/*
 * 목업 클래스·강사를 Supabase 에 넣는다 (slug/id 기준 upsert — 여러 번 돌려도 안전).
 * 실행: npm run seed   (.env.local 의 SUPABASE_SERVICE_ROLE_KEY 필요, 0001_init.sql 먼저 실행)
 */
import { classes } from "@/data/classes";
import { instructors } from "@/data/instructors";
import { getAdminSupabase } from "@/lib/supabase/admin";

async function main() {
  const db = getAdminSupabase();

  const { error: insErr } = await db
    .from("instructors")
    .upsert(instructors.map((i, idx) => ({ ...i, sort_order: idx })), { onConflict: "id" });
  if (insErr) throw insErr;
  console.log(`강사 ${instructors.length}명`);

  const rows = classes.map((c, idx) => ({
    id: c.id, slug: c.slug, name: c.name, cat: c.cat, field: c.field, target: c.target, type: c.type,
    day: c.day, time: c.time, place: c.place, date: c.date, capacity: c.capacity,
    applied_base: c.applied ?? 0, price: c.price, tax_type: c.taxType, cert: c.cert, noob: c.noob,
    step: c.step, level: c.level ?? null, summary: c.summary, weeks: c.weeks ?? null, months: c.months ?? null,
    manual_end: c.manualEnd ?? false, sort_order: idx,
  }));
  const { error: clsErr } = await db.from("classes").upsert(rows, { onConflict: "id" });
  if (clsErr) throw clsErr;

  const contents = classes.map((c) => {
    const { detailImage, ...detail } = c.detail ?? ({} as NonNullable<typeof c.detail>);
    return { class_id: c.id, detail: c.detail ? detail : {}, detail_image_url: detailImage ?? null };
  });
  const { error: ccErr } = await db.from("class_contents").upsert(contents, { onConflict: "class_id" });
  if (ccErr) throw ccErr;

  // identity 컬럼에 id 를 직접 넣었으니, 다음 새 클래스 id 가 겹치지 않게 시퀀스를 맞춘다
  const { error: seqErr } = await db.rpc("sync_class_id_seq");
  if (seqErr) throw seqErr;
  console.log(`클래스 ${rows.length}개 · 상세 ${classes.filter((c) => c.detail).length}개`);
}

main().catch((e) => {
  console.error("시드 실패:", e.message ?? e);
  process.exit(1);
});
