# Lane 1 Work Log

> 레인 1 작업 세션의 기억 전용. **/checkout 때 그 세션의 컨텍스트를 여기 쌓는다(최신이 위).**
> 오케스트레이터의 tickets.md 동기화와 별개 — 티켓 상태가 아니라 "그때 무슨 일이 있었고 뭘 배웠나"를 남긴다.
> 항목 형식은 아래 템플릿 고정. 실수노트는 빈칸 금지 — 없었으면 "없음"이라고 쓴다(회고 생략 방지).

---

## 2026-07-06 · 8차 웨이브 · ASM-036
**한 일**: 인지 진단 27건(1단계) → 승인 19건 실행(토큰 4신설·기계 치환 f-w 47/duration 22·읽기 본문 body 승격·TopBar filled 역전 해소·접근성). 크로스체크 APPROVE+QA PASS.
**실수노트**(REPORT에서 오케스트레이터 수집):
- DataView 툴팁 수정 때 map 반환식 괄호 안 JSX 주석으로 tsc 구문 오류 1회 — JSX 표현식 자리엔 인접 주석+요소 동시 배치 불가 재확인.
- sed 일괄 치환 후 이미 읽어둔 파일 Edit가 stale로 4회 실패 — 기계 치환을 먼저, 수기 편집을 나중에.

<!-- 템플릿 (복사해서 맨 위에 추가)
## YYYY-MM-DD · N차 웨이브 · 티켓
**한 일**
- (완료한 것 — 커밋/파일 단위가 아니라 결과 단위로)
**실수노트**
- (무엇을 잘못 짚었고 → 어떻게 잡았나. 다음 세션이 같은 함정을 피하게)
-->

## 2026-07-05 — ASM-042 생성 API 120s 하드 타임아웃 해소 (M1-C)

**날짜:** 2026-07-05
**웨이브:** 7차 (M1-C 갭 마감)
**브랜치/워크트리:** `asm-042-generate-timeout` · `.claude/worktrees/lane-1` (고정 레인 슬롯 첫 사용)
**커밋:** 2a48204(BE 스트리밍 전환+TDD) → aab2164(라우트·카피·대기 안내·G-5 e2e)
**상태:** 레인 완료 — REPORT.md 제출, 크로스체크·머지 대기(오케스트레이터)

### 한 일

- **설계 판단**: 타임아웃 상향(한계선만 이동)·부분 결과 회수(부분 그래프 금지 위반) 기각 →
  기구현 미배선 `streamAnthropic`을 `runGenerate`에 배선. 하드 wall-clock 캡 → idle 60s 캡
  (+wall 300s 백스톱 신설, `maxDuration=300` 정합). 응답 계약(단발 JSON)·parse 경계 불변.
- **잠재 버그 수정**: `streamAnthropic` read 루프의 abort가 raw AbortError로 새 나가
  server_error 500으로 오분류되던 것 → AnthropicApiError 504 분류.
- **표면**: `ai_timeout` 전용 카피 신설(ai_error와 분리), Composer 로더에 "시간이 좀 걸릴 수
  있어요" 대기 안내(무타이머), 라우트 2곳 maxDuration=300.
- **검증**: 유닛 18케이스(전부 fetch 모킹, red→green 확인) · e2e 504 시나리오(카피·아이디어
  보존·재시도 가능·대기 안내) · tsc/lint/vitest 336/build/e2e 19p 0f (E2E_PORT=3110).

### 실수노트

- **`beforeEach(() => mock.mockClear())` 화살표 축약이 8테스트 전멸시킴** — mockClear()가
  mock 자신을 반환하고, vitest는 beforeEach가 반환한 함수를 테스트 후 cleanup으로 "호출"한다.
  mock이 엉뚱한 인자(컨텍스트 1개)로 실행돼 TypeError·unhandled rejection이 다음 테스트에
  귀속됨 — 증상이 원인 지점과 동떨어져 보여 진단에 왕복 4회. **beforeEach 콜백은 항상 블록
  바디 `{}`로** (반환값 없게).

