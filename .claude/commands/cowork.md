자율 제품 개발 루프를 실행한다 (감독형 — 사람이 보면서 아이디어→완료).
아이디어(자연어) 또는 기존 티켓 ID(예: `ASS-016`)를 입력받는다.

티켓 정본은 `memory/tickets.md`
(`/Users/junhwanlim/.claude/projects/-Users-junhwanlim-Projects-assembler/memory/tickets.md`),
시리즈는 ASS-*. 무인 자동 루프가 필요하면 `/autopilot`(PR-stop)을 쓴다 — 설계: `docs/specs/automation-cycle.md`.

---

## 입력 판단

`$ARGUMENTS`가 티켓 ID(`ASS-###`)이면 → **티켓 실행 모드**
그 외 자연어 설명이면 → **아이디어 모드**

---

## 아이디어 모드

### Step 1 — assembler-pm: 티켓 생성

아래를 순서대로 수행한다.

1. `memory/tickets.md` 읽어 다음 ASS-### ID와 적절한 Phase 위치 확인
2. `CLAUDE.md`의 Product 섹션·카디널 룰 읽기
3. 필요 시 WebSearch로 UX 레퍼런스 리서치 (쿼리: `"[기능명] UX pattern best practice"`)
4. 티켓 한 줄을 작성 — 형식은 tickets.md 기존 항목과 동일:
   `- [ ] ASS-### 제목 — 핵심 요지·DoD·고위험 마커(⚠ 해당 시)`
5. 해당 Phase 아래에 추가

티켓 작성 후 출력:

```
티켓 생성: ASS-### {제목}
Phase: {phase}
위험도: 일반 / ⚠ 고위험({사유})

이 티켓으로 진행할까요? (YES / 수정 사항 말해줘)
```

사용자 승인 후 → **티켓 실행 모드**로 진행.

---

## 티켓 실행 모드

### Step 2 — assembler-pm: 트랙 판단

티켓 내용으로 Full Cycle / Fast Track 판단 (`/route` 기준 동일).
실행 계획 출력 후 진행. tickets.md에서 해당 티켓을 `[~]` In Progress로 이동.

### Step 3 — 구현: `/multi-team` 위임

구현은 `/multi-team ASS-###` 로 실행한다. multi-team이 티켓 위험도로 모드를 자동 선택한다:

```
순차 릴레이 (기본)  : A(실용) 구현 → B(안정)·C(구조) 관점 리뷰·토론 → 구현자 개선
병렬 3팀 (고위험)   : 결제·보안·RLS/스키마·생성 그래프 무결성 → 셋이 독립 구현 → 심판 베이스+패치
fast floor          : 오탈자·1줄·단일 토큰 → 단일 개발
```

- Full Cycle 티켓(새 기능·UX 변경·스키마)이면 multi-team 진입 전 `assembler-design`으로 UX 검증을 먼저 한다.
- 관점 정의·보드: `.claude/commands/multi-team.md`, `.claude/rules/team-perspectives.md`

### Step 4 — 빌드 게이트 (HARD STOP)

QA 진입 전에 반드시 실행:

```bash
npx tsc --noEmit && npm run lint && npm run build
```

**하나라도 실패하면 STOP.** QA로 넘기지 않는다.
실패 시: 정확한 에러 출력을 구현 에이전트(assembler-fe/be)에 전달 → 수정 후 Step 4 재시도.

이유: 빌드가 깨진 코드를 QA하는 건 의미가 없다. 빌드 게이트는 QA 비용을 아끼는 가장 빠른 방법이다.

### Step 5 — QA: `/cross-check` (독립 병렬)

`/cross-check`를 실행한다 — code-reviewer + assembler-qa가 **독립적으로 병렬** 검토(API 변경 시 assembler-be 추가).

**중요:** QA 에이전트는 구현 단계의 결정·이유를 전달받지 않는다. 독립적으로 판단한다.
전달하는 것: 변경된 파일 범위(`git diff main...HEAD`)만. 전달 안 함: 설계 결정·"이렇게 했으니 맞다"는 전제·트레이드오프.

판정: PASS / CONDITIONAL PASS / FAIL (cross-check 기준).

### Step 6 — assembler-pm: 루프 판단

**루프 종료 (모두 충족 시)**

- 티켓의 모든 완료 조건(DoD) 충족
- cross-check 판정 PASS 또는 CONDITIONAL PASS
- 빌드 통과

**루프 계속 (하나라도)**

- cross-check FAIL (CRITICAL 존재)
- 미완성 DoD
- 새 버그 발견

루프 계속 시 → CRITICAL/미완 항목을 구현 에이전트에 전달 → Step 3으로 복귀.

### Step 7 — 완료 처리

루프 종료 시:

1. tickets.md에서 해당 티켓을 `[x]` + 완료 날짜 + 한 줄 결과 메모로 갱신
2. `/commit` 실행
3. (선택) PR이 필요하면 `/pr`. 세션 마감 시 `/checkout`으로 sessions.md 기록·동기화
4. 완료 요약 출력:

```
✅ ASS-### 완료
구현 파일: [목록]
커밋: [해시]
다음 추천: tickets.md 다음 [ ] todo
```

---

## 중단 조건

아래 상황에서 루프를 멈추고 사용자에게 보고:

- 3회 루프 후에도 cross-check PASS 안 될 때
- DB 스키마 변경이 필요한데 마이그레이션 승인이 없을 때 (CLAUDE.md Known Issues)
- 정책 결정이 필요한 모호한 케이스

입력: $ARGUMENTS
