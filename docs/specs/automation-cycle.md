# Automation Cycle — 무인 개발 사이클 설계

티켓 → 개발 → QA → (실패 시 개발 복귀) → PR 사이클을 사람 없이 한 바퀴 돌리는 구조의 단일 출처.
구현체: `.claude/commands/autopilot.md`(무인 1사이클) · `.claude/commands/cowork.md`(감독형 아이디어→완료).
확정일: 2026-06-14.

## Origin

`/cowork`가 이미 자율 루프지만 피벗 전 HC-* 경로(`docs/specs/todo/`·`done/`·`index.md`)를 참조해
현행 ASS-*/`memory/tickets.md` 체계와 어긋나 그대로는 안 돈다. 또 자동 트리거가 없어 매번 사람이
슬래시 커맨드를 쳐야 시작한다. "내가 없어도 돌아가는" 사이클을 만들려면 ① 무인 1사이클 단위
오케스트레이터와 ② 그걸 반복 구동하는 트리거가 필요하다. 이 문서가 그 상태머신·게이트·안전
규칙을 고정해, 커맨드 본문이 즉흥 판단으로 갈라지지 않게 한다.

외부 의존은 없다 — 배포(Vercel)·CI(GitHub Actions)·테스트 프레임워크 없이 Claude 네이티브
(커맨드 + Workflow + `/loop`/cron + gh CLI)만으로 PR 생성까지 돈다.

---

## 두 커맨드의 역할 구분 (혼동 금지)

| | `/autopilot` | `/cowork` |
| --- | --- | --- |
| 성격 | **무인 1사이클** (자동화 루프용) | **감독형** (사람이 보면서) |
| 입력 | 없음 — tickets.md에서 다음 티켓 자동 선택 | 아이디어(자연어) 또는 티켓 ID |
| 티켓 생성 | 안 함 (기존 티켓만 소비) | 함 (아이디어 → 티켓, 승인 프롬프트) |
| 종료점 | **PR 생성에서 STOP** | 완료 처리(commit)까지, PR은 선택 |
| 승인 프롬프트 | 없음 (무인) | 있음 |
| 구동 | `/loop` 또는 cron이 반복 호출 | 사람이 직접 |

---

## 상태머신 — /autopilot 1사이클

```
[상태 읽기] memory/tickets.md
   ├─ [~] In Progress 티켓 있으면 → 그 티켓 재개
   └─ 없으면 → 다음 [ ] todo 중 "자동 가능"한 첫 티켓 선택
        자동 불가 = 고위험(⚠·DB 스키마·결제·보안·RLS) · 의존 미완 · 모호
        후보 없으면 → STOP + 알림("자동 가능한 티켓 없음")
   ↓
[브랜치] 현재 main이면 ass-0XX-슬러그 브랜치 생성
   ↓
[Pre-check] /pre-check — DS·UX·정책·아키 충돌
   └─ ❌ 있으면 자동 해소 가능한 것만 처리, 정책 판단 필요하면 STOP + 알림
   ↓
[구현] /multi-team ASS-0XX — 순차 릴레이(A 구현 → B·C 리뷰 → 반영)
   ↓
[빌드 게이트 — HARD STOP] npx tsc --noEmit && npm run lint && npm run build
   ├─ 통과 → 기능 QA
   └─ 실패 → 에러 출력을 구현 에이전트에 전달 → 재시도(누적 2회) → 초과 시 STOP + 알림
   ↓
[기능 QA — Playwright, HARD GATE] npm run e2e (스모크 + 티켓별 e2e/<feature>.spec.ts)
   ├─ 통과 → 코드리뷰   (AI 호출 0: /preview 픽스처·시드 + page.route 모킹, ASS-E18)
   └─ 실패 → 구현 복귀 → 재시도(누적 2회) → 초과 시 STOP + 알림
   ↓
[코드리뷰] /cross-check — code-reviewer + assembler-qa(+API면 assembler-be) 독립 병렬
   ├─ PASS / CONDITIONAL PASS → 완료
   └─ FAIL(CRITICAL) → 구현 복귀 → 재시도(누적 2회) → 초과 시 STOP + 알림
   ↓
[완료] tickets.md 체크박스 갱신([x]+날짜) → /commit → git push -u → gh pr create
   ↓
[STOP] PR 링크를 알림으로 보고. merge·배포는 사람.
```

## 불변 안전 규칙 (무인이라 필수)

