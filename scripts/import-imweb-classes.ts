/*
 * 아임웹 판매 중인 강의(비주얼 ONLY · 2월 교육 일정)를 클래스로 옮긴다. slug 기준 upsert — 여러 번 돌려도 안전.
 * 썸네일은 아임웹 CDN 에서 받아 우리 Storage(class-images)에 다시 올린다 (아임웹을 닫아도 남게).
 * 목업 시드 클래스(id 1~12)는 지우지 않고 draft(숨김)로 돌린다.
 * 실행: npx tsx --env-file=.env.local scripts/import-imweb-classes.ts
 *
 * 아임웹 페이지에 없던 값(개강일·시간·정원·일부 가격)은 비워 두고 '개설 대기/예정'으로 넣는다 → 관리자 대시보드에서 채운다.
 */
import { getAdminSupabase } from "@/lib/supabase/admin";
import { IMAGE_BUCKET } from "@/lib/uploads";

const CDN = "https://cdn-optimized.imweb.me/upload/S202410020e0356ad714a1/";
const MOCK_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

type Row = {
  slug: string; name: string; cat: "정석" | "특강" | "세미나" | "경영" | "온라인";
  field: "모발과학" | "컬러" | "펌·매직" | "커트" | "경영·마케팅"; target: "입문" | "디자이너" | "원장·창업" | "전체";
  type: "offline" | "seminar" | "waitlist" | "online" | "upcoming";
  price: number | null; summary: string; thumb: string; imweb: string;
  day?: string | null; place?: string | null; weeks?: number; months?: number; step?: number; level?: number; noob?: boolean;
};

const CLASSES: Row[] = [
  // ── 비주얼 ONLY (/visualonly)
  {
    slug: "owner-auto", name: "미용실 오토사장반", cat: "경영", field: "경영·마케팅", target: "원장·창업", type: "online",
    price: 3900000, months: 9, thumb: "63c334a281ea7.png", imweb: "/visualonly/?idx=208",
    summary: "내 몸을 갈아 넣지 않아도 매장이 돌아가는 미용실 운영 시스템",
  },
  {
    slug: "2000-plan", name: "이천플랜 : 시그니처 하나로 만드는 매출 공식", cat: "온라인", field: "경영·마케팅", target: "디자이너", type: "online",
    price: null, months: 6, thumb: "da940793e4119.png", imweb: "/visualonly/?idx=203",
    summary: "18년 미용생활, 시그니처 하나로 건물주가 된 헤어디자이너의 '6각형 공식'",
  },
  {
    slug: "trifield-seminar", name: "트리필드 세미나 : 다중환원 펌", cat: "세미나", field: "펌·매직", target: "디자이너", type: "waitlist",
    price: 50000, place: "강남 본원", thumb: "b52c7d78d486c.png", imweb: "/visualonly/?idx=193",
    summary: "일반머리부터 복구머리까지, 다중환원으로 실패 없는 펌 결과물을 만드는 세미나 (참석자 트리필드 제품 랜덤 증정)",
  },
  {
    slug: "hair-science-analyst", name: "모발 과학 분석사 교육 (4주)", cat: "특강", field: "모발과학", target: "디자이너", type: "waitlist",
    price: 1200000, weeks: 4, day: "수", place: "강남 본원", thumb: "9ddaa570f2670.png", imweb: "/visualonly/?idx=51",
    summary: "손상모·강곱슬에 특화된 전문 디자이너로 성장하는 모발 과학 4주 과정 (매주 수요일)",
  },
  {
    slug: "softening-perm", name: "손상모 연화 펌 교육", cat: "특강", field: "펌·매직", target: "디자이너", type: "waitlist",
    price: 250000, place: "강남 본원", thumb: "9494f7cc9a0fc.png", imweb: "/visualonly/?idx=3",
    summary: "복구의 신 지성 원장의 7,000건 시술 경험으로 배우는 고난이도 연화 실전 노하우",
  },
  // ── 2월 교육 일정 (/2602) — 레벨 교육, 추후 '헤어의 정석'으로 이름 변경 예정
  {
    slug: "level-1", name: "1레벨 교육 : 헤어디자이너의 첫 스텝", cat: "정석", field: "커트", target: "입문", type: "upcoming",
    price: null, step: 1, level: 1, noob: true, place: "강남 본원", thumb: "22063fff9bee2.png", imweb: "/shop_view/?idx=155",
    summary: "단순한 기술 연습을 넘어, 고객을 이해하고 실전에서 성장하는 디자이너의 첫 단계",
  },
  {
    slug: "level-2", name: "2레벨 교육 : 디자이너다운 감각을 키워요", cat: "정석", field: "커트", target: "디자이너", type: "upcoming",
    price: null, step: 2, level: 2, place: "강남 본원", thumb: "3bddf53f6d17f.png", imweb: "/shop_view/?idx=161",
    summary: "디자이너다운 감각을 키우는 두 번째 단계",
  },
  {
    slug: "level-3", name: "3레벨 교육 : 스타일 마스터", cat: "정석", field: "커트", target: "디자이너", type: "upcoming",
    price: null, step: 3, level: 3, place: "강남 본원", thumb: "882a7b854b4ce.png", imweb: "/shop_view/?idx=214",
    summary: "나만의 스타일을 완성해가는 시간",
  },
  {
    slug: "level-4", name: "4레벨 교육 : 프로페셔널 디자이너로 도약하는 마지막 관문", cat: "정석", field: "커트", target: "디자이너", type: "upcoming",
    price: null, step: 4, level: 4, place: "강남 본원", thumb: "89f8f4cd3332d.png", imweb: "/shop_view/?idx=163",
    summary: "프로페셔널 디자이너로 도약하는 마지막 관문",
  },
];

