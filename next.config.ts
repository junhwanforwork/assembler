import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 개발 인디케이터(좌하단 오버레이 버튼)를 끈다 — 좌측 프롬프트 도크·벌크바 버튼과 겹쳐 클릭을 가로챈다(dev 전용).
  devIndicators: false,
};

export default nextConfig;
