/* 디자인 모드 — 영역별 입력 폼 스키마 (프로토타입 SEC_* 그대로) */
import { ROUTES } from "@/data/site";
import type { ContentPageKey } from "@/data/siteContent";

export type Field =
  | { note: string }
  | { sub: string }
  | { k: string; l: string; t: "text" | "textarea"; hint?: string }
  | { k: string; l: string; t: "select"; o: [string, string][]; hint?: string }
  | { k: string; l: string; t: "image"; rec: [number, number, string]; hint?: string }
  | { k: string; l: string; t: "list"; item: string; fixed?: boolean; max?: number; num?: boolean; f: Field[]; hint?: string };

export interface SectionSchema {
  name: string;
  sub: string;
  fields: Field[];
}

const PH = "**굵게**처럼 별표 두 개로 감싸면 굵은 글씨가 돼요";
const DASH = ROUTES.admin;

const SEC_MAIN: Record<string, SectionSchema> = {
  nav: { name: "상단 메뉴", sub: "로고 · 메뉴 4개 · 상담 버튼", fields: [
    { k: "logo", l: "로고 텍스트", t: "text" },
    { k: "links", l: "메뉴", t: "list", item: "메뉴", fixed: true, f: [{ k: "label", l: "메뉴 이름", t: "text" }] },
    { k: "cta", l: "상담 버튼 문구", t: "text" }] },
  hero: { name: "첫 화면 (검색)", sub: "제목 · 검색창 · 추천 검색어 · 배지", fields: [
    { k: "eyebrow", l: "작은 제목 (위)", t: "text" },
    { k: "title", l: "큰 제목", t: "textarea" },
    { k: "placeholder", l: "검색창 안내 문구", t: "text" },
    { k: "suggest", l: "추천 검색어", t: "list", item: "검색어", max: 5, f: [{ k: "t", l: "검색어", t: "text" }] },
    { k: "badges", l: "떠 있는 배지", t: "list", item: "배지", max: 2, f: [{ k: "t", l: "문구", t: "text" }] },
    { note: "검색 결과·동의어·추천 질문 등 검색 데이터는 별도 '검색 관리' 메뉴에서 다룰 예정이에요." }] },
  roadmap: { name: "성장 로드맵", sub: "4단계 · hover 이미지 · 연결 강의", fields: [
    { k: "title", l: "섹션 제목", t: "text" }, { k: "desc", l: "섹션 설명", t: "text" },
    { k: "tabs", l: "경력 탭", t: "list", item: "탭", fixed: true, f: [{ k: "t", l: "탭 이름", t: "text" }] },
    { k: "steps", l: "단계 (Step 01 → 04, 그래프 위 위치 순)", t: "list", item: "Step", fixed: true, num: true, f: [
      { k: "name", l: "단계 이름", t: "text" }, { k: "desc", l: "대상 설명", t: "textarea", hint: "줄바꿈 가능" },
      { k: "img", l: "마우스 올릴 때 보이는 사진", t: "image", rec: [420, 630, "2:3 세로"] },
      { sub: "선택 시 아래에 나오는 연결 강의 카드" },
      { k: "cls", l: "강의명", t: "text" }, { k: "meta", l: "요일 · 기간 · 조건", t: "text" }, { k: "chips", l: "함께 보여줄 강의", t: "text", hint: "쉼표로 구분" }] }] },
  recruit: { name: "이번 기수 모집중", sub: "제목 · 노출 규칙 (카드는 클래스 관리에서 자동)", fields: [
    { k: "title", l: "섹션 제목", t: "text" }, { k: "desc", l: "섹션 설명", t: "text" },
    { k: "count", l: "보여줄 클래스 수", t: "select", o: [["3", "3개"], ["6", "6개"]] },
    { k: "rule", l: "노출 우선순위", t: "select", o: [["imminent", "마감 임박 순"], ["start", "개강일 빠른 순"], ["manual", "클래스 관리에서 지정한 순서"]] },
    { note: `카드 안의 일정·정원·수강료는 <a href="${DASH}">클래스 관리</a>에서 입력한 값이 자동으로 들어와요. 여기서는 노출 방식만 정해요.` }] },
  programs: { name: "프로그램 3갈래", sub: "카드 3개 · 클래스 목록 연결", fields: [
    { k: "title", l: "섹션 제목", t: "text" }, { k: "desc", l: "섹션 설명", t: "text" },
    { k: "cards", l: "카드", t: "list", item: "카드", fixed: true, f: [{ k: "title", l: "제목", t: "text" }, { k: "desc", l: "설명", t: "textarea" },
      { k: "link", l: "\"전체 보기\"가 열 분류", t: "select", o: [["정석", "디자이너의 정석"], ["특강", "단독 특강"], ["경영", "경영 · 컨설팅"], ["", "전체 클래스"]] }] }] },
  online: { name: "온라인 강의 배너", sub: "문구 · 버튼", fields: [
    { k: "title", l: "제목", t: "text" }, { k: "desc", l: "설명", t: "text" }, { k: "btn", l: "버튼 문구", t: "text" }] },
  instructors: { name: "강사 소개", sub: "사진 · 이름 · 직함", fields: [
    { k: "title", l: "섹션 제목", t: "text" }, { k: "desc", l: "섹션 설명", t: "text" },
    { k: "list", l: "강사", t: "list", item: "강사", max: 8, f: [{ k: "img", l: "사진", t: "image", rec: [600, 800, "3:4 세로"] }, { k: "name", l: "이름", t: "text" }, { k: "role", l: "직함", t: "text" }] }] },
  reviews: { name: "수강생 후기", sub: "후기 문구 · 작성자", fields: [
    { k: "title", l: "섹션 제목", t: "text" }, { k: "desc", l: "섹션 설명", t: "text" },
    { k: "list", l: "후기", t: "list", item: "후기", max: 6, f: [{ k: "q", l: "후기 내용", t: "textarea" }, { k: "a", l: "작성자", t: "text" }] }] },
  salon: { name: "비주얼살롱 배너", sub: "문구 · 버튼", fields: [
    { k: "title", l: "제목", t: "text" }, { k: "desc", l: "설명", t: "text" }, { k: "btn", l: "버튼 문구", t: "text" }] },
  footer: { name: "푸터", sub: "소개 · 링크 모음 · 사업자 정보", fields: [
    { k: "desc", l: "한 줄 소개", t: "text" },
    { k: "cols", l: "링크 모음", t: "list", item: "묶음", fixed: true, f: [{ k: "h", l: "묶음 제목", t: "text" }, { k: "links", l: "링크 이름들", t: "text", hint: "쉼표로 구분" }] },
    { k: "biz1", l: "사업자 정보 (1줄)", t: "textarea" }, { k: "biz2", l: "주소 · 연락처 · 저작권 (2줄)", t: "textarea" }] },
};

