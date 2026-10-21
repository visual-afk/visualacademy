import type { Instructor } from "@/lib/types";

export const instructors: Instructor[] = [
  {
    id: "lee-yukyung",
    initial: "이",
    name: "이유경 대표",
    role: "비주얼그룹 대표 · 매장 운영 컨설턴트",
    desc: "8개 지점을 직접 운영하며 쌓은 경영 노하우로 오토사장반, 월 2000플랜 등 경영 과정을 이끌어요.",
  },
  {
    id: "sundol",
    initial: "순",
    name: "순돌 이사",
    role: "비주얼뷰티 공동대표 · 모발 과학 분석사",
    desc: "부산 서면전포점을 운영하며, 데이터 기반 모발 진단 프로그램인 시그니처 프로그램을 개발했어요.",
  },
  {
    id: "kim-jieun",
    initial: "김",
    name: "김지은 강사",
    role: "비주얼아카데미 수석 강사 · 실무 경력 14년",
    desc: "디자이너의 정석 전 레벨을 총괄하며, 브랜드 컨셉부터 포트폴리오 완성까지 지도해요.",
  },
  {
    id: "park-seoyeon",
    initial: "박",
    name: "박서연 강사",
    role: "비주얼아카데미 컬러 전문 강사 · 실무 경력 11년",
    desc: "퍼스널 컬러 진단을 상담과 매출로 연결하는 실전 컬러 특강을 담당해요.",
  },
];

export function getInstructor(id: string): Instructor {
  return instructors.find((i) => i.id === id) ?? instructors[2];
}
