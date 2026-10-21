import type { Metadata } from "next";
import SiteFooter from "@/components/site/SiteFooter";
import { pickTab } from "@/components/site/TabBar";
import { MY_TABS } from "@/data/mypage";
import MyPageView from "./MyPageView";

export const metadata: Metadata = { title: "마이페이지" };

export default async function MyPage({ searchParams }: PageProps<"/mypage">) {
  const tab = pickTab(MY_TABS, (await searchParams).tab);
  return (
    <div className="site pg-mypage">
      <MyPageView tab={tab} />
      <SiteFooter />
    </div>
  );
}
