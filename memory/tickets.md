# Tickets — Assembler (리셋 후 새 트랙: ASM-XXX)

> 2026-06 백지 리셋으로 옛 ASS-2XX 트랙 폐기. 이 파일이 새 단일 출처.
> 상태: `Backlog` → `In Progress` → `Done`. 세션 시작/마감 시 자동 갱신(/initiate·/checkout).

> 웨이브 편성 기준 = `docs/specs/roadmap-milestones.md` 탈출 조건. 백로그 소진은 목표가 아니다.

## In Progress (5차 웨이브 = M1 루프 마감 — 2026-07-02 착수)

### ASM-029 · 변경 전파 시각화 — 도크 영향 범위 [레인 1]
- **내용:** 신규 `src/lib/assembler/impact.ts`(TDD) — design 그래프 역참조 워커(feature→req·page·api, page→wireframe, wireframe→element, element→api·dbTable, flow edges)로 전이 영향 집합 산출 → ChangePlanCard에 "영향 범위" 섹션(직접 변경 + 전이 영향 칩, 클릭=store 선택 점프). 유일 차별 자산(ux-strategy).

### ASM-028 · 싱크-인 라우트 rate limit 배선 [레인 2] (Backlog에서 승격)
- RateLimitRoute "sync" + apis·db-tables POST 배선 + RPC 허용 목록 마이그레이션 **작성까지만**(DB 적용·429 스모크=오케스트레이터).

### ASM-027 · 4차 웨이브 잔여 Low 묶음 [레인 2, 028 후속] (Backlog에서 승격)
- (아래 Backlog 원문 내용 — 단, editor-interactions.md 상태 열 갱신은 오케스트레이터 통합 몫으로 이관)

### ASM-030 · 내보내기 모달 — #64 구현 컨텍스트 MVP + #34 활성화 [레인 3]
- **내용:** 선택 기능 단위 패키징 유틸(TDD) — PRD 요약+기능명세·수용기준+플로우 경로+재사용/신규 구분 API·DB(code/mcp 출처)+와이어 참조 → ExportModal(미리보기+복사/다운로드, Confluence·Figma는 "곧" 비활성). 진입점: SpecBulkBar 내보내기 활성화(연결 Feature 프리셀렉트) + TopBar 내보내기 해제.

## Backlog

### ASM-015 · 경로 B — 코드 연결 온보딩 (T6·T7·T8 묶음)
- **출처:** 온보딩 진단 리포트 B 묶음
- **내용:** 랜딩 "이미 코드가 있어요" 진입(연결 기능 출시 전엔 가이드 안내만 — 거짓 버튼 금지), 싱크-인 성공 시 "메인" 워크스페이스 자동 생성 + file_generated activity, 연결 온보딩 UX.
- **전제:** MCP 코드 연결 기능 자체가 미구현 — 기능 결정 후 착수.

### M1-B~E 대기 (5차 웨이브 통합 후 순차 착수 — roadmap-milestones.md 2026-07-03 개정)

#### ASM-032 · 기능 총점검 [M1-B]
- assembler 스펙을 assembler에 시드(로컬, 점검·디자인·도그푸딩 3용 실데이터) → 여정×각도 점검 매트릭스(온보딩 B·C × 5각도 × 편집·챗·전파·내보내기·기록, 원본=editor-interactions.md) → 갭 리포트. CRITICAL/HIGH만 M1-C 편입. ux-audit 낡은 항목 닫기 포함.

#### ASM-033 · DocView 읽기 투사 [M1-C]
- "준비 중" 빈 상태 → PRD 투사 렌더(모델→문서 각도, 편집 없음).

