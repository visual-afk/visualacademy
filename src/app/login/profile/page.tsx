import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getProfile, getUser } from "@/lib/auth";
import { safeNext } from "@/lib/safeNext";
import ProfileForm from "./ProfileForm";

export const metadata: Metadata = { title: "정보 입력" };

export default async function ProfilePage({ searchParams }: PageProps<"/login/profile">) {
  const sp = await searchParams;
  const next = safeNext(typeof sp.next === "string" ? sp.next : null, "/mypage");
  const user = await getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  const profile = await getProfile(user.id);

  return (
    <div className="site pg-auth">
      <main className="auth-card">
        <h1>정보를 한 번만 입력해 주세요</h1>
        <p className="auth-sub">수강 안내 알림톡을 보내드리고, 기존 아카데미 수강 내역을 이 번호로 이어드려요.</p>
        <ProfileForm next={next} name={profile?.name ?? ""} />
      </main>
    </div>
  );
}
