/* 도메인 타입 — 백엔드 API 스키마를 정할 때 이 파일을 기준으로 맞춘다 */

export type ClassCategory = "정석" | "특강" | "세미나" | "경영" | "온라인";

/** offline: 기수제(일정 확정) · seminar: 대규모 세미나 · waitlist: 개설 대기 · online: 상시 VOD · upcoming: 개설 예정(정석 상위 레벨) */
export type ClassType = "offline" | "seminar" | "waitlist" | "online" | "upcoming";

export type ClassStatus =
  | "모집중"
  | "마감임박"
  | "마감"
  /** 판매 상태 품절 — 아임웹에서 판매가 끝난 교육. 목록에서는 필터·검색·품절 탭에서만 보인다 */
  | "품절"
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
  /** 개설 대기: 이 인원이 모이면 개설 (메인 모집 카드의 '개설 기준') */
  goal?: number;
  /** 원 단위, 0 = 무료, null = 미정 */
  price: number | null;
  /** 가격 옵션이 있으면 고객이 하나를 골라 결제한다 (price 는 가장 싼 옵션) */
  options?: PriceOption[];
  /** 품절(신청 불가) · 숨김(고객 화면에서 빠짐). 없으면 판매중 */
  saleStatus?: Exclude<SaleStatus, "on">;
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
  /** 임시저장(고객 화면 미노출) — 관리자 화면에서만 */
  draft?: boolean;
  /** 관리자 콘텐츠 관리에서 올린 이미지 주소 */
  images?: { thumb?: string; banner?: string; detail?: string };
  detail?: ClassDetail;
}

export interface Instructor {
  id: string;
  initial: string;
  name: string;
  role: string;
  desc: string;
  /** 프로필 사진 경로 (public/images/instructors) — 없으면 이름 첫 글자 */
  img?: string | null;
}

/** 가격 옵션 — 예) { label: "4회", price: 350000 } */
export interface PriceOption {
  label: string;
  /** 판매가 */
  price: number;
  /** 정가 — 판매가보다 크면 취소선 + 할인율로 보여준다 */
  listPrice?: number;
  /** 얼리버드: earlyUntil(YYYY-MM-DD, 그날 포함)까지 이 가격 */
  earlyPrice?: number;
  earlyUntil?: string;
}

/** 클래스 판매 상태 — 없으면 판매중 */
export type SaleStatus = "on" | "soldout" | "hidden";

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
  /** 카드 승인번호 (실제 결제만) */
  approvedNo?: string;
  /** 고객이 마이페이지에서 취소를 요청한 건 */
  cancelRequested?: boolean;
  refund?: { type: "full" | "partial"; amount: number; reason: string; refundedAt: string };
  invoice?: InvoiceRecord;
}

/** 세금계산서(과세)·계산서(면세) — payments.invoice. 실제 발행분만 mgtKey 이하가 채워진다 */
export interface InvoiceRecord {
  bizNo: string;
  bizName: string;
  ceo: string;
  email: string;
  issuedAt: string;
  /** 팝빌 문서번호 · 국세청 승인번호 · 작성일자(yyyyMMdd) · 지금 신고된 금액 */
  mgtKey?: string;
  ntsConfirmNum?: string;
  writeDate?: string;
  amount?: number;
  seq?: number;
  /** 전액 환불로 발행취소·계약해제된 상태 */
  canceled?: boolean;
  history?: { at: string; kind: "발행" | "발행취소" | "수정발행"; mgtKey: string; amount: number; ntsConfirmNum?: string; modifyCode?: number }[];
}

/** 제휴·가맹 문의 처리 상태 — new 신규 · prog 확인중 · done 완료 */
export type InquiryStatus = "new" | "prog" | "done";

export type InquiryType = "가맹 개설 문의" | "교육 제휴 문의" | "기업 단체 교육 문의" | "기타";

/** 관리자 문의함 한 건 (inquiries 테이블 + payload jsonb) */
export interface Inquiry {
  id: string;
  /** KST "YYYY-MM-DD HH:mm" */
  date: string;
  name: string;
  /** 매장·소속 (없으면 "-") */
  shop: string;
  phone: string;
  type: InquiryType;
  status: InquiryStatus;
  body: string;
  /** 담당자 메모 (고객 비공개) */
  memo: string;
}
