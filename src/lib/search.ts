import { intentMap, searchIndex, stopWords, synonyms, type SearchItem } from "@/data/searchIndex";

export interface SearchResult {
  kind: "intent" | "compare" | "results" | "empty";
  tag: string;
  text: string;
  items: SearchItem[];
}

const synonymKeys = Object.keys(synonyms).sort((a, b) => b.length - a.length);

function normalize(q: string): string {
  q = q.toLowerCase().replace(/[?？!.,~]/g, " ").trim();
  for (const k of synonymKeys) {
    if (q.includes(k.toLowerCase())) q += " " + synonyms[k];
  }
  return q;
}

function tokenize(q: string): string[] {
  let toks = normalize(q).split(/\s+/).filter(Boolean);
  toks = toks.filter((t) => !stopWords.includes(t));
  toks = toks
    .map((t) => t.replace(/(은|는|이|가|을|를|도|에|의|로|으로|에서|인데|이요|요)$/, ""))
    .filter((t) => t.length >= 2 || /^\d$/.test(t) || searchIndex.some((i) => i.tags.includes(t)));
  return [...new Set(toks)];
}

function findByTitle(t: string) {
  return searchIndex.find((i) => i.title === t);
}

/** 비교형 질문: "레벨2 vs 레벨3", "레벨 2랑 3 차이" → 두 항목을 나란히 */
function detectCompare(q: string): SearchItem[] | null {
  const m = q.match(/레벨\s*([1-4])[^\d]{0,6}([1-4])/);
  if (m && /(차이|비교|vs|VS|랑|와|과|뭐가)/.test(q) && m[1] !== m[2]) {
    return [findByTitle("디자이너의 정석 레벨 " + m[1]), findByTitle("디자이너의 정석 레벨 " + m[2])].filter(
      (x): x is SearchItem => Boolean(x),
    );
  }
  return null;
}

function searchContent(q: string): SearchItem[] {
  const toks = tokenize(q);
  if (!toks.length) return [];
  return searchIndex
    .map((item) => {
      const title = item.title.toLowerCase().replace(/\s/g, "");
      const snip = item.snippet.toLowerCase().replace(/\s/g, "");
      const tags = item.tags.map((t) => t.toLowerCase());
      let score = 0;
      for (const tok of toks) {
        const t = tok.replace(/\s/g, "");
        if (title.includes(t)) score += 3;
        if (tags.some((g) => g === t)) score += 3;
        else if (tags.some((g) => g.includes(t) || (g.length >= 2 && t.includes(g)))) score += 2;
        if (snip.includes(t)) score += 1;
      }
      return { item, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((r) => r.item)
    .slice(0, 6);
}

export function runSearch(raw: string): SearchResult | null {
  const q = raw.trim();
  if (!q) return null;

  const intent = intentMap[q];
  if (intent) {
    return {
      kind: "intent",
      tag: intent.tag,
      text: intent.text,
      items: intent.titles.map(findByTitle).filter((x): x is SearchItem => Boolean(x)),
    };
  }
  const cmp = detectCompare(q);
  if (cmp && cmp.length === 2) {
    return { kind: "compare", tag: "레벨 비교", text: "두 레벨의 대상·일정·수강료를 나란히 비교해보세요.", items: cmp };
  }
  const results = searchContent(q);
  if (results.length) {
    return { kind: "results", tag: `검색 결과 ${results.length}건`, text: `"${q}"로 찾은 결과예요.`, items: results };
  }
  return {
    kind: "empty",
    tag: "검색 결과 없음",
    text: `"${q}"에 대한 결과를 찾지 못했어요. 비슷한 클래스명이나 궁금한 점을 다시 입력해보세요.`,
    items: [],
  };
}
