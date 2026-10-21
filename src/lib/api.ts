/*
 * 데이터 접근 레이어 — 지금은 목업(src/data)을 반환한다.
 * 백엔드가 준비되면 이 파일의 함수 본문만 fetch(`${API_URL}/...`)로 교체하면 화면 코드는 그대로 쓸 수 있다.
 * 각 함수 위 주석의 엔드포인트는 docs/backend-todo.md 와 맞춰둔 제안안이다.
 */
import { CLASS_ALIASES, classes } from "@/data/classes";
import { payments } from "@/data/payments";
import type { AcademyClass, ClassDetail } from "./types";

/** GET /api/classes */
export function getClasses(): AcademyClass[] {
  return classes;
}

/** GET /api/classes/:slug */
export function getClass(slugOrAlias: string | null | undefined): AcademyClass | undefined {
  if (!slugOrAlias) return undefined;
  const slug = CLASS_ALIASES[slugOrAlias] ?? slugOrAlias;
  return classes.find((c) => c.slug === slug);
}

/** GET /api/admin/classes/:id */
export function getClassById(id: number): AcademyClass | undefined {
  return classes.find((c) => c.id === id);
}

/** GET /api/admin/payments */
export function getPayments() {
  return payments;
}

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
