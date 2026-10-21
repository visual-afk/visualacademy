/* 도메인 타입 — 백엔드 API 스키마를 정할 때 이 파일을 기준으로 맞춘다 */

export type ClassCategory = "정석" | "특강" | "세미나" | "경영" | "온라인";

/** offline: 기수제(일정 확정) · seminar: 대규모 세미나 · waitlist: 개설 대기 · online: 상시 VOD · upcoming: 개설 예정(정석 상위 레벨) */
export type ClassType = "offline" | "seminar" | "waitlist" | "online" | "upcoming";

export type ClassStatus =
  | "모집중"
  | "마감임박"
  | "마감"
  | "종료"
  | "개설대기"
  | "개설예정"
  | "온라인상시";

export type TaxType = "taxable" | "exempt";

/** 성장 로드맵 단계 (1 초보 · 2 중급 · 3 고급 · 4 오토사장) */
export type RoadmapStep = 1 | 2 | 3 | 4;

export interface Lesson {
  t: string;
  d: string;
  hidden?: boolean;
}

export interface Faq {
  q: string;
  a: string;
}

export interface Review {
  name: string;
  text: string;
}

export interface ClassDetail {
  checklist: string[];
  curriculumTitle: string;
  lessons: Lesson[];
  instructorId: string;
  reviews: Review[];
  prep: string;
  faqs: Faq[];
  /** 상세페이지 본문 이미지 (세로로 긴 이미지). 없으면 자리표시 */
  detailImage?: string;
  /** 온라인 강의 1강 무료 미리보기 */
  preview?: { title: string; desc: string; duration: string };
  buyboxQuote: string;
  /** 구매박스 하단 정보 행 */
  info?: [string, string][];
  /** 신청 시 선수 과정 확인 체크 필요 여부 */
  needPrereq?: boolean;
  /** 결제 완료 후 안내 문구 */
  doneNotes?: string[];
}

export interface AcademyClass {
  id: number;
  slug: string;
  name: string;
  cat: ClassCategory;
  field: "모발과학" | "컬러" | "펌·매직" | "커트" | "경영·마케팅";
  target: "입문" | "디자이너" | "원장·창업" | "전체";
  /** 요일 한 글자 (월~토), '상시', '미정' 또는 null(개설 예정) */
  day: string | null;
  time: string | null;
  place: string | null;
  /** YYYY-MM-DD */
  date: string | null;
  capacity: number | null;
  /** 신청 인원 (개설 대기는 알림 신청 인원) */
  applied: number | null;
  /** 원 단위, 0 = 무료, null = 미정 */
  price: number | null;
  type: ClassType;
  cert: boolean;
  noob: boolean;
  step: RoadmapStep | null;
  /** 디자이너의 정석 레벨 (정석만) */
  level?: RoadmapStep;
  taxType: TaxType;
  summary: string;
  weeks?: number;
  /** 온라인 수강 기간(개월) */
  months?: number;
  manualEnd?: boolean;
  detail?: ClassDetail;
}

export interface Instructor {
  id: string;
  initial: string;
  name: string;
  role: string;
  desc: string;
}

export type PaymentStatus = "결제완료" | "부분환불" | "환불완료" | "입금대기";

export interface Payment {
  id: string;
  className: string;
  cat: ClassCategory;
  applicant: string;
  method: string;
  amount: number;
  taxType: TaxType;
  paidAt: string;
  status: PaymentStatus;
  refund?: { type: "full" | "partial"; amount: number; reason: string; refundedAt: string };
  invoice?: { bizNo: string; bizName: string; ceo: string; email: string; issuedAt: string };
}
