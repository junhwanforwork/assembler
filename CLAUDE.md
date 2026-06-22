# Assembler – Claude Code Rules

새 규칙이 생기면 이 파일을 업데이트한다. 모든 규칙은 필수다.

---

## Product

**Assembler** — Product Architecture System.

Assembler는 문서 도구가 아니다. 제품 아이디어를 **연결된 제품 객체 그래프**로 변환한다.
**"문서로 사고하지 말고, 관계로 사고하라."** isolated artifact(고립된 산출물) 금지 — 모든 객체는 연결된다.

### Source of Truth (체인)

```
Requirement → Feature → Page → UI Element → Action → API → Database
```

모두 **Mapping**으로 연결된다. 가장 중요한 질문:
**"사용자가 이걸 하면, 다음에 무엇이 일어나는가?"** — 모든 UI Element는 이 질문에 답해야 한다.

### 카디널 룰 (3)

1. **모든 것은 연결된다.** 고립된 산출물 금지.
2. **Wireframe은 Page 소유.** Feature에 직접 붙이지 않는다.
3. **모든 UI Element는 Mapping을 가진다** — State · Action · API · Database · Result.

### 핵심 객체 (상세는 `rules/assembler/object-model.md`)

- **Project** 최상위 컨테이너
- **Requirement** WHY (전역 요구사항) · **Feature** WHAT · **Page** WHERE
- **UI Element** (State/Action/API/DB/Result) · **Wireframe** (Page 소유, UI Elements 집합)
- **API** · **Database** (프로젝트 전역 공유 객체 — 여러 Feature/Page가 참조)
- **PageFlow** (Page 내부 journey) · **UserFlow** (Page↔Page 전역 네비게이션)
- **Mapping** (연결 — Assembler의 핵심 객체)

### 두 레이어 구분 (혼동 금지)

- **앱을 만드는 규칙** (코드베이스): `rules/{db,api,ds-tokens,ds-components,button,file-structure,ux-writing}.md`
- **앱이 다루는 도메인** (Assembler 객체): `rules/assembler/*` + 런타임 프롬프트 `src/lib/prompts/assembler.ts`

`rules/api.md`(Next API 라우트)와 Assembler `object-model`의 API(생성되는 제품 객체)는 **다른 레이어**다.

---

## Team & Workflow

Agents: `.claude/agents/` · Rules: `.claude/rules/` (경로별 자동 적용)

### Agents

| Agent             | Role                                                          |
| ----------------- | ------------------------------------------------------------ |
| `assembler-pm`     | PM — 객체/기능 정의, 플로우 설계, 정책, PRD                   |
| `assembler-design` | UX 검증 — 플로우 리뷰, 상태 정의, 인터랙션 패턴 (Figma 없음)  |
| `assembler-fe`     | 프론트엔드 — React, Tailwind, zustand, dnd-kit               |
| `assembler-be`     | 백엔드 — Supabase, RLS, API routes                            |
| `assembler-qa`     | QA — 버그 트리아지, 테스트 케이스 (버그 시 MANDATORY 먼저)    |
| `assembler-optimizer` | 진단·최적화 계획 — 근본원인·공수·우선순위 리포트 (코드 미작성, `/optimize`) |
| `prompt-engineer` | AI 프롬프트 최적화 — XML·Iron Law·few-shot·캐싱 (`/improve-prompt`) |
| `prompt-lead`     | 프롬프트 부서 디렉터 — 의도·대상 감지·라우팅 (코드 미작성, `/prompt`) |
| `prompt-polisher` | 프롬프트 폴리싱 — 의미 불변 명료성·톤·구조 (`/prompt`)        |
| `prompt-evaluator` | 프롬프트 평가 — 골든셋·회귀·토큰 측정 (코드 미작성, `/prompt`) |

`ui-ux-designer` — assembler-design 보조.

프롬프트 작업(런타임 프롬프트·붙여넣은 임의 프롬프트)은 `/prompt`로 — prompt-lead가 의도를 판정해 polisher/engineer/evaluator로 라우팅한다. 등록된 런타임 AI 엔드포인트(표 고정)는 `/improve-prompt` 빠른 경로. 설계: `docs/specs/prompt-department.md`.

