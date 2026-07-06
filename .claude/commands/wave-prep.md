웨이브 착수 준비를 실행한다 (오케스트레이터 전용). tickets.md의 레인 배정 → 고정 레인 슬롯에 브랜치·패킷 하달 → 보고 워처 가동까지 한 번에. **사용자 복붙·중계 0이 원칙** — 창구는 각 레인 워크트리의 `PACKET.md`(하달)·`REPORT.md`(보고) 파일이다.

티켓 파일: `memory/tickets.md` · 편성 기준: `docs/specs/roadmap-milestones.md` · 운영 모델: 사용자 메모리 multi-terminal-orchestration

## Step 0 — 전제 확인 (하나라도 실패하면 중단·보고)

1. **오케스트레이터 세션인가** — cwd가 메인 폴더(`/Users/junhwanlim/Projects/assembler`)여야 한다. 워크트리 안이면 이 스킬 실행 금지.
2. **main 상태** — `git status`(clean), `git fetch origin main` 후 원격과 동기 여부. 미커밋·미머지 잔여가 있으면 먼저 수습. 지난 웨이브의 보존 잔여물(머지 완료된 티켓 브랜치·`integrate/wave-*`·`wave-*-pre` 태그)은 여기서 안전 삭제(`-d`, ff 확인 후).
3. **레인 슬롯 확인** — 레인 워크트리는 **고정 슬롯** `.claude/worktrees/lane-{1..N}`(웨이브마다 만들고 지우지 않는다 — 레인 터미널이 계속 열려 있는 전제). `git worktree list`로 현존 슬롯을 세고, 사용자가 말한 레인 수보다 부족하면 생성:
   ```bash
   git worktree add .claude/worktrees/lane-N -b lane-N-idle main
   cp .env.local .claude/worktrees/lane-N/.env.local   # 없을 때만
   ```
4. **웨이브 정당성** — tickets.md In Progress에 `[레인 N]` 배정이 있어야 한다. 없으면 편성부터: **roadmap-milestones.md 탈출 조건에 기여하는 티켓만** 편성한다(백로그 소진은 사유 아님, 레인 최대 3, 파일 비겹침 기준).

## Step 1 — 레인 파싱

In Progress의 `[레인 N]`·`[레인 N, XXX 후속]` 표기로 레인 구성을 만든다. 후속 티켓은 같은 패킷에 "완료 후 착수 (순차)"로 묶는다.

## Step 2 — 탐사 (패킷 정밀도)

Explore 에이전트로 각 티켓의 관련 파일 경로·export·계약(요청/응답 shape)·참고 라인을 수집한다. 패킷에 추측 금지 — 실제 코드 기준(diagnose-before-change).

## Step 3 — 파일 소유 설계

레인별 "파일 소유(이 밖 수정 금지)" 명단을 만들고 상호 배타인지 검증한다. 겹치면: 겹침 면적이 작은 쪽을 뒤 머지 순서로 지정하고 오케스트레이터 메모에 기록. 공유 문서(editor-interactions.md 등) 갱신은 레인에서 제외하고 통합 몫으로.

## Step 4 — 레인 슬롯에 티켓 브랜치 하달

워크트리는 이미 있다(고정 슬롯). 각 레인 슬롯 안에서 티켓 브랜치만 만든다:

```bash
git -C .claude/worktrees/lane-N switch -c <ticket-slug> main   # 슬롯은 idle 브랜치 상태였음
ls .claude/worktrees/lane-N/.env.local || cp .env.local .claude/worktrees/lane-N/.env.local
```

이전 웨이브의 REPORT.md(+.seen)·.lane-ack(+.seen) 잔재가 있으면 삭제. **PACKET.md는 새 패킷 Write로 덮어쓴다(선삭제 금지)** — 레인의 패킷 워처가 내용 해시 변화로 새 웨이브를 감지하므로, 삭제→재생성 사이 빈 파일 순간을 만들지 않는 게 안전하다. 슬롯이 클린인지(`git -C … status`) 확인 — 더럽면 중단·보고.

## Step 5 — 패킷 하달 (파일 창구 — 복붙 금지)

레인마다 아래 템플릿으로 패킷을 **`.claude/worktrees/lane-N/PACKET.md`로 Write**한다(채팅 코드블록 출력 금지. PACKET/REPORT는 .gitignore+info/exclude 등재라 레인 git status를 더럽히지 않는다).

