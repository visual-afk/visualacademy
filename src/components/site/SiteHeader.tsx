"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ROUTES } from "@/data/site";
import { getMainContent } from "@/data/siteContent";

type NavKey = "classes" | "online" | "academy" | "guide";

/* 메뉴 이름·로고·상담 버튼 문구는 디자인 모드(메인 페이지 › 상단 메뉴)에서 편집 — 연결 주소는 순서대로 고정 */
const { nav: NAV_CONTENT } = getMainContent();
const NAV: { key: NavKey; label: string; href: string }[] = [
  { key: "classes", href: ROUTES.classes },
  { key: "online", href: ROUTES.classList("온라인") },
  { key: "academy", href: ROUTES.about() },
  { key: "guide", href: ROUTES.guide() },
].map((n, i) => ({ ...n, key: n.key as NavKey, label: NAV_CONTENT.links[i]?.label ?? "" }));

export function SearchIcon({ size = 17, stroke = 2 }: { size?: number; stroke?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

export default function SiteHeader({
  active,
  hero = false,
  heroSelector = "#heroSection",
  right,
}: {
  active?: NavKey;
  /** 메인 페이지: 다크 히어로 위에서 시작해 스크롤하면 밝아지는 헤더 */
  hero?: boolean;
  heroSelector?: string;
  /** 우측 유틸 영역을 바꿀 때 (마이페이지: 로그아웃) */
  right?: React.ReactNode;
}) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!hero) return;
    const heroEl = document.querySelector<HTMLElement>(heroSelector);
    const onScroll = () => {
      const threshold = (heroEl?.offsetHeight ?? 600) - 80;
      setScrolled(window.scrollY > threshold);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [hero, heroSelector]);

  const onSearchClick = (e: React.MouseEvent) => {
    const input = document.getElementById("heroSearch");
    if (input) {
      e.preventDefault();
      input.focus();
      input.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  return (
    <header className={`site-header${hero ? " is-hero" : ""}${scrolled ? " scrolled" : ""}`}>
      <div className="wrap nav">
        <Link href={ROUTES.home} className="logo">
          {NAV_CONTENT.logo}
        </Link>
        <nav className="navlinks">
          {NAV.map((n) => (
            <Link key={n.key} href={n.href} className={active === n.key ? "on" : undefined}>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="navutil">
          {right ?? (
            <>
              <Link href="/#search" className="icon-btn" aria-label="검색" onClick={onSearchClick}>
                <SearchIcon />
              </Link>
              <Link href={ROUTES.about("way")} className="btn btn-mint">
                {NAV_CONTENT.cta}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
