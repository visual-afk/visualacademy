import Link from "next/link";
import { ROUTES } from "@/data/site";
import { getAdmin } from "@/lib/auth";

/** 관리자 상단바 — 신청자 목록·배치 상담·개설 알림은 아직 화면이 없어 비활성 표시 */
export default async function AdminTopbar({ active }: { active?: "dashboard" | "payments" }) {
  const admin = await getAdmin();
  const name = admin?.name ?? "관리자";
  return (
    <div className="topbar">
      <div className="wrap topbar-inner">
        <Link href={ROUTES.admin} className="logo"><span className="dot" />비주얼아카데미 관리자</Link>
        <nav className="topnav">
          <Link href={ROUTES.admin} className={active === "dashboard" ? "on" : undefined}>대시보드</Link>
          <Link href={ROUTES.adminPayments} className={active === "payments" ? "on" : undefined}>매출 관리</Link>
          <span className="soon" title="준비 중">신청자 목록</span>
          <span className="soon" title="준비 중">배치 상담</span>
          <span className="soon" title="준비 중">개설 알림</span>
        </nav>
        <Link className="dm-btn" href={ROUTES.adminDesign}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 19l7-7 3 3-7 7z" />
            <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18z" />
            <circle cx="11" cy="11" r="2" />
          </svg>
          디자인 모드
        </Link>
        <div className="who">
          <div className="avatar">{name.slice(0, 2)}</div>{name}님
          <Link className="site-link" href={ROUTES.home}>사이트 보기 ↗</Link>
          <form action="/auth/logout?next=/admin/login" method="post">
            <button type="submit" className="site-link logout-btn">로그아웃</button>
          </form>
        </div>
      </div>
    </div>
  );
}
