# HowCloud – Claude Code Rules

Update this file when new rules are established. All rules are mandatory.

---

## Product

**HowCloud** — 기능 동작 방식 레퍼런스 플랫폼.
"어떻게 구현했는지, 왜 이렇게 했는지"를 보여주는 레퍼런스. 조각을 골라 붙여서 내 서비스를 만든다.

- G1: 비개발 개인 (카페 사장님) — "이걸로 만들면 되겠다"
- G2: 개발자/바이브코더 — FEATURE.md → 프롬프트 직행
- G3: 프리랜서/에이전시 — 클라이언트 제안 레퍼런스

---

## Team & Workflow

Agents: `.claude/agents/` · Rules: `.claude/rules/` (경로별 자동 적용)

### Agents

| Agent              | Role                                                       |
| ------------------ | ---------------------------------------------------------- |
| `howcloud-pm`      | PM — 기능 정의, 플로우 설계, 정책, PRD                      |
| `howcloud-design`  | UX 검증 — 플로우 리뷰, 상태 정의, 인터랙션 패턴 (Figma 없음) |
| `howcloud-fe`      | 프론트엔드 — React, Tailwind, zustand                       |
| `howcloud-be`      | 백엔드 — Supabase, RLS, API routes                          |
| `howcloud-qa`      | QA — 버그 트리아지, 테스트 케이스                            |
| `prompt-engineer`  | AI 프롬프트 최적화 (`/improve-prompt`)                      |

`ui-ux-designer` — howcloud-design 보조

### Workflow (mandatory order)

```
PM 업무 할당
  → howcloud-design UX 설계
  → /pre-check (DS·UX·정책 충돌 검사) ← 구현 전 반드시
  → howcloud-fe / howcloud-be 개발
  → howcloud-qa 검증
```

### Rules (경로별 자동 로드)

| Rule                   | 경로                                    |
| ---------------------- | --------------------------------------- |
| `ux-writing.md`        | `src/**/*.{ts,tsx}` — 해요체, 버튼, 에러 |
| `button.md`            | `src/**/*.{ts,tsx}` — 버튼 규칙          |
| `file-structure.md`    | `src/**/*.{ts,tsx}` — 350줄 한도, SRP    |
| `api.md`               | `src/app/api/**`                         |
| `team-perspectives.md` | multi-team 관점 정의                     |
| `flow-view-pattern.md` | flow 다이어그램 구현 패턴                |

---

## Ticket Auto-Claim (MANDATORY)

티켓 작업 시작 전 tickets.md를 자동 업데이트한다. 사용자가 명시적으로 말하지 않아도 Claude가 선 처리.

- 단일 티켓 지시 → 해당 ID In Progress 이동
- 코드 수정 완료 → verify 처리 (체크박스 + 날짜)
- 빌드/브라우저 검증 완료 → Done 이동

티켓 파일: `/Users/junhwanlim/.claude/projects/-Users-junhwanlim-Projects-howcloud/memory/tickets.md`

---

## Pre-implementation Check (MANDATORY)

티켓 작업 시작 시 코드 수정 전에 `/pre-check` 를 실행한다.

검사 항목: UX Writing 해요체·버튼·에러 메시지 / 파일 크기 350줄 초과 여부

---

## Multi-Team Collaboration (MANDATORY)

모든 티켓 구현은 `/multi-team` 으로 처리한다. 관점이 다른 3개 역할(A 실용 / B 안정 / C 구조)이 협업한다.

- **기본 = 순차 릴레이:** A(실용)가 구현 → B(안정)·C(구조)가 리뷰·토론 → 구현자가 개선
- **고위험만 병렬 3팀:** 결제·보안·RLS/스키마 → 독립 구현 후 심판이 합성
- **fast floor 예외:** 오탈자·1줄 텍스트·단일 토큰 값 교체 → 멀티팀 스킵

---

## Bug Triage (MANDATORY)

```
howcloud-qa 진단 → howcloud-fe/be 수정 → howcloud-qa 검증
```

---

## Tech Stack

- Next.js 15 (App Router) · React 19 · TypeScript ^5
- Tailwind CSS ^4 · zustand ^5
- Supabase (@supabase/supabase-js, @supabase/ssr)
- 패키지 매니저: npm

---

## Code Rules

- Naming: `camelCase` 변수/함수, `PascalCase` 컴포넌트, `UPPER_SNAKE` 상수, `is/has/can/should` 불리언
- 절대 모킹 금지 — 실제 동작 코드만
- TypeScript strict, `any` 금지
- Comment: why만, what 금지

---

## Product Policy

| 항목 | 정책 |
|------|------|
| 콘텐츠 | Type A (구현 스크랩) + Type B (아티클). is_published = false → 어드민 검수 후 publish |
| 저장 | 비로그인: localStorage (session_id). 로그인 후 Supabase 마이그레이션 |
| 공유 링크 | 스냅샷 기반, 읽기전용. `/share/[slug]` |
| FEATURE.md | Phase 2. ₩29,000/개 per-request |
| 수익 | Free(탐색·저장·공유) · FEATURE.md ₩29,000/개 · Pro 월 ₩9,900 |

---

## Known Issues & Caveats

### Turbopack dev 캐시 stale (CSS 토큰·`globals.css` 변경 시)

Next.js 16 Turbopack dev 모드에서 `src/app/globals.css`의 CSS 변수를 바꿔도 `.next/` 캐시가 옛 값을 계속 서빙하는 사고가 두 번 있었음. hot reload가 CSS 변수 단위 변경을 못 잡는 한계.

**Workaround — 토큰/색/`globals.css` 변경 후:**

```bash
rm -rf .next
pkill -f "user-data-dir.*howcloud\|next-server.*howcloud\|node.*howcloud/node_modules.*next"
npx next dev -p 3001
```

⚠️ `pkill -f "next-server"`(광범위) 절대 금지 — 다른 프로젝트(my-portfolio·OPINION·worktree 등) dev까지 모두 종료됨. 반드시 `howcloud` 경로 포함 정밀 매칭만 사용.

**증상 빠른 진단:**

```bash
# 서빙되는 CSS에 새 값이 들어갔는지 직접 확인
CSS=$(curl -s http://localhost:3001/ | grep -oE "/_next/static/[^\"]*\.css" | head -1)
curl -s "http://localhost:3001${CSS}" | grep -oE -- "--bg-base:[^;]+;|--accent:[^;]+;"
```

### `app/(main)/layout.tsx` 의 GNB·Sidebar는 단일 인스턴스

Next App Router의 nested layout 특성상 GNB(`<GNB />`)와 FeatureSidebar는 layout에서 한 번만 마운트되고 페이지 전환 시 그대로 유지됨. GNB·Sidebar에 데이터 fetch가 들어간다면 layout server component에서 한 번만 호출 (각 page에서 중복 호출 X).

### Supabase service_role 키는 어드민 INSERT에 필수

`implementations` 테이블 RLS가 켜져 있고 INSERT 정책이 없어, 어드민이 새 행을 만들 때 `SUPABASE_SERVICE_ROLE_KEY` env 가 필요함. `.env.local`에 없으면 anon으로 폴백되어 500 `row-level security policy violation`이 남. (HC-045 라운드 사고 사례)

---

## Deferred (Phase 2)

- FEATURE.md export (AI 생성 + 사용자 정보 레이어)
- 아티클 스크랩 (Type B)
- 신규 콘텐츠 알림 이메일
- 로그인 / 사용자 계정
