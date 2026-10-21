/* 마이페이지 목업 — 로그인 연동 후 GET /api/me, /api/me/applications 등으로 대체 */
import type { TaxType } from "@/lib/types";

export const me = {
  initial: "김",
  name: "김민지",
  grade: "정회원",
  email: "minji@example.com",
  phone: "010-1234-5678",
};

export type ApplicationStatus = "수강 확정" | "입금 대기" | "수강 완료" | "신청 취소";

export const applications: {
  cat: string;
  title: string;
  slug?: string;
  when: string;
  place: string;
  status: ApplicationStatus;
  price: number;
  thumb: string;
}[] = [
  { cat: "단독 특강", title: "퍼스널 컬러 진단 교육", slug: "personal-color", when: "2026.10.31 (토) 10:00", place: "비주얼아카데미 강남 본원", status: "수강 확정", price: 500000, thumb: "" },
  { cat: "경영 · 컨설팅", title: "창업·경영 컨설팅", slug: "startup-consulting", when: "2026.10.28 (수) 10:00", place: "비주얼아카데미 강남 본원", status: "입금 대기", price: 450000, thumb: "t2" },
  { cat: "세미나", title: "2026 헤어 트렌드 세미나", when: "2026.09.20 (일) 13:00", place: "비주얼아카데미 강남 본원", status: "수강 완료", price: 80000, thumb: "t3" },
  { cat: "단독 특강", title: "두피 스케일링 심화반", when: "2026.08.11 (화) 10:00", place: "비주얼아카데미 강남 본원", status: "신청 취소", price: 350000, thumb: "t4" },
];

export type MyPaymentStatus = "결제완료" | "입금 대기" | "환불완료";

export const myPayments: {
  date: string;
  item: string;
  method: string;
  status: MyPaymentStatus;
  amount: number;
  taxType: TaxType;
}[] = [
  { date: "2026.10.01", item: "퍼스널 컬러 진단 교육", method: "신용카드", status: "결제완료", amount: 500000, taxType: "taxable" },
  { date: "2026.10.12", item: "창업·경영 컨설팅", method: "무통장입금", status: "입금 대기", amount: 450000, taxType: "taxable" },
  { date: "2026.09.05", item: "2026 헤어 트렌드 세미나", method: "신용카드", status: "결제완료", amount: 80000, taxType: "taxable" },
  { date: "2026.07.28", item: "두피 스케일링 심화반", method: "신용카드", status: "환불완료", amount: 350000, taxType: "taxable" },
];

export const myCourses = [
  { title: "월 2000플랜 (온라인)", meta: "9개월 수강권 · 총 6강 중 3강 완료", pct: 50, expiry: "2027.06.20", thumb: "", done: false },
  { title: "기초 모발 과학 (온라인)", meta: "6개월 수강권 · 총 8강 중 8강 완료", pct: 100, expiry: "2026.12.02", thumb: "t2", done: true },
];

export const MY_TABS = [
  { key: "apply", label: "신청 내역" },
  { key: "pay", label: "결제 내역" },
  { key: "online", label: "온라인 수강권한" },
  { key: "info", label: "내 정보" },
] as const;