const SEC_LIST: Record<string, SectionSchema> = {
  pagehead: { name: "페이지 제목 · 검색창", sub: "제목 · 설명 · 검색창 문구", fields: [
    { k: "title", l: "페이지 제목", t: "text" }, { k: "desc", l: "설명", t: "textarea" },
    { k: "placeholder", l: "검색창 안내 문구", t: "text" }, { k: "btn", l: "검색 버튼 문구", t: "text" }] },
  roadmap: { name: "성장 로드맵", sub: "4단계 · 단계별 연결 강의 카드", fields: [
    { k: "title", l: "섹션 제목", t: "text" }, { k: "desc", l: "섹션 설명", t: "textarea" },
    { k: "tabs", l: "경력 탭", t: "list", item: "탭", fixed: true, f: [{ k: "t", l: "탭 이름", t: "text" }] },
    { k: "steps", l: "단계 (Step 01 → 04)", t: "list", item: "Step", fixed: true, f: [
      { k: "label", l: "단계 이름 (작은 글씨)", t: "text" }, { k: "name", l: "레벨 이름 (큰 글씨)", t: "text" },
      { k: "chips", l: "함께 보여줄 강의", t: "text", hint: "쉼표로 구분" },
      { sub: "선택 시 아래에 나오는 카드" },
      { k: "card", l: "카드 제목", t: "text" }, { k: "meta", l: "요일 · 기간 · 조건", t: "text" }] },
    { note: "각 단계 옆의 <b>모집중·마감임박·개설 예정</b> 상태 배지는 클래스 관리의 정원·개강일로 자동 계산돼요." }] },
  filters: { name: "상태 탭 · 필터", sub: "탭 이름 · 필터 항목 이름 · 보기 전환", fields: [
    { k: "status", l: "상태 탭", t: "list", item: "탭", fixed: true, f: [{ k: "t", l: "탭 이름", t: "text" }] },
    { k: "selects", l: "필터 기본 항목 (6개)", t: "list", item: "필터", fixed: true, f: [{ k: "t", l: "표시 문구", t: "text" }] },
    { k: "cats", l: "분류 이름", t: "list", item: "분류", fixed: true, f: [{ k: "t", l: "분류 이름", t: "text" }] },
    { k: "reset", l: "필터 초기화 문구", t: "text" },
    { k: "viewA", l: "보기 전환 ① 문구", t: "text" }, { k: "viewB", l: "보기 전환 ② 문구", t: "text" }] },
  curriculum: { name: "디자이너의 정석 영역", sub: "제목 · 설명 · 소개 링크", fields: [
    { k: "title", l: "제목", t: "text" }, { k: "desc", l: "설명", t: "textarea" }, { k: "link", l: "오른쪽 링크 문구", t: "text" },
    { note: `레벨 1~4 카드의 일정·수강료는 <a href="${DASH}">클래스 관리</a>에서 가져와요.` }] },
  rows: { name: "분류별 목록 제목", sub: "단독 특강 · 세미나 · 경영 · 온라인", fields: [
    { k: "list", l: "목록 제목", t: "list", item: "목록", fixed: true, f: [{ k: "t", l: "제목", t: "text" }] },
    { note: `각 목록에 들어가는 클래스 카드는 <a href="${DASH}">클래스 관리</a>의 분류 설정을 따라요.` }] },
  empty: { name: "검색 결과 없음 안내", sub: "조건에 맞는 클래스가 없을 때 보이는 문구", fields: [
    { k: "big", l: "큰 문구", t: "text" }, { k: "desc", l: "설명", t: "textarea" }, { k: "btn", l: "버튼 문구", t: "text" }] },
};

