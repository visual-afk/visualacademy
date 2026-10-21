import type { AcademyClass, ClassDetail } from "@/lib/types";

/*
 * 클래스 목업 데이터 — 메인·클래스 목록·상세·신청·관리자 대시보드가 모두 이 한 곳을 본다.
 * 프로토타입마다 흩어져 있던 값을 합쳤고, 개강일은 오늘 기준으로 프로토타입과 같은 상태 배지가 나오도록 맞췄다.
 * 백엔드 연동 시 src/lib/api.ts 의 함수만 실제 API 호출로 바꾸면 된다.
 */

const OFFLINE_REFUND_FAQ = [
  { q: "비전공자도 들을 수 있나요?", a: "네, 기초 과정부터 차근차근 안내해드려요." },
  { q: "결석하면 어떻게 되나요?", a: "정규 과정은 다음 기수 동일 회차에 보강 참여가 가능해요." },
];

const level2Detail: ClassDetail = {
  checklist: [
    "레벨 1을 수료했거나 동급 실무 경력이 있는 분",
    "어려운 모발과 시술 앞에서 자신이 없는 1~3년차 디자이너",
    "모발과학 기준으로 시술을 설명하고 싶은 분",
  ],
  curriculumTitle: "회차별 커리큘럼",
  lessons: [
    { t: "1회차 · 모발 진단 기준 세우기", d: "손상 단계별 진단 체크리스트" },
    { t: "2회차 · 약제 반응 이해", d: "알칼리·환원제 반응과 손상 관계" },
    { t: "3회차 · 손상모 컬러 설계", d: "손상 단계를 읽고 컬러 레시피 설계" },
    { t: "4회차 · 펌 응용", d: "모질별 와인딩·약제 선택" },
    { t: "5회차 · 매직·볼륨매직", d: "열처리 온도와 텐션 관리", hidden: true },
    { t: "6회차 · 고객 상담", d: "진단 결과를 시술 제안으로 연결", hidden: true },
    { t: "7회차 · 케이스 리뷰", d: "개인 시술 사례 피드백", hidden: true },
    { t: "8회차 · 최종 평가", d: "실기 평가 및 수료증 전달", hidden: true },
  ],
  instructorId: "kim-jieun",
  reviews: [
    { name: "박○○", text: "실무에서 바로 쓸 수 있는 내용 위주라 만족스러웠어요. 강사님 피드백도 꼼꼼했습니다." },
    { name: "이○○", text: "혼자 독학할 때보다 훨씬 체계적으로 배울 수 있었어요." },
  ],
  prep: "가위, 클립, 필기구. 실습 모델은 아카데미에서 연결해드려요.\n재료비 3만원은 첫 수업 시 별도 안내",
  faqs: OFFLINE_REFUND_FAQ,
  buyboxQuote: "\"실무에서 바로 쓸 수 있는 내용이라 좋았어요.\"",
  needPrereq: true,
  doneNotes: [
    "개강 3일 전 알림톡으로 준비물과 오시는 길을 다시 안내드려요",
    "오시는 길: 서울 강남구 언주로 622 (논현동, 구암빌딩) 1층",
    "준비물: 가위, 클립, 필기구",
  ],
};

