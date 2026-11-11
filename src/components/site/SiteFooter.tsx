import Link from "next/link";
import { ROUTES } from "@/data/site";
import { getMainContent } from "@/data/siteContent";
import { RefundLink } from "./RefundPopup";

/* 링크 이름은 디자인 모드(메인 페이지 › 푸터)에서 바꾸고, 연결 주소는 순서대로 고정. "refund"는 환불 규정 팝업 */
const FOOTER_HREFS = [
  [ROUTES.about(), ROUTES.about("inst"), ROUTES.about("way")],
  [ROUTES.guide(), ROUTES.guide("faq"), "refund"],
  ["#", "#"], // 비주얼살롱·트리필드 — 실제 URL 확정 전
];

const split = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

export default function SiteFooter() {
  const { nav, footer, visible } = getMainContent();
  if (!visible.footer) return null;
  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="foot-top">
          <div>
            <div className="logo" style={{ marginBottom: 12 }}>{nav.logo}</div>
            <p style={{ fontSize: 13, color: "var(--ink-3)", maxWidth: 280, margin: 0 }}>{footer.desc}</p>
          </div>
          <div className="foot-links">
            {footer.cols.map((col, ci) => (
              <div key={col.h} className="foot-col">
                <h4>{col.h}</h4>
                {split(col.links).map((label, li) => {
                  const href = FOOTER_HREFS[ci]?.[li] ?? "#";
                  if (href === "refund") return <RefundLink key={label}>{label}</RefundLink>;
                  return href === "#" ? <a key={label} href="#">{label}</a> : <Link key={label} href={href}>{label}</Link>;
                })}
              </div>
            ))}
          </div>
        </div>
        <div className="foot-bottom">
          <ul className="foot-biz">
            {footer.biz.filter((b) => b.v.trim()).map((b) => (
              <li key={b.k}><b>{b.k}</b>{b.v}</li>
            ))}
          </ul>
          <p className="foot-copy">{footer.copy}</p>
        </div>
      </div>
    </footer>
  );
}
