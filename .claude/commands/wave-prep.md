웨이브 착수 준비를 실행한다 (오케스트레이터 전용). tickets.md의 레인 배정 → 워크트리 생성 → 착수 패킷 발급까지 한 번에.

티켓 파일: `memory/tickets.md` · 편성 기준: `docs/specs/roadmap-milestones.md` · 운영 모델: 사용자 메모리 multi-terminal-orchestration

## Step 0 — 전제 확인 (하나라도 실패하면 중단·보고)

1. **오케스트레이터 세션인가** — cwd가 메인 폴더(`/Users/junhwanlim/Projects/assembler`)여야 한다. 워크트리 안이면 이 스킬 실행 금지.
2. **main 상태** — `git status`(clean), `git fetch origin main` 후 원격과 동기 여부. 미커밋·미머지 잔여가 있으면 먼저 수습. 지난 웨이브의 보존 잔여물(머지 완료된 레인 브랜치·`integrate/wave-*`·`wave-*-pre` 태그)은 여기서 안전 삭제(`-d`, ff 확인 후).
3. **웨이브 정당성** — tickets.md In Progress에 `[레인 N]` 배정이 있어야 한다. 없으면 편성부터: **roadmap-milestones.md 탈출 조건에 기여하는 티켓만** 편성한다(백로그 소진은 사유 아님, 레인 최대 3, 파일 비겹침 기준).

## Step 1 — 레인 파싱

In Progress의 `[레인 N]`·`[레인 N, XXX 후속]` 표기로 레인 구성을 만든다. 후속 티켓은 같은 패킷에 "완료 후 착수 (순차)"로 묶는다.

## Step 2 — 탐사 (패킷 정밀도)

Explore 에이전트로 각 티켓의 관련 파일 경로·export·계약(요청/응답 shape)·참고 라인을 수집한다. 패킷에 추측 금지 — 실제 코드 기준(diagnose-before-change).

## Step 3 — 파일 소유 설계

레인별 "파일 소유(이 밖 수정 금지)" 명단을 만들고 상호 배타인지 검증한다. 겹치면: 겹침 면적이 작은 쪽을 뒤 머지 순서로 지정하고 오케스트레이터 메모에 기록. 공유 문서(editor-interactions.md 등) 갱신은 레인에서 제외하고 통합 몫으로.

## Step 4 — 워크트리 생성

```bash
git worktree add .claude/worktrees/<ticket-slug> -b <ticket-slug> main
```

레인당 1개, 생성 후 `git worktree list`로 전부 main 최신 커밋인지 확인.

## Step 5 — 패킷 발급

레인마다 아래 템플릿으로 코드블록 출력(사용자는 붙여넣기만). 앞줄에 `cd <워크트리 경로> && claude` 안내.

```
[착수 패킷 · 레인 N · X차 웨이브] <티켓> <제목> (후속 있으면 "→ 완료 후 <티켓>" 명시)

너는 작업 세션이다. 이 워크트리(<브랜치>)에서만 작업한다. 로컬 커밋은 자유,
push·merge·tickets.md 수정·DB 적용은 오케스트레이터 독점이라 금지다.

── <티켓> · <제목> ──
- (티켓 명세 — Step 2 탐사 기반 파일:라인·계약 포함. BE·로직이면 "TDD — 실패 테스트 먼저" 명시.
   DB 마이그레이션이 나오면 "작성까지만 — 적용은 오케스트레이터" 명시.)
- 파일 소유(이 밖 수정 금지): <명단>

/goal End: <티켓들> 완료(TDD 증거 포함). Verification: npx tsc --noEmit · npm run lint · npm test · npm run build 출력 첨부 + /cross-check blocker 0 + e2e 닿으면 0 failed. Constraints: 파일 소유 범위 밖 수정 금지 · push·merge·tickets.md·DB 적용 금지 · 테스트 삭제 금지. Turn limit: 40턴 또는 같은 단계 2회 연속 실패 시 중단하고 보고.
```

## Step 6 — 오케스트레이터 메모 출력

- 레인 간 겹침·머지 순서 계획
- 통합 시 오케스트레이터가 할 일(마이그레이션 적용+스모크, 공유 문서 갱신, TS 미러 등)
- tickets.md 착수 반영 커밋 여부(미커밋이면 커밋 제안)