const SEC_DET: Record<string, SectionSchema> = {
  crumb: { name: "상단 경로", sub: "맨 위 \"클래스 / 분류 / 제목\" 경로", fields: [{ k: "root", l: "첫 번째 경로 이름", t: "text" }] },
  tabs: { name: "탭 이름", sub: "상세정보 · 구매평 · Q&A · 반품/교환", fields: [
    { k: "info", l: "탭 ①", t: "text" }, { k: "reviews", l: "탭 ②", t: "text", hint: "뒤에 후기 개수가 자동으로 붙어요" }, { k: "qna", l: "탭 ③", t: "text", hint: "뒤에 질문 개수가 자동으로 붙어요" }, { k: "refund", l: "탭 ④", t: "text" }] },
  info: { name: "상세정보 탭", sub: "상세 이미지 · 이런 분께 · 강사 · 준비물 제목", fields: [
    { k: "ph", l: "상세 이미지가 아직 없을 때 보이는 문구", t: "text" },
    { k: "need", l: "\"이런 분께\" 제목", t: "text" }, { k: "instructor", l: "강사 소개 제목", t: "text" }, { k: "prep", l: "준비물 안내 라벨", t: "text" },
    { note: `제목 아래의 내용(체크리스트·커리큘럼·강사·준비물)은 클래스마다 달라서 <a href="${ROUTES.adminNewClass}">클래스 등록</a>에서 입력해요.` }] },
  reviews: { name: "구매평 탭", sub: "제목 · 후기가 없을 때 문구", fields: [
    { k: "title", l: "제목", t: "text" }, { k: "empty", l: "후기가 없을 때 문구", t: "text" }] },
  qna: { name: "Q&A 탭", sub: "제목 · 질문이 없을 때 문구와 버튼", fields: [
    { k: "title", l: "제목", t: "text" }, { k: "empty", l: "질문이 없을 때 문구", t: "text" }, { k: "emptyBtn", l: "그때 보이는 버튼 문구", t: "text" }] },
  refund: { name: "반품/교환 탭", sub: "제목", fields: [
    { k: "title", l: "제목", t: "text" },
    { note: "환불 규정 내용은 클래스마다 달라서 클래스 등록에서 입력해요." }] },
  buy: { name: "구매 박스 (오른쪽)", sub: "신청·문의 버튼 · 후기 인용 라벨", fields: [
    { k: "apply", l: "신청 버튼 (오프라인·정규 클래스)", t: "text" }, { k: "applyOnline", l: "신청 버튼 (온라인 강의)", t: "text" },
    { k: "ask", l: "문의 버튼", t: "text" }, { k: "quote", l: "후기 인용 라벨", t: "text" },
    { note: "가격·정원·잔여석·일정은 클래스 관리 값이 자동으로 들어와요. 모바일 하단 고정 바의 신청 버튼도 위 문구를 그대로 따라요." }] },
};