#### ASM-034 · WireframeView 읽기 구조 렌더 [M1-C]
- "준비 중" 빈 상태 → UIElement 구조 렌더(#46 계약 소비, flow-view-pattern 재사용, 실렌더·편집 아님).

#### ASM-035 · 디자인 기계 부채 소탕 [M1-D]
- TYPOGRAPHY 토큰 CSS var 노출(globals.css←design-tokens.ts 1:1) → font-size 하드코딩 ~100건(editor.module.css 94건 등) 토큰 치환 → 세그먼트 컨트롤 1벌 프리미티브화(ux-audit B-3) → Tooltip/Chip 소비·스피너 통합·죽은 챗 CSS 삭제(M3 대기 "패턴 프리미티브 정리" 승격).

#### ASM-036 · 디자인 인지 진단→선별 실행 [M1-D, 035 후속]
- ui-ux-designer + assembler-design 병렬 진단(기준: ux-references 3사·확정 디자인 방향·정보 위계·시선·인지 부하) → 우선순위 리포트 → 사용자 승인 top-N만 실행. 탈출: 하드코딩 0·세그 1벌·HIGH 해소·사용자 시각 승인.

#### ASM-037 · 시드 스크립트 + 실 DB 여정 e2e [M1-E]
- scripts/seed-e2e(가상 제품+assembler 스펙 픽스처, RLS 정합) + 실 DB 여정 e2e 1벌(생성만 픽스처 — AI 호출 0 원칙, 저장·PATCH·전파·내보내기·싱크-인은 실 dev+DB 관통). 기존 모킹 e2e 유지. /health 스윕 마감.

### M2 대기 (M1 탈출 조건 충족 시 착수 — roadmap-milestones.md)

#### ASM-011 · v1 배포 (Vercel) — M2 핵심
- **출처:** 2026-07-02 리전 점검 — assembler는 Vercel 미배포 상태 확인. 2026-07-02 M2로 승격(도그푸딩 전제).
- **내용:** Vercel 프로젝트 생성·git 연동, **함수 리전 icn1(서울) 명시**(Supabase ap-northeast-2와 정합 — 왕복 지연 원천 차단), env 셋업, 배포 게이트(tsc·lint·build·e2e). 도그푸딩용 최소 — 공유·온보딩 고도화 제외.

#### ASM-031 · 도그푸딩 시나리오·지표 기록 — M2
- **출처:** 2026-07-02 로드맵 확정 — 북극성 지표가 한 번도 측정된 적 없음
- **내용:** 텔레메트리 인프라 없이 수동 측정. 시나리오 문서(기능 1개 추가 + 변경 3건 반영)를 배포 URL에서 수행, 변경 반영 소요 시간·변경 1건당 수정 지점 수 기록. asm_activity 델타가 보조 증거. 산출: `docs/specs/dogfooding-scenario.md` + 지표 기록 1세트.

### ASM-021 · PATCH design 동시 편집 버전 토큰
- **출처:** 2026-07-02 레인 1 범위 밖 발견
- **내용:** 컬렉션 통째 PATCH라 동시 편집 완전 차단엔 `expectedUpdatedAt` 류 클라이언트 버전 토큰 필요. FE는 최신본 재적용으로 창 최소화해 둔 상태 — BE 계약 확장 + FE 배선.

### M3 판정 대기 (자동 착수 금지 — 도그푸딩 신호가 지목할 때만 부활)
- 스펙 N:M 교차 연결 그래프 뷰(B-1) · #44 플로우 노드 선택 · 와이어 실렌더·편집(읽기 구조 렌더는 ASM-034로 승격됨) · ASM-015 잔여(연결 온보딩 UX 고도화)
- (2026-07-03 승격: 패턴 프리미티브 정리→ASM-035[M1-D], #46 읽기 렌더→ASM-034[M1-C])

### ASM-027 · 4차 웨이브 잔여 Low 묶음
- **출처:** 2026-07-02 4차 웨이브 레인 보고 + push 전 보안 리뷰 (범위 밖 발견)
- **내용:**
  - 서버 싱크 파서 endpoint 미트림(validate-sync.ts)
  - `--font-mono` 토큰 미등록(CodeConnectModal에서 필요해짐)
  - 생성 진행 중 싱크 경합 시 "메인" 스펙 2개 가능한 TOCTOU 엣지 — 서버 `(product_id, name)` 조건부 생성/유니크 제약 권장
  - ASM-025 후속: 인라인 추가 후 포커스 복원 · Select placeholder
  - editor-interactions.md 상태 열 갱신(#30·#32·#34·#37·#42 구현됨 반영)
  - CodeConnectModal 붙여넣기 경로 크기 사전 컷(파일 경로만 있음, 자해 프리즈 방지)
  - design-patch.ts `refs as DanglingRef[]` 요소 형태 런타임 가드(형태 이상 시 PatchErrorNote 크래시)
  - 부분 실패 재시도 시 apis_synced activity 중복 기록(재시도에서 성공분 POST 스킵)

### ASM-028 · 싱크-인 라우트 rate limit 배선 (보안 MEDIUM)
- **출처:** 2026-07-02 push 전 보안 리뷰 — ASM-026이 apis·db-tables POST를 1st-party UI 경로로 승격했는데 `checkRateLimit` 미배선
- **내용:** 임의 세션으로 호출당 300행 × 무제한 반복 → DB 어뷰즈 성립(IP 백스톱 없음). RateLimitRoute에 "sync" 스코프 추가(AI 비용 없으니 한도 널널) + **RPC 허용 목록 DB 마이그레이션 동반 필수** + 실 DB 스모크로 fail-open 확인(2026-07-02 챗 사고 함정). product당 총 행수 상한 검토.

### ASM-007 · ASM-005 잔여 (auth 종속·정의 대기)
- **출처:** 2026-07-02 ASM-005 마감 시 분리
- **내용:**
  - 아바타 실제 사용자 이니셜 배선 — 에디터·대시보드 TopBar 둘 다 "J" 하드코딩, auth 배선 필요
  - EditorTopBar "＋새 작업 파일" — 버튼 아닌 드롭다운 div, editor-interactions.md #4 정의 확정 후 처리
  - 리셋으로 사라진 표면(preview·project·perf) e2e 재작성 — 기존 스펙 3개는 skip 처리됨(e2e/*.spec.ts 주석 참조)

## Done

### 4차 웨이브 (2026-07-02) — 머지 405c8ed·8348cbe·90021a2
- **ASM-023** · suggestions 인스펙터 카드 — RightPanel 상주(분기 전환에 유료 분석 결과 보존), 타깃 점프(requirement/feature만, 나머지 비링크), dismiss 로컬, in-flight 가드. 유틸 TDD 7건
- **ASM-024** · activity 타임라인 — TopBar 기록(#7) → 슬라이드오버, 델타→해요체 카피(truncated=개수 요약), 미지 type 폴백. 유틸 TDD 13건
- **ASM-025** · 편집성 인터랙션 1차 — #30·#32·#34·#37·#42 + `patchDesignScoped` 공용 헬퍼(409 자동 재시도·dangling 상세) 단일 저장 경로, ChangePlanCard도 이관. e2e 신규
- **ASM-022** · files 생성 경로 검증 — 진단 결과 경계 이미 존재(parseGeneratedDesign→parseDesign), 중복 id 거부 회귀 테스트로 고정
- **ASM-026** · 수동 싱크-인 UI — CodeConnectModal(붙여넣기/업로드·행 피드백·부분 실패 안내), 싱크 성공+스펙 0개→"메인" 자동 생성. **T7 편차 승인:** activity는 file_generated 아닌 workspace_created 유지(생성된 파일이 없는데 생성 기록을 찍는 건 "BE는 사실만 기록" 위반 — 레인 판단 채택)
- 통합: InspectorSpecPanels·RightPanel 충돌 해소(레인 1 빈 상태 통합 구조 + 레인 2 SaveCtx 관통), 싱크-인 라우트 거짓 주석 2줄 정정, 실 DB 스모크(PATCH 200/409 dangling·싱크-인 200) 통과

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
