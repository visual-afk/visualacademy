/*
 * 클래스 상세 본문(detailHtml) 정리 — 허용한 태그·속성만 남긴다.
 * 아임웹 이관 스크립트와 관리자 '상세 본문' 저장 API 가 같이 쓴다 (서버에서만 실행).
 * 스크립트·이벤트 속성·위험한 style 은 버리고, iframe 은 유튜브·비메오만 남긴다.
 */
const ALLOWED_TAGS = new Set([
  "p", "br", "div", "span", "section", "strong", "b", "em", "i", "u", "h1", "h2", "h3", "h4", "h5",
  "ul", "ol", "li", "img", "a", "hr", "table", "thead", "tbody", "tr", "td", "th", "iframe", "blockquote",
]);
const VOID_TAGS = new Set(["br", "img", "hr"]);

function cleanStyle(v: string): string | null {
  const s = v.replace(/\s+/g, " ").trim();
  if (/url\s*\(|expression|javascript:|behavior|position\s*:\s*(fixed|absolute)/i.test(s)) return null;
  return s || null;
}

function attrsOf(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of raw.matchAll(/([a-zA-Z-:]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
    out[m[1].toLowerCase()] = m[3] ?? m[4] ?? m[5] ?? "";
  }
  return out;
}

const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/&amp;(\w+|#\d+);/g, "&$1;");

/** 허용 태그·속성만 남긴 HTML. 이미지 주소는 rewrite 로 바꾼다(null 이면 그 이미지는 뺀다) */
export function sanitizeDetailHtml(html: string, rewrite: (src: string) => string | null): string {
  const body = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|noscript|form|button|input|select|textarea)\b[\s\S]*?<\/\1>/gi, "");
  return body.replace(/<(\/?)([a-zA-Z0-9]+)([^>]*)>/g, (_all, close: string, tagRaw: string, rest: string) => {
    const tag = tagRaw.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) return "";
    if (close) return VOID_TAGS.has(tag) ? "" : `</${tag}>`;
    const a = attrsOf(rest);
    const keep: [string, string][] = [];
    const style = a.style ? cleanStyle(a.style) : null;
    if (style) keep.push(["style", style]);
    if (tag === "img") {
      const src = a.src ? rewrite(a.src) : null;
      if (!src) return "";
      keep.push(["src", src], ["alt", a.alt ?? ""], ["loading", "lazy"]);
    } else if (tag === "a") {
      if (a.href && /^https?:\/\//i.test(a.href)) keep.push(["href", a.href], ["target", "_blank"], ["rel", "noopener noreferrer"]);
    } else if (tag === "iframe") {
      const src = a.src ?? "";
      if (!/^https:\/\/(www\.youtube\.com\/embed\/|player\.vimeo\.com\/video\/)/.test(src)) return "";
      keep.push(["src", src], ["allowfullscreen", ""], ["loading", "lazy"]);
      return `<iframe ${keep.map(([k, v]) => `${k}="${esc(v)}"`).join(" ")}>`;
    } else if (tag === "td" || tag === "th") {
      if (a.colspan) keep.push(["colspan", a.colspan]);
      if (a.rowspan) keep.push(["rowspan", a.rowspan]);
    }
    return `<${tag}${keep.map(([k, v]) => ` ${k}="${esc(v)}"`).join("")}>`;
  });
}