const SEC_ABOUT: Record<string, SectionSchema> = {
  pagehead: { name: "페이지 제목", sub: "제목 · 설명", fields: [{ k: "title", l: "페이지 제목", t: "text" }, { k: "desc", l: "설명", t: "textarea" }] },
  tabs: { name: "탭 이름 (5개)", sub: "아카데미 소개 · 강사 소개 · 갤러리 · 오시는 길 · 제휴 문의", fields: [
    { k: "list", l: "탭", t: "list", item: "탭", fixed: true, f: [{ k: "t", l: "탭 이름", t: "text" }] },
    { note: "푸터의 \"강사 소개 · 오시는 길\" 링크가 이 탭들로 바로 연결돼요." }] },
  intro: { name: "인사말", sub: "[아카데미 소개 탭] 환영 문구", fields: [
    { k: "kicker", l: "작은 영문 문구", t: "text" }, { k: "title", l: "큰 제목", t: "textarea", hint: "줄바꿈 가능" }, { k: "lead", l: "굵은 인사 한 줄", t: "text" },
    { k: "paras", l: "본문", t: "list", item: "문단", max: 6, f: [{ k: "p", l: "내용", t: "textarea", hint: PH }] }] },
  introPhoto: { name: "대표 사진", sub: "[아카데미 소개 탭] 큰 사진 · 캡션", fields: [
    { k: "img", l: "사진", t: "image", rec: [1280, 800, "16:10 가로"] }, { k: "caption", l: "사진 위 캡션", t: "text" }] },
  diff: { name: "무엇이 다른가요?", sub: "[아카데미 소개 탭] 3가지 강점", fields: [
    { k: "q", l: "질문 제목", t: "text" },
    { k: "list", l: "강점 3개", t: "list", item: "강점", fixed: true, f: [{ k: "img", l: "사진", t: "image", rec: [640, 800, "4:5 세로"] }, { k: "b", l: "굵은 제목", t: "text" }, { k: "d", l: "설명", t: "text" }] }] },
  price: { name: "합리적인 수강료", sub: "[아카데미 소개 탭] 질문 · 답변 · 사진", fields: [
    { k: "q", l: "질문", t: "text" }, { k: "title", l: "답변 제목", t: "textarea", hint: "줄바꿈 가능" }, { k: "text", l: "설명", t: "textarea", hint: PH },
    { k: "img", l: "사진", t: "image", rec: [800, 600, "4:3 가로"] }] },
  facility: { name: "시설 안내", sub: "[아카데미 소개 탭] 시설 6곳", fields: [
    { k: "title", l: "섹션 제목", t: "text" },
    { k: "list", l: "시설", t: "list", item: "시설", max: 12, f: [{ k: "img", l: "사진", t: "image", rec: [600, 600, "1:1 정사각"] }, { k: "b", l: "이름", t: "text" }, { k: "d", l: "설명", t: "text" }] }] },
  ifbs: { name: "국제미용과학협회", sub: "[아카데미 소개 탭] 협회 소개 · 사진", fields: [
    { k: "tag", l: "작은 제목", t: "text" }, { k: "title", l: "큰 제목", t: "textarea", hint: "줄바꿈 가능" },
    { k: "img", l: "사진", t: "image", rec: [800, 600, "4:3 가로"] },
    { k: "paras", l: "본문", t: "list", item: "문단", max: 6, f: [{ k: "p", l: "내용", t: "textarea", hint: PH }] }] },
  welcome: { name: "Welcome to IFBS", sub: "[아카데미 소개 탭] 글로벌 비전 · 사진", fields: [
    { k: "tag", l: "작은 제목", t: "text" }, { k: "title", l: "큰 제목", t: "text" },
    { k: "img", l: "사진", t: "image", rec: [800, 600, "4:3 가로"] },
    { k: "paras", l: "본문", t: "list", item: "문단", max: 6, f: [{ k: "p", l: "내용", t: "textarea", hint: PH }] }] },
  stats: { name: "숫자로 보는 아카데미", sub: "[아카데미 소개 탭] 수치 4개 · 지점 이름", fields: [
    { k: "title", l: "제목", t: "text" },
    { k: "list", l: "수치", t: "list", item: "수치", fixed: true, f: [{ k: "n", l: "숫자", t: "text" }, { k: "l", l: "이름", t: "text" }] },
    { k: "salon", l: "지점 소개 제목", t: "text" }, { k: "branches", l: "지점 이름들", t: "text", hint: "쉼표로 구분" }] },
  quote: { name: "맺음말", sub: "[아카데미 소개 탭] 배경 사진 위 인용 문구", fields: [
    { k: "paras", l: "문구", t: "list", item: "문단", max: 4, f: [{ k: "p", l: "내용", t: "textarea", hint: PH }] }] },
  history: { name: "연혁", sub: "[아카데미 소개 탭] 연도별 이력", fields: [
    { k: "title", l: "섹션 제목", t: "text" },
    { k: "list", l: "연혁", t: "list", item: "연혁", max: 20, f: [{ k: "y", l: "연도", t: "text" }, { k: "d", l: "내용", t: "text" }] }] },
  inst: { name: "강사 소개 탭", sub: "제목 · 강사 카드", fields: [
    { k: "title", l: "섹션 제목", t: "text" },
    { k: "list", l: "강사", t: "list", item: "강사", max: 12, f: [{ k: "name", l: "이름", t: "text" }, { k: "role", l: "직함·경력", t: "text" }, { k: "desc", l: "소개", t: "textarea" }] },
    { note: "강사 카드의 동그란 이니셜은 이름의 첫 글자로 자동으로 만들어져요." }] },
  gallery: { name: "갤러리 탭", sub: "사진 6장 · 캡션", fields: [
    { k: "title", l: "섹션 제목", t: "text" },
    { k: "list", l: "사진", t: "list", item: "사진", max: 12, f: [{ k: "img", l: "사진", t: "image", rec: [640, 800, "4:5 세로"] }, { k: "c", l: "사진 위 캡션", t: "text" }] }] },
  way: { name: "오시는 길 탭", sub: "장소 · 주소 · 전화 · 운영 시간", fields: [
    { k: "title", l: "장소 이름", t: "text" }, { k: "addr", l: "주소", t: "text", hint: PH }, { k: "tel", l: "전화", t: "text" }, { k: "hours", l: "운영 시간", t: "text" },
    { note: "지도는 실제 서비스에서 지도 API가 자동으로 표시돼요." }] },
  partner: { name: "제휴 문의 탭", sub: "제목 · 안내 · 문의 유형 · 버튼", fields: [
    { k: "title", l: "제목", t: "text" }, { k: "lead", l: "안내 문구", t: "textarea" },
    { k: "types", l: "문의 유형 선택지", t: "list", item: "유형", max: 8, f: [{ k: "t", l: "유형 이름", t: "text" }] }, { k: "btn", l: "버튼 문구", t: "text" }] },
};

