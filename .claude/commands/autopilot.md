---
description: 무인 1사이클 — tickets.md에서 다음 티켓을 골라 개발→QA→PR까지 자동으로 끌고 간다. /loop·cron 구동용. 설계 출처는 docs/specs/automation-cycle.md.
---

# /autopilot — 무인 개발 사이클 (티켓 1개 → PR)

사람 없이 티켓 1개를 PR 생성까지 끌고 가는 1사이클 오케스트레이터.
`/loop` 또는 routine(cron)이 이 커맨드를 반복 호출한다. 설계·안전 규칙 단일 출처: `docs/specs/automation-cycle.md`.

$ARGUMENTS 가 티켓 ID(예: `ASS-016`)면 그 티켓을 대상으로, 없으면 자동 선택한다.

**이 커맨드는 무인이다.** 승인 프롬프트를 띄우지 않는다 — 진행하거나, 안전 규칙에 걸리면 STOP + 알림한다.

---

## 안전 규칙 (먼저 읽는다 — 위반 금지)

1. **고위험 티켓 자동 진입 금지.** ⚠·"고위험"·DB 스키마·결제·보안·RLS/생성 그래프 무결성이 걸린 티켓은 선택·진행하지 않는다 → STOP + 알림.
2. **main 직접 push·force push·auto-merge 금지.** 브랜치 → PR 생성까지만. merge·배포는 사람.
3. **DB 마이그레이션·프로덕션 변경 금지.** 필요하면 STOP + 알림.
4. **재시도 상한:** 빌드·QA 각 누적 2회 초과 시 STOP + 알림.
5. **새 티켓 생성 금지.** 기존 백로그만 소비.
6. 사이클 끝(성공이든 STOP이든)에 **반드시 PushNotification으로 결과를 남긴다.**

---

## Step 1 — 티켓 선택

`memory/tickets.md`(`/Users/junhwanlim/.claude/projects/-Users-junhwanlim-Projects-howcloud/memory/tickets.md`)를 읽는다.

- `$ARGUMENTS`에 티켓 ID가 있으면 그 티켓. 단 고위험 마커가 있으면 STOP + 알림.
- 없으면 선택 규칙(`automation-cycle.md`):
  1. `[~]` In Progress 티켓이 있으면 그것(재개 우선).
  2. 없으면 첫 `[ ]` todo 중 **모두 만족**: 고위험 마커 없음 · 선행 의존 `[x]` 완료 · 코드 변경으로 명확.
  3. 후보 없으면 → STOP, `PushNotification`("autopilot: 자동 가능한 티켓 없음").

선택한 티켓 ID·제목을 로그로 출력하고, tickets.md에서 해당 티켓을 `[~]` In Progress로 이동(Ticket Auto-Claim).

## Step 2 — 브랜치

```bash
git rev-parse --abbrev-ref HEAD
```

현재 `main`이면 티켓용 브랜치를 만든다:

```bash
git switch -c ass-{번호}-{슬러그}
```

이미 티켓 브랜치 위면 그대로 사용.

## Step 3 — Pre-check

`/pre-check`를 실행한다 (DS 토큰·UX 라이팅·버튼·파일 크기·Assembler 객체 연결 무결성).

- ❌ 항목이 자동 해소 가능(토큰 교체·카피 수정 등)하면 구현 단계에서 함께 처리.
- 정책 판단이 필요한 ❌이면 → STOP + 알림.

## Step 4 — 구현

`/multi-team ASS-{번호}`로 위임한다. multi-team이 위험도로 모드를 자동 선택(기본 순차 릴레이: A 구현 → B·C 리뷰 → 반영). 관점 정의: `.claude/rules/team-perspectives.md`.

티켓이 새 기능·UX 변경이면 multi-team 진입 전 `howcloud-design` UX 검증을 먼저 한다.

## Step 5 — 빌드 게이트 (HARD STOP)

```bash
npx tsc --noEmit && npm run lint && npm run build
```

- 통과 → Step 6.
- 실패 → 정확한 에러 출력을 구현 에이전트(howcloud-fe/be)에 전달 → 수정 → 재시도. **누적 2회** 초과 시 STOP + 알림(마지막 에러 요약 첨부).

## Step 6 — QA

`/cross-check`를 실행한다 (code-reviewer + howcloud-qa 독립 병렬, API 변경 시 howcloud-be 추가).

- **PASS / CONDITIONAL PASS** → Step 7. (CONDITIONAL의 HIGH 항목은 PR 본문에 명시.)
- **FAIL(CRITICAL)** → CRITICAL을 구현 에이전트에 전달 → 수정 → Step 5(빌드 게이트)부터 재시도. **누적 2회** 초과 시 STOP + 알림(CRITICAL 목록 첨부).

## Step 7 — 완료 + PR (여기서 STOP)

1. tickets.md의 해당 티켓을 `[x]` + 완료 날짜로 갱신, 한 줄 결과 메모 추가.
2. `/commit` 실행 (conventional commits, 커밋 메시지 끝에 Co-Authored-By 라인).
3. `git push -u origin ass-{번호}-{슬러그}`.
4. `/pr` 실행 — `gh pr create`로 PR 생성. 본문에 변경 요약 + cross-check 판정(CONDITIONAL이면 HIGH 항목) + 테스트 방법.
5. **여기서 멈춘다.** merge·배포는 하지 않는다.

## Step 8 — 결과 알림

`PushNotification`으로 보고:
- 성공: `autopilot ✅ ASS-{번호} — PR {URL}`
- STOP: `autopilot ⏸ ASS-{번호} — {사유}` (고위험/빌드 2회 실패/QA 2회 실패/정책 판단 필요 등)

무인 구동(`/loop`·cron)이면 이 알림이 유일한 추적 경로다 — 반드시 남긴다.

---

## 결정론을 높이려면 (선택)

QA·리뷰 병렬 구간을 더 결정론적으로 돌리고 싶으면 Step 6을 `/cross-check` 대신 **Workflow 툴**로 팬아웃한다 (code-reviewer·howcloud-qa·howcloud-be를 `parallel`로 스폰 → 판정 취합). 기본은 `/cross-check` 재사용.

입력: $ARGUMENTS
