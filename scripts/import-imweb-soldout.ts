/*
 * 아임웹에서 판매가 끝난(숨김·품절) 교육 상품을 '품절' 클래스로 넣는다. slug(imweb-상품번호) 기준 upsert — 여러 번 돌려도 안전.
 * 기준: 아임웹 상품 전체 엑셀(2026-11-17)의 [교육]·[세미나] 상품 중 판매중이 아닌 것 — 클래스 목록 시안(11.18)에 고른 목록과 같다.
 * 목록에서는 기본으로 숨고, 필터·검색을 쓰거나 '품절' 탭을 누르면 회색 카드로 보인다. 썸네일은 넣지 않는다(분류 이름 썸네일).
 * 실행: npx tsx --env-file=.env.local scripts/import-imweb-soldout.ts   (0005_price_options.sql 의 sale_status 칸 필요)
 */
import { getAdminSupabase } from "@/lib/supabase/admin";

type Cat = "특강" | "경영";
type Field = "모발과학" | "컬러" | "펌·매직" | "커트" | "경영·마케팅";

/* [아임웹 상품번호, 이름, 분류, 분야, 가격, 개설 대기 여부] */
const SOLDOUT: [number, string, Cat, Field, number, boolean?][] = [
  [199, "미디엄 투섹션 레이어트 실습교육", "특강", "커트", 30000],
  [196, "복구펌의 시술 설계방법 모두 알려드립니다.", "특강", "펌·매직", 150000],
  [194, "해외 SNS 알고리즘을 타고 싶으신가요? 이 전략만 있으면 가능합니다.", "경영", "경영·마케팅", 70000],
  [191, "달밤의 뿌리탈색+얼룩제거+바가지염색", "특강", "컬러", 200000],
  [190, "SNS 수익화 강의", "경영", "경영·마케팅", 50000],
  [187, "블로그 마케팅 강의", "경영", "경영·마케팅", 199000],
  [185, "SNS 성장 교육", "경영", "경영·마케팅", 90000],
  [184, "업세일즈 교육", "경영", "경영·마케팅", 200000],
  [178, "광고비 500만 원 없이도 매출이 자라는 매장의 설계 전략", "경영", "경영·마케팅", 100000],
  [171, "허쉬컷 커트 교육", "특강", "커트", 100000],
  [170, "미용실 경영교육 : 소수정예 심화 경영 컨설팅", "경영", "경영·마케팅", 800000],
  [168, "디자인 탈색 교육", "특강", "컬러", 220000],
  [140, "탈색, 염색 교육 : 극손상모 얼룩제거", "특강", "컬러", 150000],
  [139, "미용실 경영교육 : 구조로 매출을 만드는 면담법", "경영", "경영·마케팅", 70000],
  [129, "헤어디자이너 AI 교육", "경영", "경영·마케팅", 70000],
  [126, "마진률 80% 포인트 붙임머리 원데이 실습 클래스", "특강", "컬러", 220000],
  [124, "미용실 노무교육", "경영", "경영·마케팅", 30000],
  [112, "미용실 CS 교육", "경영", "경영·마케팅", 70000],
  [111, "시니어컷&사모님컷 커트 교육", "특강", "커트", 150000],
  [106, "구름펌 디자인&시술 펌 교육", "특강", "펌·매직", 100000, true],
  [103, "블랑컷 실습 커트 교육", "특강", "커트", 100000],
  [92, "헤드스파 실무 교육", "특강", "모발과학", 100000],
  [82, "탈색, 염색 교육 : 블랙빼기", "특강", "컬러", 150000],
  [57, "퍼스널 컬러 진단 교육", "특강", "컬러", 500000],
  [14, "블로그 AI 마케팅 교육", "경영", "경영·마케팅", 150000],
  [5, "혼자서도 가능한 뿌리탈색 가발 실습 컬러 교육", "특강", "컬러", 250000],
  [4, "헤어디자이너 기초 모발 과학 교육", "특강", "모발과학", 250000],
];

async function main() {
  const db = getAdminSupabase();
  for (const [i, [idx, name, cat, field, price, waitlist]] of SOLDOUT.entries()) {
    const row = {
      slug: `imweb-${idx}`, name, cat, field, price,
      target: cat === "경영" ? "원장·창업" : "디자이너",
      type: "waitlist", sale_status: waitlist ? "on" : "soldout",
      day: null, time: null, place: null, date: null, capacity: null, weeks: null, months: null, step: null, level: null,
      summary: "", tax_type: "taxable", cert: false, noob: false, draft: false, sort_order: 100 + i,
    };
    const { data, error } = await db.from("classes").upsert(row, { onConflict: "slug" }).select("id").single();
    if (error) throw new Error(`${name}: ${error.message}`);
    console.log(`#${data.id} ${waitlist ? "개설 대기" : "품절"} ${name} ← 아임웹 ${idx}`);
  }
}

main().catch((e) => {
  console.error("가져오기 실패:", e.message ?? e);
  process.exit(1);
});
