"use client";

import dynamic from "next/dynamic";

/* 게시본·버전 기록을 브라우저 저장소에서 읽기 때문에 클라이언트에서만 렌더한다 */
const DesignMode = dynamic(() => import("./DesignMode"), {
  ssr: false,
  loading: () => <p style={{ padding: 40, textAlign: "center", color: "#8b9089" }}>디자인 모드를 불러오는 중…</p>,
});

export default function DesignLoader() {
  return <DesignMode />;
}
