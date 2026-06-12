---
description: 현재 브랜치의 변경사항을 main 대비 종합 코드 리뷰한다.
---

현재 브랜치의 변경사항을 main 대비 종합 코드 리뷰한다.

## Step 1 — 범위 확인

```bash
git diff main...HEAD --stat
git diff main...HEAD
```

변경 없으면 "리뷰할 변경사항 없음" 출력 후 종료.

## Step 2 — code-reviewer 에이전트 호출

`code-reviewer` 에이전트를 호출해 변경된 파일 전체를 분석한다.

에이전트가 반환한 리포트에서 **CRITICAL / HIGH** 항목을 추출한다.

## Step 3 — Fix-First

CRITICAL / HIGH 항목 중 기계적으로 수정 가능한 것은 직접 수정한다:

- 보안 취약점 (RLS 우회, env 노출)
- TypeScript `any`, 부동 Promise
- 빈 catch 블록, 에러 미반환 API 라우트
- howcloud 규칙 위반 (하드코딩 색상, 버튼 텍스트)

수정 불가능하거나 판단이 필요한 항목은 리포트에 남긴다.

## Step 4 — code-simplifier 에이전트 호출

Step 3에서 수정된 파일을 대상으로 `code-simplifier` 에이전트를 호출해 코드를 다듬는다.

수정된 파일이 없으면 이 단계는 건너뛴다.

## Step 5 — 최종 리포트 출력

```
## 코드 리뷰 결과

### 자동 수정됨
- (수정한 항목 나열)

### Critical
- (남은 항목)

### High
- (남은 항목)

### Medium
- (있으면 나열)

### howcloud 규칙 준수: ✅ / ⚠️ / ❌

### 총평
```

$ARGUMENTS
