웨이브 통합을 실행한다 (오케스트레이터 전용). 레인 완료 보고 수신 후: 검증 → 머지 → 게이트 → 스모크 → 보안 리뷰 → 티켓 동기화 → 정리. push는 마지막에 승인 요청.

티켓 파일: `memory/tickets.md` · 함정 노트: CLAUDE.md Known Issues (RPC fail-open · Turbopack stale · pkill 금지)

## Step 0 — 레인 검증

각 워크트리에서 `git status --short`(clean이어야 함) + `git log --oneline main..HEAD`(커밋 존재). 미커밋 잔여·커밋 0이면 해당 레인 중단·보고. 레인 보고서의 "오케스트레이터 판단 필요" 항목(티켓 편차 등)을 먼저 판정하고 결과를 기록한다.

## Step 1 — 안전장치 + 통합 브랜치에서 머지

**main에 직접 머지 금지.** 게이트 실패로 중단돼도 main이 어정쩡한 상태로 남지 않게, 통합은 전용 브랜치에서 끝낸다:

```bash
git tag wave-<N>-pre main          # 원복 앵커 — git reset --hard wave-<N>-pre 한 방이면 복구
git checkout -b integrate/wave-<N> main
git merge --no-ff <레인 브랜치> -m "merge: 레인 N — <티켓> <요약>"   # 겹침 없는 레인 먼저, 겹치는 레인 마지막
```

**충돌 시 = 승인 게이트.** 해소안을 만들되 **커밋하지 말고** 사용자에게 제시: 충돌 파일별로 양쪽 레인의 의도 + 제안 해소 diff + 대안. 승인 후에만 머지 커밋(문법이 맞으면 게이트가 못 잡는 의미 충돌이 있으므로, 해소 판단은 자동화하지 않는다). 한쪽 버리기 금지, 해소 후 충돌 마커 grep 0건 확인.

## Step 2 — 통합 게이트 (전부 통과해야 다음)

```bash
npx tsc --noEmit && npm run lint && npm test && npm run build && npx playwright test
```

- e2e 웹서버가 못 뜨면 포트 3000 점유 확인 — **assembler 경로의 next-server만 PID 정밀 kill**(광범위 pkill 금지).
- 하드코딩 hex 0건 검증(ds-tokens.md의 grep).

## Step 3 — 실 DB 스모크 (해당 시 필수)

이번 웨이브에 라우트 추가·rate limit·RPC 인자 관련 변경이 있으면 모킹 테스트만으로 통과 처리 금지(2026-07-02 챗 사고):

1. 레인이 마이그레이션을 동봉했으면 → **DB 적용은 승인 게이트** — 사용자 승인 후 적용.
2. dev 서버 기동 → 유효 UUID x-session-id로 실제 curl 스모크(대상 경로의 정상 + 가드 응답 — 예: 429·409). 스모크 데이터는 이름에 "(삭제 가능)" 명시하고 종료 시 SQL로 정리(승인 하에).
3. dev 서버 종료(정밀 kill).

## Step 4 — 보안 리뷰 (push 예정 diff 전체)

code-reviewer 에이전트 보안 우선 모드로 `git diff origin/main...HEAD` 분석. **CRITICAL/HIGH = fix-first**(해소 전 push 금지). MEDIUM/LOW = 티켓화만 — 중단 규칙상 현 웨이브에 자동 편입 금지.

## Step 5 — tickets.md 동기화 + 잔여 처리

- 완료 티켓 → Done(머지 해시·편차 승인 사유 명기), 레인 발견·리뷰 발견은 티켓 신설(마일스톤 층에 맞게 배치).
- 오케스트레이터 몫 잔여 처리: 공유 문서 갱신(editor-interactions 상태 열 등)·TS 토큰 미러·1줄 정정류 → 통합 커밋에 포함.
- `chore(integrate): X차 웨이브 마감 — <요약>` 커밋 (통합 브랜치에서).

## Step 6 — main 반영 + 정리 (게이트·리뷰 전부 통과했을 때만)

```bash
git checkout main && git merge --ff-only integrate/wave-<N>   # ff-only — main이 움직였으면 실패하고 멈춘다
git worktree remove .claude/worktrees/<slug>
```

- **레인 브랜치·`integrate/wave-<N>`·`wave-<N>-pre` 태그는 push 승인 완료까지 삭제하지 않는다** — 원복 경로 보존. 삭제(`git branch -d` + `git tag -d`)는 push 성공 후 또는 다음 `/wave-prep`의 Step 0에서.
- 중간에 어떤 단계든 실패하면: main은 손대지 않은 상태 그대로 — 통합 브랜치만 두고 중단·보고. 원복이 필요하면 `git reset --hard wave-<N>-pre`(통합 브랜치에서).

## Step 7 — 보고 + push 승인 요청

통합 결과 보고(게이트 수치·충돌 해소 내역·판단 사항·신설 티켓) 후 **push는 실행하지 말고 승인 요청**. 승인 시 `/safe-push` 경유. roadmap-milestones.md의 현 단계 탈출 조건 충족 여부를 판정해 다음 단계를 안내한다.