진단이 필요하면(원인불명·느림·중복·고비용·리팩터) 구현 전에 `/optimize`로 진단 → 리포트의 우선순위·계획으로 인계. 설계: `docs/specs/optimization-planner.md`. 버그는 `/bug`(QA 먼저), 변경 diff 리뷰는 `/cross-check`. 주기적 코드 건강 점검은 `/health [예산]`(시간박스 perf+QA·회귀 스윕, 직전 리포트 대비 회귀 추적, 코드 미수정 — 설계: `docs/specs/health-sweep.md`).

### Workflow (mandatory order)

```
PM 업무 할당
  → assembler-design UX 설계
  → /pre-check (DS·UX·정책 충돌 검사) ← 구현 전 반드시
  → assembler-fe / assembler-be 개발
  → assembler-qa 검증
```

### Rules (경로별 자동 로드 — 각 rule 상단 `paths:` frontmatter로 스코프)

| Rule                            | 경로 / 적용                                       |
| ------------------------------- | ------------------------------------------------- |
| `ux-writing.md`                 | `src/**/*.{ts,tsx}` — 앱 UI 카피 해요체·버튼·에러 |
| `button.md`                     | `src/**/*.{ts,tsx}` — 버튼 규칙                   |
| `ds-tokens.md`                  | `src/**/*.{ts,tsx}` — 색·간격·radius 토큰         |
| `file-structure.md`             | `src/**/*.{ts,tsx}` — 350줄 한도, SRP             |
| `diagnose-before-change.md`     | `src/**/*.{ts,tsx}`, `supabase/**` — 변경 전 진단(증거·최소변경·검증) |
| `perf-diagnosis.md`             | `src/**/*.{ts,tsx}` — 성능 진단 7단계(증거→가설→리서치→적용) |
| `db.md`                         | `supabase/**`, `src/lib/supabase/**`, `src/types/**` |
| `api.md`                        | `src/app/api/**` — Next API 라우트                |
| `flow-view-pattern.md`          | flow 다이어그램 구현 패턴                          |
| `team-perspectives.md`          | multi-team 관점 정의                              |
| `assembler/object-model.md`     | `src/lib/types/**`, `src/lib/prompts/**`          |
| `assembler/mapping.md`          | `src/lib/types/**`, `src/lib/prompts/**`          |
| `assembler/wireframe.md`        | `src/components/**`, `src/lib/types/**`           |
| `assembler/flow.md`             | `src/lib/types/**`, `src/lib/prompts/**`          |
| `assembler/generation.md`       | `src/lib/prompts/**`, `src/app/api/generate/**`   |
| `assembler/content-style.md`    | `src/lib/prompts/**`, `src/app/api/generate/**`   |

각 rule 파일은 OPINION 스타일로 **`## Origin`(이 규칙이 왜 생겼는지)** 을 둔다.

---

## Ticket Auto-Claim (MANDATORY)

티켓 작업 시작 전 tickets.md를 자동 업데이트한다. 사용자가 명시적으로 말하지 않아도 Claude가 선 처리.

- 단일 티켓 지시 → 해당 ID In Progress 이동
- 코드 수정 완료 → verify 처리 (체크박스 + 날짜)
- 빌드/브라우저 검증 완료 → Done 이동
- **티켓에 없는 새 개념·범위 지시 → 구현 전에 티켓 생성 + 범위 확인 먼저.** 갈리는 설계 결정(계층·역할·인증 등)은 선택지 질문으로 확정 후 착수.

**Epic 계층 (Phase 안 그룹):** `### 🎯 EPIC ASS-EXX · 이름` 헤딩으로 관련 티켓을 묶고, 하위 티켓 줄 끝에 `(epic: EXX)` 태그를 단다. Epic 헤딩은 **체크박스가 없다** — 상태는 하위 롤업(모든 하위 `[x]` = epic 완료). 작업 선택·claim·동기화는 **하위 티켓(ASS-NNN) 단위 그대로** — epic은 표시·그룹용. Epic ID `ASS-EXX`(E 접두)는 `ASS-NNN` 파싱과 충돌하지 않는다.

티켓 파일: `/Users/junhwanlim/.claude/projects/-Users-junhwanlim-Projects-assembler/memory/tickets.md`
현재 시리즈: **ASS-001~** (구 HC-* 는 피벗 전 — 보류/아카이브).

---

## Session Initiate & Checkout