export const classes: AcademyClass[] = [
  /* ── 디자이너의 정석 (레벨 1~4, 순서가 있는 정규 커리큘럼) ── */
  {
    id: 1, slug: "designer-level-1", name: "디자이너의 정석 레벨 1", cat: "정석", field: "모발과학", target: "입문",
    day: "월", time: "13:00~18:00", place: "강남 본원", date: "2026-10-26", capacity: 8, applied: 3,
    price: 1200000, type: "offline", cert: true, noob: true, step: 1, level: 1, taxType: "taxable", weeks: 10,
    summary: "아직 손이 서툴고 기본기부터 제대로 다지고 싶은 분을 위한 첫 단계",
  },
  {
    id: 2, slug: "designer-level-2", name: "디자이너의 정석 레벨 2", cat: "정석", field: "모발과학", target: "디자이너",
    day: "화", time: "13:00~18:00", place: "강남 본원", date: "2026-10-27", capacity: 8, applied: 6,
    price: 1200000, type: "offline", cert: true, noob: false, step: 2, level: 2, taxType: "taxable", weeks: 10,
    summary: "손상 단계를 읽고 컬러를 설계하는 과정", detail: level2Detail,
  },
  {
    id: 3, slug: "designer-level-3", name: "디자이너의 정석 레벨 3", cat: "정석", field: "모발과학", target: "디자이너",
    day: null, time: null, place: null, date: null, capacity: null, applied: null,
    price: null, type: "upcoming", cert: true, noob: false, step: 3, level: 3, taxType: "taxable", weeks: 10,
    summary: "어떤 손님이 와도 흔들림 없는 실력으로 지명 고객을 늘리는 단계",
  },
  {
    id: 4, slug: "designer-level-4", name: "디자이너의 정석 레벨 4", cat: "정석", field: "모발과학", target: "원장·창업",
    day: null, time: null, place: null, date: null, capacity: null, applied: null,
    price: null, type: "upcoming", cert: true, noob: false, step: 4, level: 4, taxType: "taxable", weeks: 10,
    summary: "시술에서 벗어나 운영으로 성장하는 오토사장 단계",
  },

  /* ── 단독 특강 ── */
  {
    id: 5, slug: "personal-color", name: "퍼스널 컬러 진단 교육", cat: "특강", field: "컬러", target: "디자이너",
    day: "토", time: "10:00~16:00", place: "강남 본원", date: "2026-10-31", capacity: 8, applied: 7,
    price: 500000, type: "offline", cert: false, noob: true, step: null, taxType: "taxable",
    summary: "감으로 하던 컬러 진단에 기준을 세우는 1일 특강",
    detail: {
      checklist: [
        "고객 얼굴에 맞는 컬러를 감으로만 진단해온 디자이너",
        "퍼스널 컬러 상담을 매출로 연결하고 싶은 디자이너",
        "비전공자로 시작해 컬러 진단 실무를 처음 배우는 분",
      ],
      curriculumTitle: "당일 커리큘럼",
      lessons: [
        { t: "퍼스널 컬러 이론", d: "웜/쿨 톤 분류 기준과 실무에서 자주 하는 오진단 사례" },
        { t: "진단 도구 실습", d: "드레이핑 천을 활용한 톤 진단 실습 (1:1 실습)" },
        { t: "고객 상담 스크립트", d: "진단 결과를 컬러 시술·상품 추천으로 연결하는 상담 화법" },
        { t: "현장 적용 케이스", d: "실제 매장 상담 사례로 진단→제안 전 과정 리뷰" },
      ],
      instructorId: "park-seoyeon",
      reviews: [
        { name: "최○○", text: "감으로 하던 진단에 기준이 생겼어요. 상담 시간도 훨씬 짧아졌습니다." },
        { name: "정○○", text: "하루 과정이라 부담 없이 들었는데 실습 위주라 남는 게 많았어요." },
      ],
      prep: "필기구, 개인 진단 대상(모델) 1인 동반 가능. 드레이핑 천 등 실습 도구는 현장에서 제공됩니다.",
      faqs: [
        { q: "비전공자도 들을 수 있나요?", a: "네, 이론부터 차근차근 안내해드려요." },
        { q: "수료증이 발급되나요?", a: "이 특강은 별도 수료증 없이 참가확인증이 제공돼요." },
        { q: "결석하면 환불되나요?", a: "단회차 특강 특성상 환불 규정을 따르며, 보강은 제공되지 않아요." },
      ],
      buyboxQuote: "\"감으로 하던 진단에 기준이 생겼어요.\"",
      doneNotes: [
        "개강 3일 전 알림톡으로 준비물과 오시는 길을 다시 안내드려요",
        "오시는 길: 서울 강남구 언주로 622 (논현동, 구암빌딩) 1층",
        "준비물: 필기구 (실습 도구는 현장 제공)",
      ],
    },
  },
  {
    id: 6, slug: "cloud-perm", name: "구름펌 클래스", cat: "특강", field: "펌·매직", target: "디자이너",
    day: "금", time: "13:00~17:00", place: "강남 본원", date: "2026-10-09", capacity: 8, applied: 8,
    price: 350000, type: "offline", cert: false, noob: false, step: null, taxType: "taxable",
    summary: "볼륨과 웨이브를 살리는 구름펌 1일 특강",
  },
  {
    id: 7, slug: "blanc-cut", name: "블랑컷 실습 커트 교육", cat: "특강", field: "커트", target: "디자이너",
    day: "월", time: "14:00~17:00", place: "강남 본원", date: "2026-11-02", capacity: 10, applied: 4,
    price: 100000, type: "offline", cert: false, noob: false, step: null, taxType: "taxable",
    summary: "모델 실습으로 익히는 블랑컷",
  },
  {
    id: 8, slug: "damaged-hair-softening", name: "손상모 연화 노하우", cat: "특강", field: "모발과학", target: "디자이너",
    day: "미정", time: "13:00~18:00", place: "강남 본원", date: null, capacity: null, applied: 24,
    price: 350000, type: "waitlist", cert: false, noob: false, step: 3, taxType: "taxable",
    summary: "손상모 시술의 핵심, 연화 단계를 집중적으로 다루는 특강",
  },

  /* ── 세미나 ── */
  {
    id: 9, slug: "hair-science-seminar", name: "모발과학 아카데미 세미나", cat: "세미나", field: "모발과학", target: "전체",
    day: "목", time: "14:00~18:00", place: "코엑스 컨퍼런스룸 B", date: "2026-11-19", capacity: 200, applied: 24,
    price: 0, type: "seminar", cert: false, noob: true, step: null, taxType: "exempt",
    summary: "누구나 참여할 수 있는 무료 공개 세미나",
  },

  /* ── 경영·컨설팅 ── */
  {
    id: 10, slug: "startup-consulting", name: "창업·경영 컨설팅", cat: "경영", field: "경영·마케팅", target: "원장·창업",
    day: "수", time: "10:00~13:00", place: "강남 본원", date: "2026-10-28", capacity: 6, applied: 2,
    price: 450000, type: "offline", cert: false, noob: false, step: 4, taxType: "taxable",
    summary: "샵 오픈을 준비하는 원장님을 위한 창업·경영 컨설팅",
  },

  /* ── 온라인 ── */
  {
    id: 11, slug: "monthly-2000-plan", name: "월 2000플랜", cat: "온라인", field: "경영·마케팅", target: "원장·창업",
    day: "상시", time: "-", place: "온라인", date: null, capacity: null, applied: 12,
    price: 550000, type: "online", cert: true, noob: false, step: 4, taxType: "taxable", months: 9,
    summary: "월매출 2,000만원을 만드는 매장 운영 설계 로드맵",
    detail: {
      checklist: [
        "오프라인 매장을 운영 중이거나 예정인 분",
        "안정적인 매출 구조를 만들고 싶은 분",
        "정해진 시간 없이 스스로 학습하고 싶은 분",
      ],
      curriculumTitle: "강의 구성 (총 6강)",
      lessons: [
        { t: "1강 · 오토사장 시스템 개요", d: "매장이 스스로 돌아가는 구조 만들기" },
        { t: "2강 · 예약·매출 자동화", d: "예약 시스템과 정산 흐름 세팅" },
        { t: "3강 · 재구매 설계", d: "고객 리텐션을 위한 운영 루틴" },
        { t: "4강 · 팀 위임", d: "디자이너 채용과 업무 매뉴얼" },
        { t: "5강 · 매출 2,000만원 로드맵", d: "단계별 목표 설정", hidden: true },
        { t: "6강 · 케이스 스터디", d: "실제 매장 운영 사례 분석", hidden: true },
      ],
      instructorId: "lee-yukyung",
      reviews: [
        { name: "김○○", text: "미리보기로 먼저 보고 결제해서 믿고 시작할 수 있었어요." },
        { name: "윤○○", text: "원할 때 이어볼 수 있어서 매장 운영하면서 듣기 훨씬 편했습니다." },
      ],
      prep: "별도 준비물은 없어요. 결제 후 즉시 온라인으로 수강할 수 있습니다. (VOD + 실습 자료 다운로드)",
      faqs: [
        { q: "미리보기만 보고 결제를 미뤄도 되나요?", a: "네, 1강은 결제 없이 언제든 다시 볼 수 있어요." },
        { q: "수강 기간이 끝나면 어떻게 되나요?", a: "만료 30일 전 알림톡으로 안내드리고, 연장 신청도 가능해요." },
        { q: "수료증이 발급되나요?", a: "전 강의 시청 완료 시 수료증이 발급돼요." },
      ],
      preview: { title: "1강 · 오토사장 시스템 개요", desc: "매장이 스스로 돌아가는 구조 만들기", duration: "12:34" },
      buyboxQuote: "\"원할 때 이어볼 수 있어서 훨씬 편했습니다.\"",
      doneNotes: [
        "지금 바로 강의를 수강할 수 있어요",
        "어디서든 이어보기로 진도가 자동 저장돼요",
        "수강 기간 만료 30일 전 알림톡으로 미리 안내드려요",
      ],
    },
  },
  {
    id: 12, slug: "auto-owner", name: "오토사장", cat: "온라인", field: "경영·마케팅", target: "원장·창업",
    day: "상시", time: "-", place: "온라인", date: null, capacity: null, applied: 8,
    price: 890000, type: "online", cert: false, noob: false, step: 4, taxType: "taxable", months: 9,
    summary: "시술에서 벗어나 매장이 스스로 돌아가게 만드는 자동화 운영 시스템",
  },
];

/** 프로토타입의 ?cls=offline / ?cls=online 링크 호환 */
export const CLASS_ALIASES: Record<string, string> = {
  offline: "designer-level-2",
  online: "monthly-2000-plan",
};