const SEC_GUIDE: Record<string, SectionSchema> = {
  pagehead: { name: "페이지 제목", sub: "제목 · 설명", fields: [{ k: "title", l: "페이지 제목", t: "text" }, { k: "desc", l: "설명", t: "textarea" }] },
  tabs: { name: "탭 이름 (3개)", sub: "수강 절차 · 자주 묻는 질문 · 환불 규정", fields: [
    { k: "list", l: "탭", t: "list", item: "탭", fixed: true, f: [{ k: "t", l: "탭 이름", t: "text" }] },
    { note: "푸터의 \"수강 절차 · 자주 묻는 질문 · 환불 규정\" 링크가 이 탭들로 바로 연결돼요." }] },
  proc: { name: "수강 절차 탭", sub: "제목 · 단계(번호는 자동)", fields: [
    { k: "title", l: "제목", t: "text" },
    { k: "steps", l: "단계", t: "list", item: "단계", max: 12, f: [{ k: "t", l: "단계 이름", t: "text" }, { k: "d", l: "설명", t: "textarea" },
      { k: "notes", l: "부가 안내 (선택)", t: "textarea", hint: "한 줄에 하나 · 「라벨 | 내용」 형식" }] }] },
  faq: { name: "자주 묻는 질문 탭", sub: "묶음 4개 · 질문과 답", fields: [
    { k: "groups", l: "질문 묶음", t: "list", item: "묶음", max: 8, f: [{ k: "g", l: "묶음 제목", t: "text" },
      { k: "items", l: "질문", t: "list", item: "질문", max: 12, f: [{ k: "q", l: "질문", t: "text" }, { k: "a", l: "답변", t: "textarea" }] }] }] },
  refund: { name: "환불 규정 탭", sub: "제목 · 환불 표 · 안내 문구", fields: [
    { k: "title", l: "제목", t: "text" },
    { k: "th", l: "표 머리글", t: "list", item: "칸", fixed: true, f: [{ k: "t", l: "머리글", t: "text" }] },
    { k: "cats", l: "과정별 환불 기준", t: "list", item: "과정", max: 8, f: [{ k: "name", l: "과정 이름", t: "text" }, { k: "sub", l: "작은 설명 (선택)", t: "text" },
      { k: "rows", l: "기준 · 비율", t: "list", item: "기준", max: 8, f: [{ k: "c", l: "환불 기준", t: "text" }, { k: "r", l: "환불 비율", t: "text" }] }] },
    { k: "noteTitle", l: "안내 박스 제목", t: "text" }, { k: "note", l: "안내 박스 내용", t: "textarea", hint: "줄바꿈 가능" },
    { note: "클래스 상세의 \"반품/교환\" 탭에는 클래스별 환불 규정이 따로 들어가요(클래스 등록에서 입력)." }] },
};