async function copyImage(file: string): Promise<string> {
  const db = getAdminSupabase();
  const path = `imweb/${file}`;
  const res = await fetch(CDN + file);
  if (!res.ok) throw new Error(`이미지 받기 실패 ${file}: ${res.status}`);
  const { error } = await db.storage
    .from(IMAGE_BUCKET)
    .upload(path, Buffer.from(await res.arrayBuffer()), { contentType: res.headers.get("content-type") ?? "image/png", upsert: true });
  if (error) throw new Error(`이미지 올리기 실패 ${file}: ${error.message}`);
  return db.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
}

async function main() {
  const db = getAdminSupabase();

  const { error: hideErr } = await db.from("classes").update({ draft: true }).in("id", MOCK_IDS);
  if (hideErr) throw hideErr;
  console.log(`목업 클래스 ${MOCK_IDS.length}개 숨김`);

  for (const [i, c] of CLASSES.entries()) {
    const { thumb, imweb, ...rest } = c;
    const row = {
      ...rest,
      day: c.day ?? null, place: c.place ?? null, weeks: c.weeks ?? null, months: c.months ?? null,
      step: c.step ?? null, level: c.level ?? null, noob: c.noob ?? false,
      time: null, date: null, capacity: null, tax_type: "taxable", cert: false, draft: false, sort_order: i,
    };
    const { data, error } = await db.from("classes").upsert(row, { onConflict: "slug" }).select("id").single();
    if (error) throw new Error(`${c.name}: ${error.message}`);
    const url = await copyImage(thumb);
    const { error: ccErr } = await db
      .from("class_contents")
      .upsert({ class_id: data.id, thumbnail_url: url, updated_at: new Date().toISOString() }, { onConflict: "class_id" });
    if (ccErr) throw new Error(`${c.name} 이미지: ${ccErr.message}`);
    console.log(`#${data.id} ${c.name} ← 아임웹 ${imweb}`);
  }
}

main().catch((e) => {
  console.error("가져오기 실패:", e.message ?? e);
  process.exit(1);
});
