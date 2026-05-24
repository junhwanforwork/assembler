OPINION 버그 트리아지 워크플로우를 실행한다. CLAUDE.md의 Bug Triage Workflow를 반드시 따른다.

## Step 1 — opin-qa: 진단

아래를 정리한다:

- 재현 조건 (어떤 상황에서 발생하는가)
- 근본 원인 분석 (root cause)
- 영향 범위 (어떤 기능/페이지에 영향을 주는가)
- 심각도: Critical / High / Medium / Low
- 담당: FE / BE / 공통

## Step 2 — opin-fe / opin-be: 수정

QA 리포트를 input으로 받아 수정한다:

1. 관련 파일 읽기
2. 최소 수정으로 버그 해결
3. `npx tsc --noEmit` 타입 체크 통과 확인
4. `npm run build` 빌드 통과 확인

## Step 3 — opin-qa: 검증

- 수정 사항이 버그를 실제로 해결했는지 확인
- 회귀(regression) 없는지 주변 기능 확인
- 확인 완료 시 `/commit` 실행

버그 내용: $ARGUMENTS
