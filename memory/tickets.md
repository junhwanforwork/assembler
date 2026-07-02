# Tickets — Assembler (리셋 후 새 트랙: ASM-XXX)

> 2026-06 백지 리셋으로 옛 ASS-2XX 트랙 폐기. 이 파일이 새 단일 출처.
> 상태: `Backlog` → `In Progress` → `Done`. 세션 시작/마감 시 자동 갱신(/initiate·/checkout).

## In Progress

(없음 — 3차 웨이브 완료, 4차 대기)

## Backlog

### ASM-015 · 경로 B — 코드 연결 온보딩 (T6·T7·T8 묶음)
- **출처:** 온보딩 진단 리포트 B 묶음
- **내용:** 랜딩 "이미 코드가 있어요" 진입(연결 기능 출시 전엔 가이드 안내만 — 거짓 버튼 금지), 싱크-인 성공 시 "메인" 워크스페이스 자동 생성 + file_generated activity, 연결 온보딩 UX.
- **전제:** MCP 코드 연결 기능 자체가 미구현 — 기능 결정 후 착수.

### ASM-011 · v1 배포 준비 (Vercel)
- **출처:** 2026-07-02 리전 점검 — assembler는 Vercel 미배포 상태 확인
- **내용:** Vercel 프로젝트 생성·git 연동, **함수 리전 icn1(서울) 명시**(Supabase ap-northeast-2와 정합 — 왕복 지연 원천 차단), env 셋업, 배포 게이트(tsc·lint·build·e2e). 시점은 사용자 결정.

### ASM-021 · PATCH design 동시 편집 버전 토큰
- **출처:** 2026-07-02 레인 1 범위 밖 발견
- **내용:** 컬렉션 통째 PATCH라 동시 편집 완전 차단엔 `expectedUpdatedAt` 류 클라이언트 버전 토큰 필요. FE는 최신본 재적용으로 창 최소화해 둔 상태 — BE 계약 확장 + FE 배선.

### ASM-022 · files 생성 경로 parseDesign 경계 미통과
- **출처:** 2026-07-02 레인 2 QA 발견
- **내용:** `products/[id]/files` 생성 경로가 parseDesign 검증을 안 거쳐 중복 id 디자인이 저장될 수 있음(diff는 last-wins 내성 확인됨). 생성 경로에 동일 검증 경계 적용.

### 4차 웨이브 후보 (UX 전략 확정분 — 순서 미정)
- 스펙 N:M 교차 연결 그래프 뷰(트리뷰 재설계 — B-1) · **변경 전파 시각화**(도크에 영향 범위 표시 — 레퍼런스 3사 부재, 유일 차별 자산) · 수동 싱크-인 UI(ASM-015 최소 버전) · #44 플로우 노드 선택 · #46+와이어 실렌더 · suggestions 인스펙터 패널 · activity 타임라인(#7) · 편집성 인터랙션(#30·34·37·42 — 도크 이후) · 패턴 프리미티브 정리(SegmentedControl·Tooltip/Chip 소비·스피너 통합·죽은 챗 CSS 삭제·z-index 하드코딩 → --z-floating 토큰화 — ux-audit B 자명 묶음)

