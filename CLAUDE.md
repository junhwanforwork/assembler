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

**사용자는 터미널을 열고 `/initiate`·`/lane-start`만 — 복붙·중계 0.** 워크트리·브랜치·머지·git은 전부 내가(오케스트레이터) 관리.

```
0 시작(스킬 감지) → 1 브레인스토밍(설계) → 2 워크트리(격리, 내가 생성)
→ 3 계획(plan mode) → 4 실행 → 5 TDD(실패 테스트 먼저→green→refactor)
→ 6 코드리뷰(/cross-check·code-reviewer) → 7 브랜치 마무리(머지·정리, 내가)
```

### 원칙
- **웨이브 병렬 = 멀티터미널 (orch 1 + 고정 레인 슬롯 N).** 레인 워크트리 `.claude/worktrees/lane-{1..3}`은 상시 재사용(터미널도 계속 열어둠). 같은 폴더에 세션 둘 금지(작업 유실 원인). 인세션 에이전트 병렬은 소규모 작업 옵션(사용자 판정 2026-07-05: 한 세션 집중은 확인 부담 과다).
- **창구 = 파일.** 하달=각 레인 `PACKET.md`, 보고=`REPORT.md`(생성=완료 신호, orch 워처가 자동 수거→크로스체크). 둘 다 gitignore. 로컬 커밋은 자유, 머지·push·DB 적용·tickets.md는 오케스트레이터 독점. 크로스체크는 orch 몫(레인에서 안 돌림). 상세 = 사용자 메모리 multi-terminal-orchestration. **루틴 = `/wave-prep`(편성·하달·워처)·레인 `/lane-start`·`/wave-integrate`(머지·게이트·마감).**
- **워크트리로 격리.** 작업마다 별도 브랜치(레인 슬롯 안에서) → 망쳐도 원본 멀쩡, 언제든 원복. 사용자는 안 만짐.
- **자주 커밋** = 자동 저장점. 위험 작업(삭제·대공사) 전 **체크포인트 + 평어 설명**.
- **TDD.** 실패하는 테스트 먼저(엉터리 검사 방지) → 통과 → 정리. 검증된 코드만 남긴다.
- **무조건 검증.** "됐다" 전에 `tsc·lint·build`(+테스트). 추측 금지 — 바꾸기 전 진짜 코드 읽기(`diagnose-before-change.md`). **모델 불문 행동 규율 = `rules/evidence-first.md`**(주장=파일:라인 · 존재 확인 먼저 · 2회 실패=중단 · 수치는 실행 출력에서).
- **웨이브 일지 = `docs/logs/wave-N.md`**(통합 때 작성) — 티켓은 "무엇을", 일지는 "왜"(판단·근거).
- **버그:** 재현·근본원인 먼저(추측 금지) → 수정 → 검증. 오탈자·1줄은 생략.

### 세션
- 시작 `/initiate` · 마감 `/checkout` · 티켓 `memory/tickets.md` 자동 갱신(시작=In Progress, 완료=Done).
- **웨이브 편성 = `docs/specs/roadmap-milestones.md` 탈출 조건 기준.** 백로그 소진은 목표가 아니다(자기 증식함). 크로스체크발 티켓은 CRITICAL/HIGH만 현 웨이브 편입.

---

## Tech Stack
- Next.js 16(App Router) · React 19 · TypeScript ^5 · Tailwind ^4
- Supabase(@supabase/supabase-js·ssr) · AI: `src/lib/anthropic.ts`(fetch 래퍼, SDK 무의존) · 패키지: npm

## Code Rules
- Naming: `camelCase`(변수/함수) · `PascalCase`(컴포넌트) · `UPPER_SNAKE`(상수) · `is/has/can/should`(불리언)
- TypeScript strict, `any` 금지. **모킹 금지 — 실제 동작 코드만.** Comment: why만(what 금지).
- **분리 기준 = 줄 수 아니라 구조(SRP)** — 코드 줄 수 캡 없음(`file-structure.md`).

## 사용자 보고 문체 (2026-07-06)
사용자 = 비개발자. 채팅 보고·질문·요약 전부:
- 결론 한 줄 먼저 → 짧은 불릿(불릿 1 = 사실 1). 긴 복문·번역투(한자어 명사구 나열) 금지.
- 일상어 우선 — 전문용어·티켓번호·기호(M1-D·P2·blocker 등)는 뜻을 먼저, 기호는 괄호 병기.
- "하실 일"과 "제가 할 일" 구분 명시. 내부 수치(게이트·해시)는 말미 한 줄 또는 생략. 해요체.
- 문서(docs/specs·tickets.md)는 예외 — 밀도 유지(플랜은 촘촘하게).

---

## Known Issues & Caveats

- **Turbopack dev 캐시 stale:** `globals.css` 변경 후 `.next`가 옛 값 서빙 → `rm -rf .next` 후 dev 재시작. ⚠️ `pkill -f next-server`(광범위) 금지 — `assembler` 경로 정밀 매칭만.
- **Supabase 타입드 클라이언트:** 커스텀 Database 타입의 테이블 `Row`는 **반드시 `type`**(interface면 `.from()`이 `never`로 떨어짐). `src/lib/supabase/builder.ts` 참고.
- **wf_projects RLS = x-session-id 헤더:** anon 키만으로 CRUD(비로그인 소유권), 로그인 시 user_id 우선.
- **RPC 인자 가드는 모킹 테스트로 안 잡힘:** `check_rate_limit` 등 DB 함수의 인자 검증에 걸치는 변경(라우트 추가 등)은 유닛·크로스체크가 전부 통과해도 무력화될 수 있다(fail-open). 통합 게이트에서 실 DB 호출 스모크 필수. (2026-07-02 챗 rate limit 사고)
- **오케스트레이터 Bash에서 `cd` 금지:** cwd가 호출 간 유지돼 이후 턴 전체가 하이재킹된다 — 워크트리 작업은 `git -C`·절대 경로만, 통합 착수 첫 명령에 `pwd` 확인. (2026-07-07 통합 오적용 사고)
- **크로스 경계 테스트 픽스처는 생산자 코드에서 역추적:** 서버 산출물(dangling ref 등)을 소비하는 테스트의 픽스처를 구현에 맞춰 자작하면 가짜 green이 된다 — 생산 코드(예: findDanglingRefs)의 실제 출력 포맷을 확인해 만든다. (2026-07-06 접두사 포맷 사고)
