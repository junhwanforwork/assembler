# Lane 1 Work Log

레인 1 작업 세션의 누적 기록. /checkout 시 이 파일에 세션 항목을 아래로 쌓는다.
(티켓 상태의 단일 출처는 `memory/tickets.md` — 여기는 레인 컨텍스트·실수노트 전용.)

---

## 2026-07-03 — ASM-029 변경 전파 시각화

**날짜:** 2026-07-03 (세션 S-006)
**웨이브:** 5차 (M1 루프완결)
**브랜치/워크트리:** `asm-029-impact` · `.claude/worktrees/asm-029-impact`
**커밋:** f3dd27b(구현) → 825637a(크로스체크 MEDIUM 반영)
**상태:** 레인 완료 — 크로스체크 ✅ PASS(blocker 0), 머지 대기(오케스트레이터)

### 한 일

- `src/lib/assembler/impact.ts` 신규(TDD — 실패 테스트 먼저 확인 후 구현): 역참조 인덱스
  `buildImpactIndex` + BFS 전이 워커 `collectImpact`. diff.ts 130–158의 연결 지도 5종을 역전
  (requirement←feature · page←feature · page←flow(edges) · wireframe←page · element←wireframe).
  api/db는 WorkspaceDesign 밖(code-truth)이라 노드 제외. visited 가드(순환·중복), 시드 제외,
  전파 거리순 결정적 출력. 테스트 10건.
- `src/components/editor/dock/planImpact.ts` 신규: op별 칩 행 표시 모델. 이름 해석(와이어프레임은
  소유 페이지 이름 차용), `resolveSuggestionJump` 재사용(요구사항·기능만 점프), 영향 0건 op는 행 미생성.
  테스트 4건.
- `src/components/editor/dock/ImpactSection.tsx` 신규: "영향 범위" 섹션. 행 0개면 미렌더(빈 껍데기 금지),
  req/feature 칩 클릭 → #39 필터 가드 → selectSpecReq/selectSpecFeature → setActiveView("spec").
  나머지 타입은 정적 칩. 긴 이름 말줄임 + title 툴팁. 카피 해요체.
- `ChangePlanCard.tsx` op 목록 아래 배선(+3줄) · `editor.module.css` 칩 스타일(토큰만, hex 0건).
- 검증: tsc 0 · lint 0 · vitest 284/284 · build ✓ · e2e(editor-dock/editing) 7/7.
- 크로스체크: code-reviewer 발견 0건 APPROVE · assembler-qa CRITICAL/HIGH 0.
  MEDIUM(칩 오버플로우)은 즉시 수정 반영(825637a).

### 오케스트레이터 이월 (수정 안 함 — 범위 밖/LOW)

- MEDIUM: ImpactSection 렌더·점프의 컴포넌트/e2e 테스트 공백 — vitest가 node 환경 + `.ts`만 수집이라
  testing-library 없인 불가(라이브러리 임의 추가 금지), e2e 파일은 레인 소유 범위 밖.
  `e2e/editor-dock.spec.ts`에 update op 시나리오 추가하면 닫힘(현재 픽스처는 add op라 섹션이 영원히 안 보임).
- LOW 4건: applying 중 칩 클릭 미차단 · orphan 와이어프레임 raw id 노출 ·
  동일 대상 복수 op 시 영향 행 중복 · #39 가드 로직 SuggestionsCard와 복붙 중복(공용 훅 추출은 범위 밖).

### 실수노트

- **착수 패킷의 파일 경로를 그대로 믿고 Read해서 1회 헛발** — 패킷은 `specFilter.ts 36–45행`만 줬는데
  실제 위치는 `src/components/editor/views/specFilter.ts`. 패킷 경로도 tickets.md 티켓번호처럼
  find/grep으로 검증 후 읽기.
- **워크트리에 `.env.local`이 없어 e2e webServer가 180s 타임아웃** — gitignore된 env는 워크트리 생성 시
  안 따라온다. e2e 돌리기 전에 메인 리포에서 복사(비추적, 커밋 무해)가 선행 단계. 웨이브 프렙에
  env 복사를 넣으면 레인마다 안 겪음.
- **크로스체크 대기용 ScheduleWakeup이 취합 완료 후 뒤늦게 발화** — 에이전트 완료 알림이 자동으로 오므로
  안전망 웨이크업은 더 길게(1200s+) 잡거나 생략해도 됐다.
- (아쉬움) 새 UI(칩 오버플로우)를 처음부터 말줄임 처리 안 해 크로스체크 MEDIUM으로 되돌아옴 —
  칩/배지류 신규 스타일엔 max-width+ellipsis를 기본값으로.
