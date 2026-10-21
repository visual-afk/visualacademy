import type { Metadata } from "next";
import DesignLoader from "./DesignLoader";

export const metadata: Metadata = { title: "디자인 모드 — 페이지 관리" };

export default function DesignPage() {
  return (
    <div className="admin-ui pg-design">
      <DesignLoader />
    </div>
  );
}
