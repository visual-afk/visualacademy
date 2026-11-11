import SiteFooter from "./SiteFooter";
import SiteHeader from "./SiteHeader";

/** 개인정보처리방침·이용약관 원문을 줄 단위로 그린다 ("제N조"로 시작하면 조 제목) */
export default function LegalDoc({ title, text }: { title: string; text: string }) {
  const blocks = text.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  return (
    <div className="site pg-legal">
      <SiteHeader />
      <main className="wrap legal">
        <h1>{title}</h1>
        {blocks.map((b, i) =>
          /^제\s?\d+\s?조/.test(b) || b === "부칙" ? (
            <h2 key={i}>{b}</h2>
          ) : (
            <p key={i}>{b}</p>
          ),
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