- **세션 시작:** `/initiate` — 툴(MCP) 연결 확인 → sessions.md의 지난 세션 목록 제시 → 선택한 작업 이어받기.
- **세션 마감:** `/checkout` — 코드 검사 → tickets.md 동기화 → 실수 노트(memory/mistakes.md) 기록 → 규칙 반영 제안 → 세션 기록(memory/sessions.md, 가상 세션 명 S-###) → 미커밋 정리. (`/eod`는 `/checkout`의 alias.)

작업 재개 시: 티켓이 있으면 tickets.md 맥락 블록, 티켓 없는 작업이면 sessions.md에서 찾아 이어받는다.

---

## Pre-implementation Check (MANDATORY)

티켓 작업 시작 시 코드 수정 전에 `/pre-check` 를 실행한다.

검사 항목: UX Writing 해요체·버튼·에러 메시지 / DS 토큰 / 파일 크기 350줄 초과 여부 / Assembler 객체 연결 무결성.

---

## Multi-Team Collaboration (MANDATORY)

모든 티켓 구현은 `/multi-team` 으로 처리한다. 관점이 다른 3개 역할(A 실용 / B 안정 / C 구조)이 협업한다.

- **기본 = 순차 릴레이:** A(실용)가 구현 → B(안정)·C(구조)가 관점별 리뷰·토론 → 구현자가 개선. 한 코드 베이스, 저비용.
- **고위험만 병렬 3팀:** 결제·보안·RLS/스키마·생성 그래프 무결성 → 독립 구현 후 심판이 베이스+패치(합성 금지, 교착 시 사용자 에스컬레이션).
- **fast floor 예외:** 오탈자·1줄 텍스트·단일 토큰 값 교체 → 멀티팀 스킵.

관점 정의: `.claude/rules/team-perspectives.md`

---

## Bug Triage (MANDATORY)

버그 발생 시 순서 엄수. QA 없이 개발자에게 바로 넘기지 않는다.

```
assembler-qa 진단 (재현·근본원인·영향·심각도)
  → assembler-fe/be 수정 (타입 체크 + 빌드)
  → assembler-qa 검증 (해결 + regression 없음)
```

예외: 오탈자·1줄 텍스트는 QA 생략 가능.

---

## Tech Stack

- Next.js 16 (App Router) · React 19 · TypeScript ^5
- Tailwind CSS ^4 · zustand ^5 · @dnd-kit/core·sortable·utilities
- Supabase (@supabase/supabase-js, @supabase/ssr)
- AI: `src/lib/anthropic.ts` (fetch 래퍼, SDK 무의존) · react-markdown · remark-gfm
- 패키지 매니저: npm

---

## Code Rules

- Naming: `camelCase` 변수/함수, `PascalCase` 컴포넌트, `UPPER_SNAKE` 상수, `is/has/can/should` 불리언
- 절대 모킹 금지 — 실제 동작 코드만
- TypeScript strict, `any` 금지
- **Comment: why만, what 금지**
- **변경 전 진단**: 추측으로 고치지 않는다 — 증거→최소 변경→검증 (`diagnose-before-change.md`)

---

## Known Issues & Caveats

### Turbopack dev 캐시 stale (CSS 토큰·`globals.css` 변경 시)

Next.js 16 Turbopack dev 모드에서 `src/app/globals.css`의 CSS 변수를 바꿔도 `.next/` 캐시가 옛 값을 계속 서빙하는 사고가 있었음.

**Workaround — 토큰/색/`globals.css` 변경 후:** `rm -rf .next` 후 `npx next dev -p 3001`.
⚠️ `pkill -f "next-server"`(광범위) 절대 금지 — 다른 프로젝트 dev까지 종료됨. 반드시 `assembler` 경로 포함 정밀 매칭만.

### Supabase 타입드 클라이언트 — Row는 `type`, `interface` 금지

커스텀 Database 타입에서 테이블 `Row`를 `interface`로 선언하면 `Record<string, unknown>`(GenericTable 제약)에 할당되지 않아 `.from()` 결과가 통째로 `never`로 떨어진다. **반드시 `type`(객체 리터럴)로.** (`src/lib/supabase/builder.ts` 주석 참고.)

### Supabase 마이그레이션 히스토리 드리프트

로컬↔리모트 마이그레이션 히스토리가 어긋나면 `db push`가 게이트에 막힌다. `supabase migration repair --status reverted <id...>` 로 정정 후 push. (프로덕션 DB 변경 — 사용자 승인 필요.)

### wf_projects RLS는 x-session-id 헤더 기반

`wf_projects` 는 `session_id = request.headers x-session-id` RLS로 anon 키만으로 CRUD 가능(service_role 불필요). 비로그인 세션 소유권 패턴.
