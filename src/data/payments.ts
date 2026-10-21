import type { Payment } from "@/lib/types";

export const payments: Payment[] = [
  { id: "VA-20260919-0131", className: "디자이너의 정석 레벨 2", cat: "정석", applicant: "김민지", method: "신용카드", amount: 1200000, taxType: "taxable", paidAt: "2026-09-19 14:22", status: "결제완료" },
  { id: "VA-20260920-0132", className: "디자이너의 정석 레벨 2", cat: "정석", applicant: "박서현", method: "간편결제", amount: 1200000, taxType: "taxable", paidAt: "2026-09-20 10:05", status: "결제완료" },
  { id: "VA-20260922-0137", className: "디자이너의 정석 레벨 2", cat: "정석", applicant: "윤도현", method: "신용카드", amount: 1200000, taxType: "taxable", paidAt: "2026-09-22 12:02", status: "결제완료" },
  { id: "VA-20260908-0101", className: "퍼스널 컬러 진단 교육", cat: "특강", applicant: "임하은", method: "간편결제", amount: 500000, taxType: "taxable", paidAt: "2026-09-08 19:33", status: "결제완료" },
  { id: "VA-20260918-0128", className: "퍼스널 컬러 진단 교육", cat: "특강", applicant: "이수진", method: "신용카드", amount: 500000, taxType: "taxable", paidAt: "2026-09-18 16:40", status: "결제완료" },
  { id: "VA-20260921-0135", className: "퍼스널 컬러 진단 교육", cat: "특강", applicant: "정하윤", method: "계좌이체", amount: 500000, taxType: "taxable", paidAt: "2026-09-21 09:15", status: "결제완료" },
  { id: "VA-20260915-0120", className: "구름펌 클래스", cat: "특강", applicant: "최유리", method: "신용카드", amount: 350000, taxType: "taxable", paidAt: "2026-09-15 11:30",
    status: "환불완료", refund: { type: "full", amount: 350000, reason: "일정 참석 불가", refundedAt: "2026-09-17 10:12" } },
  { id: "VA-20260916-0122", className: "구름펌 클래스", cat: "특강", applicant: "한소영", method: "간편결제", amount: 350000, taxType: "taxable", paidAt: "2026-09-16 13:05", status: "결제완료" },
  { id: "VA-20260919-0130", className: "구름펌 클래스", cat: "특강", applicant: "서지후", method: "신용카드", amount: 350000, taxType: "taxable", paidAt: "2026-09-19 10:10", status: "결제완료" },
  { id: "VA-20260907-0098", className: "블랑컷 실습 커트 교육", cat: "특강", applicant: "문채원", method: "신용카드", amount: 100000, taxType: "taxable", paidAt: "2026-09-07 09:00", status: "결제완료" },
  { id: "VA-20260911-0109", className: "블랑컷 실습 커트 교육", cat: "특강", applicant: "신예진", method: "체크카드", amount: 100000, taxType: "taxable", paidAt: "2026-09-09 15:22",
    status: "부분환불", refund: { type: "partial", amount: 30000, reason: "강의 내용 불만족", refundedAt: "2026-09-14 11:40" } },
  { id: "VA-20260912-0112", className: "월 2000플랜", cat: "온라인", applicant: "조민재", method: "간편결제", amount: 550000, taxType: "taxable", paidAt: "2026-09-12 20:11", status: "결제완료" },
  { id: "VA-20260917-0126", className: "월 2000플랜", cat: "온라인", applicant: "백도윤", method: "가상계좌", amount: 550000, taxType: "taxable", paidAt: "2026-09-17 08:40", status: "입금대기" },
  { id: "VA-20260913-0113", className: "창업·경영 컨설팅", cat: "경영", applicant: "장서연", method: "신용카드", amount: 450000, taxType: "taxable", paidAt: "2026-09-13 17:50", status: "결제완료" },
  { id: "VA-20261002-0151", className: "퍼스널 컬러 진단 교육", cat: "특강", applicant: "오세린", method: "신용카드", amount: 500000, taxType: "taxable", paidAt: "2026-10-02 11:20", status: "결제완료" },
  { id: "VA-20261006-0158", className: "디자이너의 정석 레벨 1", cat: "정석", applicant: "권나래", method: "간편결제", amount: 1200000, taxType: "taxable", paidAt: "2026-10-06 15:47", status: "결제완료" },
  { id: "VA-20261009-0163", className: "오토사장", cat: "온라인", applicant: "류지환", method: "가상계좌", amount: 890000, taxType: "taxable", paidAt: "2026-10-09 09:31", status: "입금대기" },
];
