import type { Metadata } from "next";
import "./globals.css";
import "@/styles/site.css";
import "@/styles/roadmap.css";
import "@/styles/admin.css";
import "@/styles/pages/home.css";
import "@/styles/pages/classes.css";
import "@/styles/pages/class-detail.css";
import "@/styles/pages/about.css";
import "@/styles/pages/guide.css";
import "@/styles/pages/mypage.css";
import "@/styles/pages/checkout.css";
import "@/styles/pages/admin-dashboard.css";
import "@/styles/pages/admin-class-form.css";
import "@/styles/pages/admin-payments.css";
import "@/styles/pages/admin-design.css";

export const metadata: Metadata = {
  title: {
    default: "비주얼아카데미",
    template: "%s — 비주얼아카데미",
  },
  description: "모발과학을 기반으로 한 헤어 전문가 교육 기관, 비주얼아카데미",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <head>
        {/* Pretendard (가변 · 동적 서브셋) */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
