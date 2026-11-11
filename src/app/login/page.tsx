import type { Metadata } from "next";
import SiteFooter from "@/components/site/SiteFooter";
import LoginFlow from "./LoginFlow";

export const metadata: Metadata = { title: "로그인" };

/** 로그인 후 돌아갈 주소는 사이트 내부 경로만 허용 */
function safeNext(v: string | string[] | undefined): string | null {
  const s = Array.isArray(v) ? v[0] : v;
  return s && s.startsWith("/") && !s.startsWith("//") ? s : null;
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const next = safeNext((await searchParams).next);
  return (
    <div className="site pg-login">
      <LoginFlow next={next} />
      <SiteFooter />
    </div>
  );
}
