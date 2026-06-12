---
description: 보안 검토 후 커밋 + push. push 전에 반드시 이 커맨드를 사용한다.
---

push 전 종합 보안·코드 리뷰를 수행하고, 통과 시 커밋 + push한다.

## Step 0 — 변경사항 확인

```bash
git status
git diff --stat
git diff main...HEAD --stat
```

변경 없으면 "push할 변경사항 없음" 출력 후 종료.

## Step 1 — TypeScript 빌드 체크

```bash
npx tsc --noEmit 2>&1 | head -50
```

타입 에러가 있으면 목록을 출력하고 **즉시 수정**한다. 수정 후 다시 체크.

## Step 2 — 보안 리뷰 (code-reviewer 에이전트)

<!-- TODO: howcloud-security 전용 에이전트 신설 후 교체. 지금은 code-reviewer 가 보안 항목까지 커버한다. -->

`code-reviewer` 에이전트를 호출해 `git diff main...HEAD` 전체를 분석한다. 호출 시 보안 우선 모드 요청.

분석 항목:

- RLS 정책 우회 가능성
- API 라우트 인증 누락
- XSS / SQL Injection 벡터
- 환경변수 / 시크릿 노출
- 클라이언트에 서버 전용 키 노출 (`SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY` 등)
- `any` 타입으로 인한 런타임 보안 홀

결과를 CRITICAL / HIGH / MEDIUM / LOW 로 분류해서 출력한다.

## Step 3 — Fix-First

CRITICAL / HIGH 항목은 push 전에 반드시 수정한다.

수정 불가능하거나 의도된 동작이라면 이유를 명시적으로 출력하고 사용자에게 확인을 구한다.

## Step 4 — 커밋 메시지 작성

`git diff --cached` + `git diff` 전체 변경사항을 분석해 커밋 메시지를 작성한다.

- 형식: `type(scope): 설명` (conventional commits)
- type: `feat` · `fix` · `refactor` · `chore` · `docs` · `test`
- 설명은 **왜** 바꿨는지 중심으로 (what 금지)
- 15자 내외 한국어 허용

커밋 메시지를 사용자에게 먼저 보여주고 승인 받는다.

승인되면:

```bash
git add -p  # 또는 명시적 파일 스테이징
git commit -m "..."
```

## Step 5 — Push

```bash
git push origin $(git branch --show-current)
```

push 완료 후:

```
브랜치: <브랜치명>
커밋: <커밋 해시>
보안 검사: ✓ 통과
push: ✓ 완료
```

를 출력하고 종료한다.

---

## 중단 조건

다음 상황에서는 push 없이 중단하고 사용자에게 알린다:

- TypeScript 빌드 에러 수정 불가
- CRITICAL 보안 이슈 미해결
- 사용자가 커밋 메시지 승인 거부
- main 브랜치에 직접 push 시도 (경고 후 확인 요청)

$ARGUMENTS
