import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";
import { getProfile, getUser } from "@/lib/auth";
import { getMyCourse } from "@/lib/vod";
import CoursePlayer from "./CoursePlayer";

export const metadata: Metadata = { title: "온라인 강의" };

export default async function CoursePage({ params }: PageProps<"/mypage/courses/[id]">) {
  const classId = Number((await params).id);
  const user = await getUser();
  const profile = user ? await getProfile(user.id) : null;
  if (!profile) redirect(`/login?next=/mypage/courses/${classId}`);

  const access = await getMyCourse(profile.id, classId);
  return (
    <div className="site pg-course">
      <SiteHeader />
      {access.ok ? (
        <CoursePlayer course={access.course} />
      ) : (
        <div className="wrap narrow course-blocked">
          <h1>{access.reason === "expired" ? "수강 기간이 끝났어요" : "수강 권한이 없어요"}</h1>
          <p>{access.reason === "expired" ? "다시 수강하려면 클래스를 새로 신청해주세요." : "결제를 마친 온라인 강의만 볼 수 있어요."}</p>
          <Link className="btn btn-mint" href="/mypage?tab=online">마이페이지로</Link>
        </div>
      )}
      <SiteFooter />
    </div>
  );
}
