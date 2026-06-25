---
ticket: ASS-NNN
title: <기능 한 줄>
e2e: e2e/ASS-NNN.spec.ts          # 이 시나리오를 실행하는 Playwright 스펙
perf: [flow-drag, inspector-commit, wireframe-load]   # 닿는 perf 인터랙션(없으면 [])
---

# ASS-NNN 수용 시나리오

> **용도:** `/goal` 기능 완료 조건의 **입력**(무엇이 "done"인가)이자 e2e 스펙의 명세.
> 평가자는 트랜스크립트만 본다 → 모든 기준은 e2e 실행 출력(`N passed 0 failed`)으로 입증돼야 한다.
> 출력(버그 발견 시)은 `assembler-qa` 리포트 포맷을 따른다(심각도·재현·범위).

## 수용 기준 (Given/When/Then — 체크 가능 단위)

- [ ] **AC1** — Given <초기 상태>, When <동작>, Then <관측 가능한 결과>
  - e2e: `ASS-NNN.spec.ts › <test 이름>`
- [ ] **AC2** — Given …, When …, Then …
  - e2e: `ASS-NNN.spec.ts › <test 이름>`

## 상태/엣지 (Guardian 관점 — 비면 미완성)

- [ ] 빈 상태 · 로딩 · 에러 · 권한(비로그인·타인 리소스) · 경쟁(이중 클릭) 중 해당하는 것
  - e2e 또는 수동 QA 노트로 입증

## Perf (해당 인터랙션이 있으면)

- [ ] `npm run perf` — 닿는 인터랙션이 RAIL 헤드리스 예산 PASS, 회귀 0
  - 닿는 인터랙션: <flow-drag / inspector-commit / wireframe-load / 없음>

## 완료 정의 (DoD) — `/goal` 조건이 참조

`e2e/ASS-NNN.spec.ts` 전부 통과(`N passed 0 failed`) AND (perf 닿으면) `npm run perf` PASS+회귀0
AND `tsc·lint·build` ✅ AND `tickets.md`에서 ASS-NNN이 `[x]`+날짜.
