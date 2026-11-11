/*
 * Solapi 계정에 연결된 카카오 채널(pfId)과 알림톡 템플릿 상태를 보여준다 (조회만, 아무것도 바꾸지 않음).
 * 실행: npm run solapi:check
 */
import crypto from "crypto";

function auth() {
  const date = new Date().toISOString();
  const salt = crypto.randomBytes(32).toString("hex");
  const sig = crypto.createHmac("sha256", process.env.SOLAPI_API_SECRET!).update(date + salt).digest("hex");
  return `HMAC-SHA256 apiKey=${process.env.SOLAPI_API_KEY}, date=${date}, salt=${salt}, signature=${sig}`;
}
async function get(path: string) {
  const res = await fetch(`https://api.solapi.com${path}`, { headers: { Authorization: auth() } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${path} ${res.status} ${JSON.stringify(body).slice(0, 200)}`);
  return body;
}

(async () => {
  if (!process.env.SOLAPI_API_KEY || !process.env.SOLAPI_API_SECRET) throw new Error(".env.local 에 SOLAPI_API_KEY / SOLAPI_API_SECRET 을 먼저 넣어주세요");
  const ch = await get("/kakao/v2/channels?limit=50");
  const channels = (ch.channelList ?? ch.list ?? []) as { channelId: string; searchId?: string; phoneNumber?: string }[];
  console.log("\n▶ 카카오 채널 (KAKAO_SENDER_KEY 후보)");
  for (const c of channels) console.log(`  ${c.channelId}  @${c.searchId ?? "?"}  ${c.phoneNumber ?? ""}`);
  console.log(`  지금 설정: ${process.env.KAKAO_SENDER_KEY || "(비어 있음)"} — 아카데미 채널 검색ID는 @_bipxhn`);

  const tp = await get("/kakao/v2/templates?limit=100");
  const templates = (tp.templateList ?? tp.list ?? []) as { templateId: string; name: string; status: string; channelId: string; content?: string }[];
  console.log("\n▶ 알림톡 템플릿");
  for (const t of templates) console.log(`  ${t.templateId}  [${t.status}]  ${t.name}  (채널 ${t.channelId})`);
  // 코드가 보내는 변수 (docs/alimtalk-templates.md) — 템플릿과 하나라도 다르면 발송이 실패한다
  const expected: Record<string, string[]> = {
    KAKAO_TMPL_PAID: ["이름", "클래스명", "주문번호", "일정", "장소"],
    KAKAO_TMPL_VBANK: ["이름", "클래스명", "금액", "은행", "계좌번호", "입금기한", "주문번호"],
    KAKAO_TMPL_D3: ["이름", "클래스명", "일정", "장소", "준비물"],
    KAKAO_TMPL_EXPIRE30: ["이름", "클래스명", "만료일"],
    KAKAO_TMPL_WAITLIST_OPEN: ["클래스명", "일정", "링크"],
  };
  console.log("\n▶ 템플릿 변수 대조 (이름이 환경변수와 같은 템플릿)");
  for (const [k, want] of Object.entries(expected)) {
    const t = templates.find((x) => x.name === k);
    if (!t) { console.log(`  ${k}: 템플릿 없음`); continue; }
    const have = [...new Set([...(t.content ?? "").matchAll(/#\{([^}]+)\}/g)].map((m) => m[1]))];
    const missing = want.filter((v) => !have.includes(v));
    const extra = have.filter((v) => !want.includes(v));
    console.log(`  ${k}: ${missing.length || extra.length ? `✗ 템플릿에 없음 [${missing.join(", ")}] / 코드가 안 보냄 [${extra.join(", ")}]` : "✓ 일치"}`);
  }
  const keys = Object.keys(expected);
  console.log("\n▶ 템플릿 환경변수");
  for (const k of keys) {
    const id = process.env[k];
    const t = templates.find((x) => x.templateId === id);
    console.log(`  ${k} = ${id || "(비어 있음)"} ${t ? `→ ${t.name} [${t.status}]` : id ? "→ 계정에서 못 찾음" : ""}`);
  }
})().catch((e) => {
  console.error("확인 실패:", e.message);
  process.exit(1);
});