const SEC_MY: Record<string, SectionSchema> = {
  pagehead: { name: "페이지 제목", sub: "제목 · 설명", fields: [{ k: "title", l: "페이지 제목", t: "text" }, { k: "desc", l: "설명", t: "textarea" }] },
  profile: { name: "내 프로필 카드", sub: "등급 뱃지 · 수정 버튼", fields: [
    { k: "badge", l: "회원 등급 뱃지", t: "text", hint: "예: 정회원" }, { k: "edit", l: "정보 수정 버튼 글자", t: "text" },
    { note: "이름·이메일·연락처는 로그인한 회원 정보가 자동으로 들어와요." }] },
  tabs: { name: "탭 이름 (4개)", sub: "신청 · 결제 · 온라인 수강 · 내 정보", fields: [
    { k: "list", l: "탭", t: "list", item: "탭", fixed: true, f: [{ k: "t", l: "탭 이름", t: "text" }] }] },
  apply: { name: "신청 내역 탭", sub: "제목", fields: [{ k: "title", l: "제목", t: "text" },
    { note: "신청한 클래스 카드(이름·일정·금액·상태)는 신청자 목록에서 자동으로 들어와요." }] },
  pay: { name: "결제 내역 탭", sub: "제목 · 표 머리글", fields: [{ k: "title", l: "제목", t: "text" },
    { k: "th", l: "표 머리글 (6칸)", t: "list", item: "칸", fixed: true, f: [{ k: "t", l: "머리글", t: "text" }] },
    { k: "receipt", l: "영수증 보기 링크 글자", t: "text" },
    { note: "결제 내용은 매출 관리에서 자동으로 들어와요." }] },
  online: { name: "온라인 수강권한 탭", sub: "제목 · 버튼 · 수강기한 문구", fields: [{ k: "title", l: "제목", t: "text" },
    { k: "btn1", l: "진행 중 강의 버튼", t: "text" }, { k: "btn2", l: "수강 완료 강의 버튼", t: "text" },
    { k: "exp1", l: "수강기한 앞 글자", t: "text" }, { k: "exp2", l: "수강기한 뒤 글자", t: "text", hint: "날짜 뒤에 붙는 말 (예: 까지)" }] },
  info: { name: "내 정보 탭", sub: "입력칸 이름 · 버튼 · 탈퇴 안내", fields: [{ k: "title", l: "제목", t: "text" },
    { k: "l1", l: "1번 입력칸 이름", t: "text" }, { k: "l2", l: "2번 입력칸 이름", t: "text" }, { k: "l3", l: "3번 입력칸 이름", t: "text" },
    { k: "l4", l: "비밀번호 입력칸 이름", t: "text" }, { k: "l5", l: "비밀번호 확인 입력칸 이름", t: "text" },
    { k: "save", l: "저장 버튼 글자", t: "text" }, { k: "out", l: "탈퇴 링크 글자", t: "text" },
    { k: "outMsg", l: "탈퇴 확인 팝업 문구", t: "textarea" }] },
};

