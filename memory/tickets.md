# Tickets — Assembler (리셋 후 새 트랙: ASM-XXX)

> 2026-06 백지 리셋으로 옛 ASS-2XX 트랙 폐기. 이 파일이 새 단일 출처.
> 상태: `Backlog` → `In Progress` → `Done`. 세션 시작/마감 시 자동 갱신(/initiate·/checkout).

## Backlog

### ASM-001 · AI 엔드포인트 rate limit
- **출처:** 2026-07-02 코드리뷰 (asm-be-activity-suggestions) — MEDIUM
- **내용:** `/api/generate`·`/api/products/[id]/files`·`/api/workspaces/[id]/suggestions`·note POST가 세션 헤더만으로 유료 Anthropic 호출 가능. 길이 캡(MAX_IDEA_LENGTH)은 적용됐지만 반복 호출 미방어.
- **판단 필요:** 인프라 선택 — Next 미들웨어 자체 구현 vs Upstash 등 외부. 세션/제품 단위 한도 정책.

### ASM-002 · 에디터 인터랙티브 요소 접근성
- **출처:** 2026-07-02 코드리뷰 — MEDIUM (button.md 금지 패턴)
- **내용:** `SpecView.tsx`(요구사항/기능 행)·`DataView.tsx`(ER 노드)의 `<div onClick>`에 키보드·시맨틱 없음. `role="button"`+`tabIndex`+Enter/Space 처리 또는 `<button>` 전환.
- **묶음:** `docs/specs/editor-interactions.md`(68개 인터랙션) 구현 시 함께 처리.

### ASM-003 · DashboardClient toast 타이머 정리
- **출처:** 2026-07-02 코드리뷰 — MEDIUM
- **내용:** `DashboardClient.tsx:29-32` 연속 토스트 시 이전 타이머 미정리 → 조기 소멸 + 언마운트 후 setState. `useRef`로 clearTimeout + cleanup.

### ASM-004 · design jsonb·sync 배열 크기 상한
- **출처:** 2026-07-02 코드리뷰 — MEDIUM
- **내용:** `parseDesign`·`parseApiSync`·`parseDbTableSync`에 컬렉션 개수 상한 없음 → 거대 jsonb가 `listWorkspaces` 카운트 계산까지 부담. 검증 경계에서 max length → 400.

### ASM-005 · 리뷰 Low 묶음 (소규모 정리)
- **출처:** 2026-07-02 코드리뷰 — LOW
- **내용:**
  - `key={i}` 3곳(SpecView 수용기준·EditorInspector reltag·DataView ErColumn) → 안정 key
  - 아바타 이니셜 "J" 하드코딩 2곳 → 실제 사용자 + 공용 `Avatar` 재사용
  - EditorTopBar 동작 없는 버튼(기록/내보내기/공유하기, ＋새 작업 파일) → disabled 또는 준비 중 표시
  - apis/db-tables POST "코드/MCP 전용" 주석 vs 실제 세션 인증 불일치 → 별도 게이트 또는 주석 정정
  - note GET/PATCH가 URL의 workspace id 미검증(RLS로 안전, 일관성 문제)
  - 신규 마이그레이션 idempotent 가드(wf_projects 스타일) 통일
  - `anthropic.ts` 200 응답 `content` 배열 가드 / note POST check-then-act(DB 레벨 `is_user_edited` 가드)
  - 입력 검증 에러 코드(invalid_idea 등) 사용자 카피 추가(`messages.ts`)

### ASM-006 · 에디터 AI 챗 패널 실배선
- **출처:** 2026-07-02 코드리뷰 후속 — ChatPane 정적 목업 제거하고 준비 중 처리함
- **내용:** 좌측 AI 챗을 실제 대화 API로 배선(디자인 그래프 컨텍스트 + 제안 연동). 기획 확정 필요(editor-interactions.md ⚠협의 행 참조).
