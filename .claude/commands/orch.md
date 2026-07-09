오케스트레이터 세션의 정체성과 웨이브·레인 실시간 상태를 복구한다 (**오케스트레이터 전용**). `/clear` 직후·새 터미널·"지금 몇 차 웨이브고 어느 레인이 뭐 하는 중이더라"가 헷갈릴 때 진입점. `/lane`의 오케스트레이터판 — **어떤 상태에서든 안전하게** 호출해 스스로 판정·라우팅한다. (`/initiate`가 역할 선택·세션 이어받기라면, `/orch`는 진행 중 웨이브 상태 재구성에 특화.)

## Step 0 — 위치 확인

cwd가 메인 폴더(`/Users/junhwanlim/Projects/assembler`)여야 한다.
- cwd가 `.claude/worktrees/lane-N` 안(= 레인 워크트리)이면 중단: "여기는 레인 N 터미널이에요 — `/lane`을 쓰세요. /orch는 오케스트레이터(메인 폴더) 전용이에요."
- 첫 명령에 `pwd`로 확인(cwd 하이재킹 사고 방지 — CLAUDE.md Known Issues).

## Step 1 — 제약 리마인드

오케스트레이터 역할을 한 줄로: **커밋·머지·push·DB 적용·tickets.md는 오케스트레이터 독점.** 레인은 로컬 커밋·REPORT만. 크로스체크·통합은 오케스트레이터 몫.

## Step 2 — 웨이브·레인 상태 재구성 (읽기 소스)

아래를 읽어 현재 상태를 조립한다(모두 읽기 전용 — 아무것도 안 바꾼다):

1. **현 웨이브 번호·레인 배정** — `memory/tickets.md` In Progress 섹션: `[레인 N]` 배정·오케스트레이터 메모(파일 소유·계약 동결·머지 순서·통합 몫). In Progress가 "(없음 …)"이면 진행 중 웨이브 없음 → Done 최상단 헤딩으로 마지막 완료 웨이브 확인, 다음은 편성(/wave-prep) 단계.
2. **레인별 브랜치** — `git worktree list`: 각 슬롯이 `lane-N-idle`(미하달) vs 티켓 슬러그(하달됨).
3. **레인별 창구 파일** — 각 `.claude/worktrees/lane-N/`의 조합으로 상태 판정(아래 표).
4. **머지 대기·진척** — `git -C .claude/worktrees/lane-N log --oneline main..HEAD`(커밋 수)·`git -C … status --short`(clean 여부)·`git branch --no-merged main`.

레인별 상태 판정표(`/lane` Step 2 로직을 N레인에 적용):

| 창구 파일 조합 | 상태 |
|---|---|
| 브랜치 idle · PACKET 없음 | 미하달(대기) |
| PACKET 있음 · ack 없음 · REPORT 없음 · **커밋 0** | **비착수 의심** (워처 죽음 or 세션 없음 — 아래 ⚠) |
| PACKET 있음 · REPORT 없음 · **커밋 있음 or 미커밋 변경 있음** | 작업 중 |
| PACKET · REPORT 둘 다(.seen 없음) | **완료 — 수거 대기**(크로스체크 발사 대상) |
| PACKET · REPORT · REPORT.md.seen | 수거됨(크로스체크 진행/완료) |

> ⚠ **비착수 의심 처리(항목 4):** `.lane-ack`는 워처 셸이 결정적으로 찍으므로(lane-start Step 4 개정), ack가 없는데 커밋·미커밋 변경도 0이면 그 레인은 **진짜로 안 깨어난 것**(워처 죽음·터미널 닫힘·/clear). 15분 기다리지 말고 즉시 사용자에게 "레인 N 터미널에서 `/lane N` 해주세요" 안내.

## Step 3 — 출력

정체성 한 줄: **"오케스트레이터 — N차 웨이브 진행 중"**(또는 "진행 중 웨이브 없음 — 편성 단계"). 이어서:
- **레인별 상태 표**(레인·브랜치·상태·커밋 수).
- **수거 대기 REPORT 목록** — 있으면 크로스체크 발사 대상으로 명시.
- **비착수 의심 레인** — 있으면 `/lane N` 수동 기동 안내(사용자 몫).
- **context 위생(항목 2 연동):** 같은 레인이 여러 웨이브 연속 가동 중이면(lane-logs로 추정) "레인 K는 다음 하달 전 /clear 권고" 표기.
- **다음 액션**: 수거→크로스체크 / 전 레인 통과→/wave-integrate / 진행 중 없음→/wave-prep 편성.

## Step 4 — 보고 워처 재가동

진행 중 웨이브가 있으면(수거 안 된 REPORT 또는 작업 중 레인) `/wave-prep` Step 6 보고 워처를 `run_in_background`로 재기동한다(`/clear`가 워처를 죽였을 때 복구 — REPORT/`.lane-ack` 자동 감지 사슬 재개). 진행 중 웨이브가 없으면 워처 불필요.
