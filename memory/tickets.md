# Tickets — Assembler (리셋 후 새 트랙: ASM-XXX)

> 2026-06 백지 리셋으로 옛 ASS-2XX 트랙 폐기. 이 파일이 새 단일 출처.
> 상태: `Backlog` → `In Progress` → `Done`. 세션 시작/마감 시 자동 갱신(/initiate·/checkout).

## In Progress

(없음 — 2차 웨이브 완료, 3차 착수 대기)

## Backlog

### ASM-015 · 경로 B — 코드 연결 온보딩 (T6·T7·T8 묶음)
- **출처:** 온보딩 진단 리포트 B 묶음
- **내용:** 랜딩 "이미 코드가 있어요" 진입(연결 기능 출시 전엔 가이드 안내만 — 거짓 버튼 금지), 싱크-인 성공 시 "메인" 워크스페이스 자동 생성 + file_generated activity, 연결 온보딩 UX.
- **전제:** MCP 코드 연결 기능 자체가 미구현 — 기능 결정 후 착수.

### ASM-011 · v1 배포 준비 (Vercel)
- **출처:** 2026-07-02 리전 점검 — assembler는 Vercel 미배포 상태 확인
- **내용:** Vercel 프로젝트 생성·git 연동, **함수 리전 icn1(서울) 명시**(Supabase ap-northeast-2와 정합 — 왕복 지연 원천 차단), env 셋업, 배포 게이트(tsc·lint·build·e2e). 시점은 사용자 결정.

### ASM-006 · 에디터 AI 챗 패널 실배선
- **출처:** 2026-07-02 코드리뷰 후속 — ChatPane 정적 목업 제거하고 준비 중 처리함
- **내용:** 좌측 AI 챗을 실제 대화 API로 배선(디자인 그래프 컨텍스트 + 제안 연동). 기획은 확정됨(editor-interactions.md #15·16·17·19 — 2026-07-02 협의 완료: 변경 계획 도크 수렴, suggestions API 재사용, 모델 칩 제거).
- **진행:** BE 완료(2026-07-02, 레인 2 — POST chat 엔드포인트·ChangePlan 계약·살균·rate limit, 머지 e3a6755). **잔여 = FE 배선만**(LeftRail 챗 UI + 변경 계획 도크 — payload diff 표시, 409 재시도 UX, dangling refs는 ApiError.details). 대화 영속은 스펙 §D-7 후속.

### ASM-007 · ASM-005 잔여 (auth 종속·정의 대기)
- **출처:** 2026-07-02 ASM-005 마감 시 분리
- **내용:**
  - 아바타 실제 사용자 이니셜 배선 — 에디터·대시보드 TopBar 둘 다 "J" 하드코딩, auth 배선 필요
  - EditorTopBar "＋새 작업 파일" — 버튼 아닌 드롭다운 div, editor-interactions.md #4 정의 확정 후 처리
  - 리셋으로 사라진 표면(preview·project·perf) e2e 재작성 — 기존 스펙 3개는 skip 처리됨(e2e/*.spec.ts 주석 참조)

## Done

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