const SEC_PAY: Record<string, SectionSchema> = {
  flow: { name: "진행 단계 표시줄 (4단계)", sub: "상단에 보이는 ①②③④ 이름", fields: [
    { k: "list", l: "단계 이름", t: "list", item: "단계", fixed: true, f: [{ k: "t", l: "이름", t: "text" }] },
    { note: "1단계(클래스 상세)는 클래스 상세 페이지 편집에서 고쳐요." }] },
  form: { name: "2단계 · 신청 정보 입력", sub: "입력칸 · 확인 사항 · 요약 박스", fields: [
    { k: "title", l: "신청자 정보 제목", t: "text" },
    { k: "labels", l: "입력칸 이름 (4개)", t: "list", item: "칸", fixed: true, f: [{ k: "t", l: "이름", t: "text" }] },
    { k: "checkTitle", l: "확인 사항 제목", t: "text" },
    { k: "checks", l: "동의 체크 문구 (모두 체크해야 다음으로)", t: "list", item: "문구", fixed: true, f: [{ k: "t", l: "문구", t: "text" }] },
    { k: "totalLabel", l: "금액 라벨", t: "text" }, { k: "btn", l: "다음 버튼 글자", t: "text" },
    { note: "클래스 이름·일정·금액은 선택한 클래스 정보가 자동으로 들어와요. 첫 번째 체크(선수 과정)는 선수 과정이 있는 클래스에서만 보여요." }] },
  method: { name: "3단계 · 결제 수단", sub: "수단 이름 · 버튼 · 결제 대기 문구", fields: [
    { k: "title", l: "제목", t: "text" },
    { k: "list", l: "결제 수단 (4개)", t: "list", item: "수단", fixed: true, f: [{ k: "t", l: "수단 이름", t: "text" }, { k: "s", l: "작은 설명", t: "text" }] },
    { k: "totalLabel", l: "금액 라벨", t: "text" }, { k: "btnSuffix", l: "결제 버튼 뒤 글자", t: "text", hint: "앞에 금액이 붙어요 (예: 500,000원 결제하기)" },
    { k: "wait", l: "결제 확인 중 제목", t: "text" }, { k: "waitSub", l: "결제 확인 중 설명", t: "text" }] },
  fail: { name: "결제 실패 화면", sub: "제목 · 안내 · 버튼", fields: [
    { k: "title", l: "제목", t: "text" }, { k: "desc", l: "설명", t: "text", hint: "실제 실패 사유(한도 초과 등)가 자동으로 들어가요" },
    { k: "box", l: "안내 박스", t: "textarea" }, { k: "btn1", l: "첫 번째 버튼", t: "text" }, { k: "btn2", l: "두 번째 버튼", t: "text" }, { k: "note", l: "하단 문의 안내", t: "text" }] },
  done: { name: "4단계 · 신청 완료", sub: "완료 제목 · 안내 목록 · 버튼", fields: [
    { k: "ok", l: "결제 완료 제목", t: "text" }, { k: "pending", l: "입금 대기 제목 (가상계좌)", t: "text" }, { k: "pendingBox", l: "입금 대기 박스 문구", t: "text" },
    { k: "guideTitle", l: "안내 박스 제목", t: "text" },
    { k: "offline", l: "오프라인 클래스 안내", t: "textarea", hint: "한 줄에 하나" },
    { k: "online", l: "온라인 강의 안내", t: "textarea", hint: "한 줄에 하나" },
    { k: "btnMy", l: "마이페이지 버튼", t: "text" }, { k: "btnWatch", l: "온라인 바로 수강 버튼", t: "text" }, { k: "btnList", l: "목록으로 버튼", t: "text" },
    { note: "주문번호·가상계좌·입금기한은 결제 시스템에서 자동으로 들어와요." }] },
};

