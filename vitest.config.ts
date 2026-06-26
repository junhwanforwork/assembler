import { defineConfig } from "vitest/config"

// BE 단위 테스트 — 도메인 로직(무결성·검증·직렬화). 환경은 node(브라우저 불필요).
// tsconfig의 @/* 경로는 vitest가 네이티브로 해석한다(resolve.tsconfigPaths).
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["src/**/*.{test,spec}.ts"],
  },
})
