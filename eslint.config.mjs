import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // 중첩 빌드 산출물(워크트리 .next) + .claude 도구 트리(worktrees·agents·rules)는 린트 대상 아님.
    // 누락 시 .claude/worktrees/*/.next/ 가 스캔돼 lint 게이트가 수백 에러로 오염됨(autopilot 게이트 무력화).
    "**/.next/**",
    ".claude/**",
  ]),
]);

export default eslintConfig;

