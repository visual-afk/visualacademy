import { redirect } from "next/navigation";

/** 예전 정보 입력 주소 — 회원가입 페이지로 합쳤다 */
export default async function ProfilePage({ searchParams }: PageProps<"/login/profile">) {
  const next = (await searchParams).next;
  redirect(typeof next === "string" ? `/signup?next=${encodeURIComponent(next)}` : "/signup");
}
