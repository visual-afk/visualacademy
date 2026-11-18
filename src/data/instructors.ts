import type { Instructor } from "@/lib/types";

export const instructors: Instructor[] = [
  {
    id: "lee-yukyung",
    initial: "이",
    name: "이유경",
    role: "대표원장",
    desc: "8개 지점을 직접 운영하며 쌓은 경영 노하우로 오토사장반, 월 2000플랜 등 경영 과정을 이끌어요.",
    img: "/images/instructors/lee-yukyung.jpg",
  },
  {
    id: "sundol",
    initial: "순",
    name: "순돌",
    role: "이사 · 원장",
    desc: "부산 서면전포점을 운영하며, 데이터 기반 모발 진단 프로그램인 시그니처 프로그램을 개발했어요.",
    img: "/images/instructors/sundol.jpg",
  },
  {
    id: "junmo",
    initial: "준",
    name: "준모",
    role: "디자이너",
    desc: "",
    img: "/images/instructors/junmo.jpg",
  },
  {
    id: "rihyun",
    initial: "리",
    name: "리현",
    role: "실장",
    desc: "",
    img: "/images/instructors/rihyun.jpg",
  },
  {
    id: "hoseung",
    initial: "호",
    name: "호승",
    role: "원장",
    desc: "",
    img: "/images/instructors/hoseung.jpg",
  },
  {
    id: "changmin",
    initial: "창",
    name: "창민",
    role: "원장",
    desc: "",
    img: "/images/instructors/changmin.jpg",
  },
  {
    id: "jiseong",
    initial: "지",
    name: "지성",
    role: "원장",
    desc: "",
    img: "/images/instructors/jiseong.jpg",
  },
  {
    id: "seongsil",
    initial: "성",
    name: "성실",
    role: "원장",
    desc: "시니어컷·숏컷 전문. 고객의 이미지와 라이프스타일을 분석해 디자인으로 연결하는 실전 중심 교육을 해요. 비주얼살롱 사가정점 대표원장, 비주얼아카데미 레벨 과정 강사.",
    img: "/images/instructors/seongsil.jpg",
  },
];

export function getInstructor(id: string): Instructor {
  return instructors.find((i) => i.id === id) ?? instructors[0];
}