### ASM-007 · ASM-005 잔여 (auth 종속·정의 대기)
- **출처:** 2026-07-02 ASM-005 마감 시 분리
- **내용:**
  - 아바타 실제 사용자 이니셜 배선 — 에디터·대시보드 TopBar 둘 다 "J" 하드코딩, auth 배선 필요
  - EditorTopBar "＋새 작업 파일" — 버튼 아닌 드롭다운 div, editor-interactions.md #4 정의 확정 후 처리
  - 리셋으로 사라진 표면(preview·project·perf) e2e 재작성 — 기존 스펙 3개는 skip 처리됨(e2e/*.spec.ts 주석 참조)

## Done

### 3차 웨이브 (2026-07-02) — 머지 c96a8ec·7a16b1b·b17794b
- **ASM-017** · 레이아웃 재편 — 우패널 공용 인스펙터(InspectorSpecPanels)·트리뷰 숨김·"제품 구조" 레일·git 라벨 스윕·로고 복귀·스코프=스펙 전환·store 리셋
- **ASM-018** · 챗+변경 계획 도크 — 하단 도크·자동 오픈·PATCH 적용(409/dangling UX)·payload diff·suggestions 칩. DoD: 입력→적용 2 인터랙션, e2e 고정 (ASM-006 잔여 흡수 종결)
- **ASM-019** · 변경 델타 기록 — diffDesign(멀티셋·16KB 캡·O(n))·activity metadata 델타화. TDD 22테스트
- **ASM-020** · 대시보드 언어·정직화 — "스펙" 개명·빈 파일 카드 제거·카피 조건화(useCodeTruth)·ui/Modal(+z 토큰, TS 미러는 오케스트레이터 추가)


### ASM-016 · UX 진단·전략 수립 — 2026-07-02
- 진단 3렌즈(여정·위계/중복·일관성/전략 정합) + 레퍼런스 3종(claude.ai·NotebookLM·manyfast) 병렬 → 질의응답 3턴 전부 확정.
- 산출: `docs/specs/ux-audit.md`·`ux-references.md`·`ux-strategy.md`, editor-interactions ⚠협의 28행→1행(#57), v1-spec diff 분리 편입.
- ASM-006 잔여는 ASM-018로 흡수(챗 BE는 2차에서 완료).


### 2차 웨이브 (2026-07-02) — 레인 3개 + 모션, 머지 e3a6755·bc92534·87a67ae·eb046d1
- **ASM-008** · 에디터 셸 Layer 2 — TopBar/LeftRail/CenterView/RightPanel 재구성, ui 프리미티브 이관, 유저플로우 캔버스(flow-view-pattern·TDD 12건)
- **ASM-009** · 기능명세서 인터랙션 — #27 필터(role 동적)·#29 검색·#31 승격·#35·#39 점프(필터 해제 가드)·#41 트리뷰, 선택 상태 store 단일 공유
- **ASM-010** · 편집 파이프라인 — PATCH design(스코프드 부분 저장+머지), dangling 409, CAS 동시성(updated_at), 중복 id 거부
- **ASM-012~014** · 온보딩 경로 C — Composer 항상 활성, 만들기 모달(아이디어 보존), 1회 입력+1회 이름→에디터 DoD e2e 고정
- **모션 시스템(무티켓, 브랜딩 세션)** · 모션 토큰 + ui/motion 3종(BrandSpark·AssemblyLoader·EmptyStateArt) + prefers-reduced-motion — 통합 시 셸 개명·온보딩 재작성과 충돌 해소(eb046d1)
- **통합 발견 버그 수정** · 챗 rate limit 무력화(RPC 허용 목록에 chat 부재 → fail-open) — 마이그레이션 20260702000003 (170d87e)

### ASM-001 · AI 엔드포인트 rate limit — 2026-07-02
- **결정:** Supabase RPC 기반(신규 인프라 0) + 교체 가능 모듈(`src/lib/api/rate-limit.ts`만 갈면 Upstash 전환). 세션 2윈도 + IP 백스톱 3배 한도, RPC 장애 시 fail-open.
- **커밋:** 9278dac. ⚠ 마이그레이션 `20260702000002` DB 적용(supabase db push) 전까지 fail-open 동작.

### ASM-002 · 에디터 인터랙티브 요소 접근성 — 2026-07-02
- role="button"+tabIndex+Enter/Space(중첩 체크박스 때문에 button 전환 대신 role 패턴, 자식 버블 키 가드), ER 노드·체크박스 aria-label. 커밋: 21c56c0.

### ASM-003 · DashboardClient toast 타이머 정리 — 2026-07-02
- toastTimer ref clear + 언마운트 cleanup. 커밋: 21c56c0.

### ASM-004 · design jsonb·sync 배열 크기 상한 — 2026-07-02
- 컬렉션 캡(design 300·apis 300·tables 200·컬럼 100) + 바이트 캡(1MB/512KB) + Content-Length 413 게이트. 커밋: 740466c.

### ASM-005 · 리뷰 Low 묶음 — 2026-07-02
- key 안정화·Avatar 재사용·죽은 버튼 disabled(21c56c0) / 주석 정정·note 404 정합·마이그레이션 멱등화·anthropic 가드·note 동시성 가드·에러 카피 26종(740466c). 잔여는 ASM-007로 분리.