1. **고위험 자동 진입 금지.** tickets.md에 ⚠·"고위험"·DB 스키마·결제·보안·RLS/생성 그래프
   무결성이 걸린 티켓은 선택하지 않는다 → STOP + 알림. (이들은 `/multi-team` 병렬 3팀 + 사람 승인.)
2. **main 직접 push·force push·auto-merge 금지.** 항상 브랜치 → PR 생성까지만.
3. **DB 마이그레이션·프로덕션 변경 금지.** 필요하면 STOP + 사람 승인 (CLAUDE.md Known Issues).
4. **재시도 상한.** 빌드·QA 각 누적 2회 초과 시 STOP + 알림 — 루프 폭주·토큰 낭비 방지.
5. **사이클당 티켓 1개.** 끝나면 반드시 결과 알림(성공=PR 링크 / STOP=사유)을 남긴다 —
   무인이라 결과가 어디에도 안 남으면 추적 불가.
6. **새 티켓 생성 금지.** 기존 백로그만 소비 (아이디어→티켓은 `/cowork` 또는 사람).

## 휴먼 체크포인트

PR-stop 설계 — 사람은 아래만 한다:
- PR 리뷰 → merge → 배포 (자동화 경계 밖).
- STOP 알림 처리: 고위험 티켓 승인, 빌드/QA 반복 실패 원인 판단, 정책 결정.

## 티켓 선택 규칙 (자동 가능 판정)

`memory/tickets.md`를 위에서부터 훑어:
1. `[~]` In Progress가 있으면 그것(재개 우선).
2. 없으면 첫 `[ ]` todo 중 **모두 만족**하는 것:
   - 고위험 마커 없음 (⚠·"고위험"·DB 스키마·결제·보안·RLS). `⏸`(보류) 마커도 제외.
   - 의존 선행 티켓이 `[x]` 완료.
   - 작업 내용이 코드 변경으로 명확(모호한 "검토"·"확인"류 제외 가능).
3. 후보 없으면 STOP + 알림.

**Epic 헤딩(`### 🎯 EPIC ASS-EXX`)은 선택 대상이 아니다** — 체크박스가 없는 그룹 레이블이다. 그 아래 `[ ]` 하위 티켓(`ASS-NNN`)만 선택한다. Epic 진행도는 하위 롤업으로 본다.

## 트리거 — 반복 구동

1. **로컬 검증 (지금 단계):** `/loop /autopilot` — 한 사이클 끝나면 `ScheduleWakeup`으로 다음
   사이클 예약. 노트북 켜져 있어야 함, 셋업 0. 사이클이 제대로 도는지 여기서 확인.
2. **클라우드 승격 (다음 단계):** 검증되면 같은 `/autopilot`을 routine(cron, `/schedule`)으로
   등록 → 정해진 주기에 노트북 꺼져도 클라우드에서 실행. (클라우드 환경에 repo clone·gh 인증
   셋업 필요 — 승격 시점에 확인.)

## 재사용 맵

| 사이클 단계 | 자산 |
| --- | --- |
| 상태 읽기/쓰기 | `memory/tickets.md`(`[ ]`/`[~]`/`[x]`·맥락 블록) + CLAUDE.md Ticket Auto-Claim |
| 충돌 점검 | `.claude/commands/pre-check.md` |
| 구현 | `.claude/commands/multi-team.md` + `.claude/rules/team-perspectives.md` |
| 빌드 게이트 | `npx tsc --noEmit && npm run lint && npm run build` |
| 기능 QA | `playwright.config.ts` + `e2e/`(`helpers.ts`·`smoke.spec.ts`) + `npm run e2e` (ASS-E18) |
| 코드리뷰 | `.claude/commands/cross-check.md` |
| 완료/PR | `.claude/commands/{commit,pr}.md` + gh CLI (repo `junhwanforwork/assembler`) |
| 반복 구동 | `/loop` + `ScheduleWakeup` → (추후) routine/cron |
| 결과 알림 | `PushNotification` |

## 범위 밖

배포 인프라(Vercel·GitHub Actions)는 PR-stop이라 지금 불필요 — 추후 배포를 자동 경계에 넣을 때 추가.
(테스트는 ASS-E18로 사이클에 편입됨 — Playwright 기능 QA. CI(ASS-170)에서도 같은 `npm run e2e` 재사용 가능.)
settings.json hooks 자동 트리거도 `/loop` 검증 후 판단.
