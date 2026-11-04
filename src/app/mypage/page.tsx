import type { Metadata } from "next";
import SiteFooter from "@/components/site/SiteFooter";
import { pickTab } from "@/components/site/TabBar";
import { MY_TABS } from "@/data/mypage";
import { getProfile, getUser } from "@/lib/auth";
import { formatPhone } from "@/lib/format";
import MyPageView, { type MyInfo } from "./MyPageView";

export const metadata: Metadata = { title: "마이페이지" };

export default async function MyPage({ searchParams }: PageProps<"/mypage">) {
  const tab = pickTab(MY_TABS, (await searchParams).tab);
  const user = await getUser();
  const profile = user ? await getProfile(user.id) : null;
  const me: MyInfo | undefined = profile
    ? {
        initial: (profile.name ?? "회").slice(0, 1),
        name: profile.name ?? "회원",
        grade: "정회원",
        email: profile.email ?? "",
        phone: profile.phone ? formatPhone(profile.phone) : "",
      }
    : undefined;
  return (
    <div className="site pg-mypage">
      <MyPageView tab={tab} me={me} />
      <SiteFooter />
    </div>
  );
}