## 2026-07-05 — ASM-032 기능 총점검 (M1-B)

**날짜:** 2026-07-05
**웨이브:** 6차 (M1-B 점검)
**브랜치/워크트리:** `asm-032-audit` · `.claude/worktrees/asm-032-audit`
**상태:** 레인 완료 — 진단 티켓(src 수정 0), 산출물 docs 커밋, 머지 대기(오케스트레이터)

### 한 일

- **시드**: assembler 자기 스펙을 실 DB에 시드 — 경로 B 싱크-인(API 25종·DB 테이블 7종, 레포 실측 기반)
  → 경로 C 생성(opus) → PUT design 저장. 재시드용 design JSON·메타는 `docs/specs/diagnosis/m1-seed-*`.
- **실측**: Playwright 스크립트 6단계(스크래치패드)로 35스크린샷 — 온보딩 B·C, 에디터 5각도,
  편집(PATCH 200·영속)·챗→변경 계획→적용(핵심 루프 완주)·영향 범위·내보내기·기록 전부 브라우저로 밟음.
- **산출**: `docs/specs/diagnosis/m1-feature-audit.md` — 셀별 판정 + 갭 8건(HIGH 1 · MED 4 · LOW 3),
  M1-C 편입 후보 = G-1(생성 120s 타임아웃) 단독. ux-audit 5건 닫음(C-6·A-2·B-10·C-7·A-6, 실측 근거 명기).

### 오케스트레이터 이월

- **G-1 (HIGH, M1-C 후보)**: /api/generate 120s 하드 타임아웃 — 상세 아이디어+코드-진실 참조에서 502 재현(1/1).
  성공 케이스도 103s(한도의 86%). G-5(FE 실패 표면 검증)를 같은 티켓 수용 시나리오로 묶기 권장.
- editor-interactions 상태열 갱신 후보: #1·#7·#16·#34·#62·#65(".md로 받기" 기구현) — 문서 갱신은 오케스트레이터 몫.
- 유료 호출 총 4회(generate 2·chat 1·suggestions 자동 1) — 리포트에 전량 공개. 시드 데이터 잔존(삭제 금지).

### QA 재검증 (2026-07-05, 같은 레인 후속 세션)

- 산출 커밋(16cd601)을 독립 재검증: src·설정 무변경(diff 확정) · ux-audit 닫기 5건 정확(이월분 B-3·5·7 미접촉) ·
  갭 증거 라인 스팟체크 3건 실코드 일치(공유 disabled·Avatar "J"·GENERATE_TIMEOUT_MS=120000).
- 시드 잔존 실측(dev 3132 + curl): products "Assembler (시드)" · apis 25 · dbTables 7 · design 요구사항 7/기능 6/페이지 3/플로우 1/와이어 3/요소 13.
- **불일치 2건 수정**: m1-seed-info.md "API 24개"→25(실측) · 리포트 "요구사항 6(+2 추가)"→요구사항 1+수용 기준 1 추가로 명확화(현재 7).

### 실수노트

- **생성 1회 한도인데 1회차가 타임아웃 502로 소진** — 원인 진단(120s 하드 타임아웃) 후 아이디어를 압축해
  재시도 1회로 성공. 유료 호출 한도 티켓에선 첫 호출 전에 타임아웃·페이로드 규모부터 점검할 것.
- **Playwright 셀렉터 헛발 2회** — ① `input[type=text]`로 챗 입력을 못 잡음(실제는 type 미지정 input,
  `aria-label="AI 챗 입력"`으로 잡힘) ② 레일 행 텍스트가 "DB\n7"이라 `exact:true` 실패. 실측 스크립트는
  aria-label·hasText 정규식 우선, 계측 전에 DOM 덤프부터.
- **워크트리에 node_modules 없음** — dev는 상위 리포 node_modules로 돌지만 스크래치패드 스크립트는
  해석 실패. 스크래치패드에 메인 리포 node_modules 심링크로 해결.
- **waitForResponse를 클릭과 분리 생성해 unhandled rejection 크래시** — Promise.all로 묶거나 .catch 부착.

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
