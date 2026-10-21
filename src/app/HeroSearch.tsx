"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { SearchIcon } from "@/components/site/SiteHeader";
import { heroSuggestions } from "@/data/searchIndex";
import { COMPANY, ROUTES } from "@/data/site";
import { runSearch, type SearchResult } from "@/lib/search";

/** 히어로 내부 검색 — 입력 중 220ms 디바운스로 결과 갱신, Enter/버튼/추천 질문은 즉시 검색 */
export default function HeroSearch({
  placeholder = "예) 3년차인데 뭐부터 들어야 할까요?",
  suggestions = heroSuggestions,
}: {
  placeholder?: string;
  suggestions?: string[];
}) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (debounce.current) clearTimeout(debounce.current);
  }, []);

  const search = (q: string, scroll = true) => {
    const r = runSearch(q);
    if (!r) return;
    setResult(r);
    if (scroll) requestAnimationFrame(() => boxRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
  };

  const onInput = (v: string) => {
    setQuery(v);
    if (debounce.current) clearTimeout(debounce.current);
    if (!v.trim()) {
      setResult(null);
      return;
    }
    debounce.current = setTimeout(() => search(v, false), 220);
  };

  const pick = (q: string) => {
    setQuery(q);
    search(q);
  };

  return (
    <>
      <div className="searchbox" id="search">
        <input
          id="heroSearch"
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => onInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) search(query);
          }}
        />
        <button type="button" className="btn btn-mint" aria-label="검색" onClick={() => search(query)}>
          <SearchIcon size={20} stroke={2.2} />
        </button>
      </div>
      <div className="hero-suggest">
        {suggestions.map((s, i) => (
          <span key={s} style={{ display: "contents" }}>
            {i > 0 && <span className="sep">·</span>}
            <button type="button" onClick={() => pick(s)}>
              {s}
            </button>
          </span>
        ))}
      </div>
      {result && (
        <div className="results" ref={boxRef} key={result.text}>
          <div className="results-card">
            <p className="rt">{result.tag}</p>
            <p className="rd">{result.text}</p>
            <div className="results-list">
              {result.kind === "empty" ? (
                <p className="results-empty">
                  원하는 답을 못 찾으셨나요? 카카오톡 채널 <b>{COMPANY.kakao}</b> 또는 <b>{COMPANY.phone}</b>로 문의해주세요.{" "}
                  <Link href={ROUTES.about("way")}>상담 신청하기</Link>
                </p>
              ) : (
                result.items.map((item) => (
                  <Link key={item.title} className="rlink" href={item.href}>
                    <span className="rtype">{item.type}</span>
                    <p className="rtitle">{item.title}</p>
                    <p className="rsnippet">{item.snippet}</p>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
