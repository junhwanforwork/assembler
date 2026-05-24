자율 제품 개발 루프를 실행한다.
아이디어(자연어) 또는 기존 티켓 파일 경로를 입력받는다.

---

## 입력 판단

`$ARGUMENTS`가 `.md` 파일 경로이면 → **티켓 실행 모드**
그 외 자연어 설명이면 → **아이디어 모드**

---

## 아이디어 모드

### Step 1 — opin-pm: 티켓 생성

아래를 순서대로 수행한다.

1. `docs/backlog/index.md` 읽어 다음 ID 확인
2. `docs/policy/` 관련 파일 읽기
3. WebSearch로 UX 레퍼런스 리서치 (쿼리: `"[기능명] UX pattern best practice 2024"`)
4. `docs/backlog/_template.md` 기반으로 티켓 작성
5. `docs/backlog/todo/OPIN-{id}.md` 저장
6. `docs/backlog/index.md` 업데이트

티켓 작성 후 출력:

```
티켓 생성 완료: docs/backlog/todo/OPIN-{id}.md
제목: {title}
담당: {agents}

이 티켓으로 진행할까요? (YES / 수정 사항 말해줘)
```

사용자 승인 후 → **티켓 실행 모드**로 진행

---

## 티켓 실행 모드

### Step 2 — opin-pm: 에이전트 배정

티켓 frontmatter의 `agents` 필드 읽기.
Full Cycle / Fast Track 판단 (`/route` 기준 동일).
실행 계획 출력 후 즉시 실행 (확인 생략).

### Step 3 — 구현: `/multi-team` 위임

구현은 `/multi-team OPIN-{id}` 로 실행한다. multi-team이 티켓 위험도로 모드를 자동 선택한다:

```
순차 릴레이 (기본)  : A(실용) 구현 → B(안정)·C(구조) 관점 리뷰·토론 → 구현자 개선
병렬 3팀 (고위험)   : 결제·포인트·보안·스키마·P1 → 셋이 독립 구현 → 심판 베이스+패치
fast floor          : 오탈자·1줄·단일 토큰 → 단일 개발
```

- Full Cycle 티켓(새 기능·UX 변경·스키마)이면 multi-team 진입 전 `opin-design`으로 UX 검증을 먼저 한다.
- multi-team이 자체 빌드 게이트(Step 4)와 관점 리뷰를 포함한다. 통과 후 Step 5 QA로 진행.
- 관점 정의·보드: `.claude/commands/multi-team.md`, `.claude/rules/team-perspectives.md`

### Step 4 — 빌드 게이트 (HARD STOP)

QA 진입 전에 반드시 아래 순서로 실행:

```bash
npx tsc --noEmit
npm run lint
npm run build
```

**셋 중 하나라도 실패하면 STOP.** QA로 넘기지 않는다.
실패 시: 구현 에이전트(opin-fe/opin-be)에게 정확한 에러 출력을 전달 → 수정 후 Step 4 재시도.

이유: 빌드가 깨진 코드를 QA하는 건 의미가 없다. 빌드 게이트는 QA 비용을 아끼는 가장 빠른 방법이다.

### Step 5 — opin-qa: QA 리포트 작성 (별도 에이전트 컨텍스트)

**중요:** opin-qa는 구현 단계의 결정과 이유를 전달받지 않는다. 독립적으로 판단한다.

opin-qa에게 전달하는 것:

- 티켓 경로 (`docs/backlog/todo/OPIN-{id}.md`)
- 변경된 파일 목록

전달하지 않는 것:

- 구현 중 내린 설계 결정
- "이렇게 구현했으니 맞다"는 전제
- 구현 과정의 어려움이나 트레이드오프

리포트 저장 경로:

```
docs/backlog/reports/OPIN-{id}-qa.md
```

리포트 포맷은 `docs/backlog/reports/_template.md` 사용.

### Step 6 — opin-pm: 루프 판단

QA 리포트 읽기 → 아래 기준으로 판단:

**루프 종료 조건 (모두 충족 시)**

- 티켓의 모든 완료 조건(Definition of Done) 체크 완료
- QA 리포트의 `result: PASS`
- 빌드 통과

**루프 계속 조건 (하나라도 해당 시)**

- QA 리포트의 `result: FAIL` 또는 `result: PARTIAL`
- 미완성 완료 조건 존재
- 새로운 버그 발견

루프 계속 시 → PM이 후속 티켓 자동 생성 또는 현재 티켓 수정 → Step 3으로 복귀

### Step 7 — 완료 처리

루프 종료 시:

1. `/commit` 실행
2. 티켓 파일을 `docs/backlog/done/` 으로 이동
3. `docs/backlog/index.md` 상태 업데이트
4. 완료 요약 출력

```
✅ OPIN-{id} 완료
구현 파일: [목록]
커밋: [해시]
다음 추천 티켓: [index.md 기준 다음 ready 항목]
```

---

## 중단 조건

아래 상황에서 루프를 멈추고 사용자에게 보고:

- 3회 루프 후에도 QA PASS 안 될 때
- DB 스키마 변경이 필요한데 마이그레이션 승인이 없을 때
- 정책 결정이 필요한 모호한 케이스 발생 시

입력: $ARGUMENTS
