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
  const templates = (tp.templateList ?? tp.list ?? []) as { templateId: string; name: string; status: string; channelId: string }[];
  console.log("\n▶ 알림톡 템플릿");
  for (const t of templates) console.log(`  ${t.templateId}  [${t.status}]  ${t.name}  (채널 ${t.channelId})`);
  const keys = ["KAKAO_TMPL_PAID", "KAKAO_TMPL_VBANK", "KAKAO_TMPL_D3", "KAKAO_TMPL_EXPIRE30", "KAKAO_TMPL_WAITLIST_OPEN"];
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
