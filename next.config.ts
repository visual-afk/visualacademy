import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
   * 모집 상태(모집중·마감임박·종료)와 D-day는 '오늘' 기준으로 계산되므로
   * 해당 페이지는 connection()으로 요청 시점에 렌더링한다. (Cache Components 미사용)
   */
  // 같은 와이파이의 휴대폰에서 개발 서버(npm run dev)로 확인할 수 있도록 내부망 주소 허용
  allowedDevOrigins: ["192.168.*.*"],
};

export default nextConfig;