export interface PageMeta {
  name: string;
  h1: string;
  sub: string;
  url: string;
  pv: string;
  sec: Record<string, SectionSchema>;
  first: string;
  /** 상단 메뉴·푸터 공통 안내 표시 */
  common?: boolean;
  /** 구성 고정 (순서 변경·숨기기 없음) */
  fixed?: boolean;
  /** 글 입력칸별 'Aa 글자 스타일' 지원 */
  tstyle?: boolean;
}

export const PAGES: Record<ContentPageKey, PageMeta> = {
  main: { name: "메인 페이지", h1: "페이지 관리 — 메인 페이지", sub: "메인 페이지에 보이는 모든 영역을 여기서 고치고, 왼쪽 화면에서 바로 확인해요.", url: "visualacademy — 메인", pv: "메인 페이지 화면", sec: SEC_MAIN, first: "hero" },
  list: { name: "클래스 목록", h1: "페이지 관리 — 클래스 목록", sub: "클래스 목록 페이지의 문구와 구성을 고쳐요. 카드 속 일정·정원·수강료는 클래스 관리에서 입력한 값이 자동으로 들어와요.", url: "visualacademy — 클래스", pv: "클래스 목록 화면", sec: SEC_LIST, first: "pagehead", common: true },
  detail: { name: "클래스 상세", h1: "페이지 관리 — 클래스 상세", sub: "모든 클래스 상세 페이지에 공통으로 쓰는 문구예요. 클래스마다 다른 내용(일정·가격·소개·이미지)은 클래스 등록에서 입력해요.", url: "visualacademy — 클래스 상세 (예시: 퍼스널 컬러)", pv: "클래스 상세 화면 (예시)", sec: SEC_DET, first: "tabs", common: true, fixed: true },
  about: { name: "아카데미 소개", h1: "페이지 관리 — 아카데미 소개", sub: "아카데미 소개 페이지의 모든 글과 사진을 고쳐요. 5개 탭(소개·강사·갤러리·오시는 길·제휴 문의)의 내용이 모두 들어 있어요. 글 입력칸 오른쪽 'Aa 글자 스타일'로 크기·자간·줄 간격·굵기·정렬도 바꿀 수 있어요.", url: "visualacademy — 아카데미 소개", pv: "아카데미 소개 화면", sec: SEC_ABOUT, first: "intro", common: true, fixed: true, tstyle: true },
  guide: { name: "수강 안내", h1: "페이지 관리 — 수강 안내", sub: "수강 절차, 자주 묻는 질문, 환불 규정 3개 탭의 내용을 고쳐요. 질문·단계·환불 기준은 자유롭게 추가하고 지울 수 있어요.", url: "visualacademy — 수강 안내", pv: "수강 안내 화면", sec: SEC_GUIDE, first: "proc", common: true, fixed: true },
  my: { name: "마이페이지", h1: "페이지 관리 — 마이페이지", sub: "회원이 로그인하면 보는 마이페이지의 문구를 고쳐요. 신청·결제·수강 내용 자체는 회원 데이터가 자동으로 들어와요.", url: "visualacademy — 마이페이지 (예시 회원)", pv: "마이페이지 화면 (예시)", sec: SEC_MY, first: "pagehead", common: true, fixed: true },
  pay: { name: "신청 · 결제", h1: "페이지 관리 — 신청 · 결제", sub: "클래스 신청부터 결제 완료까지 이어지는 화면들의 문구를 고쳐요. 클래스 정보·금액·주문번호는 자동으로 들어와요.", url: "visualacademy — 신청 · 결제 (예시)", pv: "신청 · 결제 화면 (예시)", sec: SEC_PAY, first: "form", fixed: true },
};