**레인 기동 안내(둘 중 하나):** 직전 웨이브를 마친 레인 세션은 자기 패킷 워처(lane-start Step 4)가 돌고 있어 **자동으로 깨어나 착수한다 — 사용자 타이핑 불필요.** 워처가 없는 레인(첫 웨이브·/clear 직후·터미널 새로 엶)만 사용자에게 안내: **"레인 N 터미널에서 `/lane` 해주세요"** (`/lane` = 상태 무관 안전 복구 — 정체성 자동 감지 후 작업 재개/대기 라우팅). 착수 여부는 Step 6 워처가 `.lane-ack`으로 자동 확인하므로, 하달 후 일정 시간(~5분) ack이 없는 레인만 사용자에게 수동 기동을 요청한다.

웨이브 중 추가 지시가 생기면 해당 PACKET.md에 `## 추가 지시` 섹션으로 append한다 — 레인이 작업 중이면 완료 직전 재확인하고, 보고 후 대기 중이면 패킷 워처가 해시 변화로 깨어나 이행한다. **보고 후 대기 중인 레인에 추가 지시를 내릴 땐 append 전에 그 레인의 REPORT.md(+.seen)를 삭제**한다(lane-start Step 1의 "REPORT 있으면 중단" 가드 해제 + 새 완료 신호 공간 확보).

패킷 템플릿:

```
[착수 패킷 · 레인 N · X차 웨이브] <티켓> <제목> (후속 있으면 "→ 완료 후 <티켓>" 명시)

너는 레인 작업 세션이다. 이 워크트리(브랜치 <ticket-slug>)에서만 작업한다. 로컬 커밋은
자유, push·merge·tickets.md 수정·DB 적용은 오케스트레이터 독점이라 금지다.
워크트리에 이미 커밋이 있으면(세션 재시작 등) 그 내용을 검증하고 이어서 진행한다.

── <티켓> · <제목> ──
- (티켓 명세 — Step 2 탐사 기반 파일:라인·계약 포함. BE·로직이면 "TDD — 실패 테스트 먼저" 명시.
   DB 마이그레이션이 나오면 "작성까지만 — 적용은 오케스트레이터" 명시.)
- 파일 소유(이 밖 수정 금지): <명단>
- ⚠ 보안: 크레덴셜(세션 id·API 키·토큰·DB 접속정보)은 어떤 산출물(문서·커밋·스크린샷)에도
  기재 금지 — 필요하면 로컬 .env.local에만. (6차 CRITICAL 재발 방지)

/goal End: <티켓들> 완료(TDD 증거 포함) + REPORT.md 작성. Verification: npx tsc --noEmit ·
npm run lint · npm test · npm run build 출력 첨부 + e2e 닿으면 0 failed (크로스체크는
오케스트레이터가 수행 — 레인에서 돌리지 않는다). Constraints: 파일 소유 범위 밖 수정 금지 ·
push·merge·tickets.md·DB 적용 금지 · 테스트 삭제 금지. Turn limit: 40턴 또는 같은 단계
2회 연속 실패 시 중단하고 REPORT.md에 상태=중단으로 보고.
```

## Step 6 — 보고 워처 가동 (자동 수거)

패킷 하달 직후 백그라운드 워처를 켠다 — **`.lane-ack` 생성 = 착수 신호, REPORT.md 생성 = 완료 신호**이며, 워처 종료로 오케스트레이터가 자동 재개되므로 사용자가 착수·완료를 중계할 필요가 없다:

```bash
# run_in_background로 실행. 새 REPORT.md 또는 .lane-ack이 나타나면 경로를 찍고 종료한다.
# (글롭 대신 find — zsh에서 매치 0이면 글롭이 에러가 된다)
while true; do
  f=$(find .claude/worktrees -maxdepth 2 \( -name REPORT.md -o -name .lane-ack \) 2>/dev/null | while read -r p; do [ ! -f "$p.seen" ] && echo "$p" && break; done)
  [ -n "$f" ] && echo "SIGNAL: $f" && exit 0
  sleep 20
done
```

워처가 깨우면 신호 종류로 분기:
- **`.lane-ack`(착수)**: `touch <경로>.seen` → "레인 N 착수 확인" 기록만 하고 → 워처 재가동. (크로스체크 없음)
- **`REPORT.md`(완료)**: ① 해당 REPORT.md 읽기 → ② `touch <경로>.seen`(중복 감지 방지, .seen도 exclude 대상) → ③ **그 레인 크로스체크(code-reviewer + assembler-qa 병렬) 즉시 발사** → ④ 남은 신호(미착수 레인·미완료 레인)가 있으면 워처 재가동. 전 레인 수거 + 크로스체크 blocker 0이면 사용자에게 `/wave-integrate` 승인 요청.

## Step 7 — 오케스트레이터 메모 출력

- 레인 간 겹침·머지 순서 계획
- 통합 시 오케스트레이터가 할 일(마이그레이션 적용+스모크, 공유 문서 갱신, 크로스체크 LOW 정정류 등)
- tickets.md 착수 반영 커밋 여부(미커밋이면 커밋 제안)
