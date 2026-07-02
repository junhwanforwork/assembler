# Assembler – Claude Code Rules

새 규칙이 생기면 이 파일을 업데이트한다. **이 파일은 매 세션 컨텍스트에 로딩되므로 짧게 유지한다**
(길이 제한은 코드가 아니라 이런 .md에 적용).

---

## Product

**Assembler** — 제품 아이디어를 **연결된 구조**로 만들어주는 도구.
핵심 질문: **"사용자가 이걸 하면, 다음에 무엇이 일어나는가?"** — 모든 요소는 연결된다(고립 산출물 금지).
북극성: **"스펙은 한 곳, 변경은 한 번"** — 위계·지표·포지셔닝은 `docs/specs/north-star.md`(단일 출처).

> ⚠️ **2026-06 백지 리셋(C) 진행 중.** 핵심 개념만 유지하고 **데이터 구조(IA)·도메인 규칙·디자인은 재정의 중.**
> 새 서비스 정의가 확정되면 `rules/`·에이전트·디자인 규칙을 그 정의로 다시 채운다. **그 전엔 옛 객체모델 가정 금지.**
> 유지된 인프라: Supabase(DB)·인증·AI 배선(`src/lib/{supabase,anthropic,auth}`)·Next 셸.
> 이전 전체 상태는 `checkpoint-before-reset` 태그/`pre-reset-checkpoint` 브랜치에 보존.

---

## Work Process (SuperPowers 8단계)

**사용자는 터미널 1개 + "만들어줘"·결과 검토만.** 워크트리·브랜치·머지·git은 전부 내가(오케스트레이터) 관리.

```
0 시작(스킬 감지) → 1 브레인스토밍(설계) → 2 워크트리(격리, 내가 생성)
→ 3 계획(plan mode) → 4 실행 → 5 TDD(실패 테스트 먼저→green→refactor)
→ 6 코드리뷰(/cross-check·code-reviewer) → 7 브랜치 마무리(머지·정리, 내가)
```

### 원칙
- **한 세션.** 같은 폴더에 세션 둘 금지(작업 유실 원인). 병렬은 내가 한 세션 안에서(에이전트·백그라운드). N-터미널은 진짜 거대 작업 때만 옵션 — 그때 내가 워크트리·패킷 세팅.
- **워크트리로 격리.** 작업마다 별도 워크트리·브랜치 → 망쳐도 원본 멀쩡, 언제든 원복. 사용자는 안 만짐.
- **자주 커밋** = 자동 저장점. 위험 작업(삭제·대공사) 전 **체크포인트 + 평어 설명**.
- **TDD.** 실패하는 테스트 먼저(엉터리 검사 방지) → 통과 → 정리. 검증된 코드만 남긴다.
- **무조건 검증.** "됐다" 전에 `tsc·lint·build`(+테스트). 추측 금지 — 바꾸기 전 진짜 코드 읽기(`diagnose-before-change.md`).
- **버그:** 재현·근본원인 먼저(추측 금지) → 수정 → 검증. 오탈자·1줄은 생략.

### 세션
- 시작 `/initiate` · 마감 `/checkout` · 티켓 `memory/tickets.md` 자동 갱신(시작=In Progress, 완료=Done).

---

## Tech Stack
- Next.js 16(App Router) · React 19 · TypeScript ^5 · Tailwind ^4
- Supabase(@supabase/supabase-js·ssr) · AI: `src/lib/anthropic.ts`(fetch 래퍼, SDK 무의존) · 패키지: npm

## Code Rules
- Naming: `camelCase`(변수/함수) · `PascalCase`(컴포넌트) · `UPPER_SNAKE`(상수) · `is/has/can/should`(불리언)
- TypeScript strict, `any` 금지. **모킹 금지 — 실제 동작 코드만.** Comment: why만(what 금지).
- **분리 기준 = 줄 수 아니라 구조(SRP)** — 코드 줄 수 캡 없음(`file-structure.md`).

---

## Known Issues & Caveats

- **Turbopack dev 캐시 stale:** `globals.css` 변경 후 `.next`가 옛 값 서빙 → `rm -rf .next` 후 dev 재시작. ⚠️ `pkill -f next-server`(광범위) 금지 — `assembler` 경로 정밀 매칭만.
- **Supabase 타입드 클라이언트:** 커스텀 Database 타입의 테이블 `Row`는 **반드시 `type`**(interface면 `.from()`이 `never`로 떨어짐). `src/lib/supabase/builder.ts` 참고.
- **wf_projects RLS = x-session-id 헤더:** anon 키만으로 CRUD(비로그인 소유권), 로그인 시 user_id 우선.
