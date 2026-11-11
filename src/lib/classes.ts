/*
 * 클래스 화면 공용 계산 — 서버·브라우저 어디서나 쓰는 순수 함수만 둔다.
 * (데이터 조회는 src/lib/api.ts, 서버 전용)
 */
import type { AcademyClass, ClassDetail, Instructor } from "./types";

const REFUND_POLICY: Record<string, string[]> = {
  online: ["첫 강의 시청 전: 전액 환불", "첫 강의 시청 후: 환불 제한 (관련 법령에 따름)"],
  offline: ["개강 7일 전까지 전액 환불", "개강 3일 전까지 50% 환불", "개강 3일 전 이후 환불 불가 (관련 법령에 따름)"],
};

export function refundPolicy(c: AcademyClass): string[] {
  return c.type === "online" ? REFUND_POLICY.online : REFUND_POLICY.offline;
}

/** 상세 콘텐츠가 아직 등록되지 않은 클래스는 기본 정보로 채운 상세를 보여준다 */
export function getClassDetail(c: AcademyClass): ClassDetail {
  if (c.detail) return c.detail;
  const isOnline = c.type === "online";
  return {
    checklist: [c.summary, c.noob ? "비전공자도 처음부터 배울 수 있어요" : "실무 경험이 있는 디자이너에게 추천해요"],
    curriculumTitle: isOnline ? "강의 구성" : "커리큘럼",
    lessons: [{ t: "상세 커리큘럼 준비 중", d: "관리자 > 콘텐츠 관리에서 등록하면 이곳에 노출돼요" }],
    instructorId: c.cat === "경영" || c.cat === "온라인" ? "lee-yukyung" : "kim-jieun",
    reviews: [],
    prep: isOnline
      ? "별도 준비물은 없어요. 결제 후 즉시 온라인으로 수강할 수 있습니다."
      : "준비물은 개강 안내 문자로 자세히 안내드려요.",
    faqs: [],
    buyboxQuote: "\"실무에 바로 적용할 수 있었어요.\"",
    needPrereq: c.cat === "정석" && (c.level ?? 1) > 1,
    doneNotes: isOnline
      ? ["지금 바로 강의를 수강할 수 있어요", "수강 기간 만료 30일 전 알림톡으로 미리 안내드려요"]
      : ["개강 3일 전 알림톡으로 준비물과 오시는 길을 다시 안내드려요", "오시는 길: 서울 강남구 언주로 622 (논현동, 구암빌딩) 1층"],
  };
}

/** 목록에 없는 강사 id 면 수석 강사(목록 3번째)로 대신한다 — 목업 getInstructor 와 같은 규칙 */
export function pickInstructor(list: Instructor[], id: string): Instructor | undefined {
  return list.find((i) => i.id === id) ?? list[2] ?? list[0];
}
