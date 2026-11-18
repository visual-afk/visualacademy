import type { AcademyClass } from "@/lib/types";

const CAT_SHORT: Record<string, string> = { 특강: "특강", 세미나: "세미나", 경영: "경영", 온라인: "ON" };

/** 그라데이션 타일 색 — 정석은 레벨별(l1~l4), 그 외는 분류별(c-특강 …). CSS 의 .tg.* 와 짝 */
export function tileClass(c: Pick<AcademyClass, "cat" | "level">): string {
  return c.cat === "정석" ? `l${c.level ?? 1}` : `c-${c.cat}`;
}

/**
 * 정사각형(1:1) 썸네일 — 관리자에서 올린 썸네일이 있으면 그 이미지를,
 * 없으면 분류·레벨 색의 그라데이션 타일(CSS)을 보여준다.
 */
export default function ClassThumb({ c }: { c: Pick<AcademyClass, "cat" | "level" | "name" | "images"> }) {
  const src = c.images?.thumb;
  if (src) {
    return (
      <div className="thumb">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={c.name} />
      </div>
    );
  }
  return (
    <div className={`thumb tg ${tileClass(c)}`} aria-hidden="true">
      {c.cat === "정석" ? (
        <span>
          L{c.level ?? 1}
          <small>LEVEL</small>
        </span>
      ) : (
        <span>{CAT_SHORT[c.cat] ?? c.cat}</span>
      )}
    </div>
  );
}
