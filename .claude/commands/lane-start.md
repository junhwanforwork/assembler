레인 착수를 실행한다 (**레인 세션 전용**). 워크트리 루트의 `PACKET.md`(오케스트레이터가 /wave-prep으로 발급)를 읽고 그 명세대로 즉시 착수한다.

## Step 0 — 자기 위치 확인

cwd가 `.claude/worktrees/<slug>` 안이 **아니면**(= 메인 폴더 = 오케스트레이터 터미널) 즉시 중단 — "이 스킬은 레인 세션 전용이에요. 오케스트레이터는 /wave-prep·/wave-integrate를 쓰세요." 안내.

## Step 1 — 패킷 로드

워크트리 루트의 `PACKET.md`를 읽는다.

- **없으면 중단**: "착수 패킷이 없어요 — 오케스트레이터 세션에서 /wave-prep으로 발급해 주세요." 안내. (참고용으로 `memory/tickets.md` In Progress의 `[레인 N]` 맥락 블록은 읽어서 요약해 줄 수 있으나, **착수는 패킷 없이 하지 않는다** — 파일 소유 경계·/goal이 패킷에만 있다.)
- 있으면 패킷의 티켓·브랜치가 현재 워크트리 브랜치(`git branch --show-current`)와 일치하는지 확인. 불일치 = 낡은 패킷 → 중단·보고.

## Step 2 — 제약 리마인드 + 착수

착수 전 아래를 한 번 출력한다:

1. 티켓 · 브랜치 · 파일 소유 범위(이 밖 수정 금지)
2. 금지 목록: push · merge · `memory/tickets.md` 수정 · DB 적용 · 테스트 삭제 (로컬 커밋은 자유)
3. 패킷의 /goal (End · Verification · Constraints · Turn limit)

그다음 **패킷 본문을 그대로 이행한다** — 별도 확인 질문 없이 즉시 작업 시작. TDD 지시가 있으면 실패 테스트 먼저.

## Step 3 — 마감 관례

작업 완료(또는 중단) 시:

- 완료 보고에 Verification 증거(tsc·lint·test·build 출력, cross-check 결과)를 첨부한다.
- `/checkout` 시 `memory/lane-logs/lane-N.md`에 세션 항목 append(날짜·웨이브·한 일·실수노트 — 실수 없었으면 "없음").
- 오케스트레이터 이월 사항(소유 밖 발견·판단 필요)은 보고서에 별도 섹션으로.
