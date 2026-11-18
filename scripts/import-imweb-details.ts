/*
 * 아임웹 상품 상세페이지 본문을 클래스 상세(class_contents.detail.detailHtml)로 옮긴다. 여러 번 돌려도 안전(덮어씀).
 * - 본문은 아임웹 상품 페이지의 <template id="prodDetailPC"> 에서 가져온다 (엑셀은 긴 본문이 잘려 있어서)
 *   숨김 상품은 페이지가 열리지 않으니, 상품 전체 엑셀의 '상품상세정보'를 {상품번호: html} JSON 으로 뽑아 넘기면 그걸 쓴다
 * - 이미지는 우리 Storage(class-images/imweb/detail/)로 복사해 주소를 바꾼다 (아임웹을 닫아도 남게)
 * - 허용한 태그·속성만 남긴다: 스크립트·이벤트 속성·외부 iframe(유튜브·비메오 제외)은 버린다
 * - 아임웹 쇼핑몰 공통 꼬리말(고객센터·배송안내)은 교육 상세와 맞지 않아 뺀다
 * 실행: npx tsx --env-file=.env.local scripts/import-imweb-details.ts [엑셀상세.json]
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { IMAGE_BUCKET } from "@/lib/uploads";

const SITE = "https://www.visualacademy.co.kr";

/* 우리 클래스 slug → 아임웹 상품번호. imweb-숫자 slug 는 자동으로 맞춘다 */
const SLUG_TO_IDX: Record<string, number> = {
  "owner-auto": 208, "2000-plan": 203, "trifield-seminar": 193, "hair-science-analyst": 51, "softening-perm": 3,
  "level-1": 155, "level-2": 161, "level-3": 214, "level-4": 163,
};

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

/** 허용 태그·속성만 남긴 HTML. 이미지 주소는 rewrite 로 바꾼다 */
function sanitize(html: string, rewrite: (src: string) => string | null): string {
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

/** 본문 끝의 쇼핑몰 공통 안내(고객센터 · 배송안내 ...)와 그 앞뒤 빈 줄을 뺀다 */
function stripShopFooter(html: string): string {
  const at = html.indexOf("<strong>고객센터</strong>");
  let out = html;
  if (at >= 0 && html.indexOf("배송안내", at) > 0) out = html.slice(0, html.lastIndexOf("<p", at));
  return out.replace(/(\s*<p>\s*<br>\s*<\/p>)+\s*$/, "");
}

async function fetchDetail(idx: number): Promise<string | null> {
  const res = await fetch(`${SITE}/shop_view/?idx=${idx}`);
  if (!res.ok) throw new Error(`아임웹 상품 ${idx}: ${res.status}`);
  const html = await res.text();
  const m = html.match(/<template id="prodDetailPC">([\s\S]*?)<\/template>/);
  return m && m[1].trim() ? m[1] : null;
}

async function main() {
  const db = getAdminSupabase();
  const fromExcel: Record<string, string> = process.argv[2] ? JSON.parse(readFileSync(process.argv[2], "utf8")) : {};
  const { data: classes, error } = await db.from("classes").select("id, slug, name");
  if (error) throw error;

  const copied = new Map<string, string>();
  const upload = async (path: string, body: Buffer, contentType: string) => {
    const { error: upErr } = await db.storage.from(IMAGE_BUCKET).upload(path, body, { contentType, upsert: true });
    if (upErr) throw new Error(`이미지 올리기 실패 ${path}: ${upErr.message}`);
    return db.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
  };
  const copyImage = async (src: string): Promise<string | null> => {
    // 본문에 직접 박힌 사진(data:image/...;base64) — 파일로 꺼내 올린다
    const inline = src.match(/^data:image\/(jpeg|jpg|png|gif|webp);base64,([A-Za-z0-9+/=\s]+)$/i);
    if (inline) {
      const body = Buffer.from(inline[2], "base64");
      const ext = inline[1].toLowerCase() === "jpeg" ? "jpg" : inline[1].toLowerCase();
      const name = `${createHash("sha1").update(body).digest("hex").slice(0, 16)}.${ext}`;
      if (copied.has(name)) return copied.get(name)!;
      const url = await upload(`imweb/detail/${name}`, body, `image/${ext === "jpg" ? "jpeg" : ext}`);
      copied.set(name, url);
      return url;
    }
    const m = src.match(/^https?:\/\/cdn(?:-optimized)?\.imweb\.me\/upload\/[^/]+\/([0-9a-zA-Z_.-]+\.(?:jpe?g|png|gif|webp))/i);
    if (!m) return /^https:\/\//.test(src) ? src : null;
    const file = m[1];
    if (copied.has(file)) return copied.get(file)!;
    const res = await fetch(src.split("?")[0]);
    if (!res.ok) return null;
    const url = await upload(`imweb/detail/${file}`, Buffer.from(await res.arrayBuffer()), res.headers.get("content-type") ?? "image/jpeg");
    copied.set(file, url);
    return url;
  };

  let done = 0;
  for (const c of classes ?? []) {
    const idx = SLUG_TO_IDX[c.slug] ?? Number(c.slug.match(/^imweb-(\d+)$/)?.[1] ?? NaN);
    if (!Number.isFinite(idx)) continue;
    const raw = (await fetchDetail(idx)) ?? fromExcel[String(idx)] ?? null;
    if (!raw) {
      console.log(`- #${c.id} ${c.name}: 아임웹 상세 본문 없음`);
      continue;
    }
    // 이미지 복사는 순서대로 (같은 파일 중복 업로드 방지)
    const srcs = [...raw.matchAll(/<img[^>]+src="([^"]+)"/gi)].map((m) => m[1]);
    const map = new Map<string, string | null>();
    for (const s of srcs) if (!map.has(s)) map.set(s, await copyImage(s));
    const detailHtml = stripShopFooter(sanitize(raw, (s) => map.get(s) ?? null));

    const { data: cc } = await db.from("class_contents").select("detail").eq("class_id", c.id).maybeSingle();
    const detail = { ...((cc?.detail as Record<string, unknown> | null) ?? {}), detailHtml };
    const { error: upErr } = await db
      .from("class_contents")
      .upsert({ class_id: c.id, detail, updated_at: new Date().toISOString() }, { onConflict: "class_id" });
    if (upErr) throw new Error(`${c.name}: ${upErr.message}`);
    done++;
    console.log(`✓ #${c.id} ${c.name} ← 아임웹 ${idx} (이미지 ${map.size}장)`);
  }
  console.log(`상세 본문 ${done}개 옮김`);
}

main().catch((e) => {
  console.error("가져오기 실패:", e.message ?? e);
  process.exit(1);
});
