지난 7일(기본값)의 커밋 히스토리를 분석하고 엔지니어링 회고를 생성한다.

## 기간 설정

- 기본: 최근 7일
- `retro 14d` → 14일
- `retro 30d` → 30일

기간 시작일 = 오늘 00:00:00 기준으로 계산 (상대적 시간 아님)

## Step 1 — 데이터 수집

```bash
# 커밋 목록 (기간 내)
git log --oneline --since="7 days ago" --format="%h %ad %s" --date=short

# 변경 규모
git log --since="7 days ago" --shortstat

# 커밋 유형 분포
git log --since="7 days ago" --format="%s" | grep -oE "^(feat|fix|chore|refactor|docs|test|style):" | sort | uniq -c | sort -rn

# 가장 많이 변경된 파일 (핫스팟)
git log --since="7 days ago" --name-only --format="" | sort | uniq -c | sort -rn | head -10

# 브랜치별 작업
git log --since="7 days ago" --format="%D" | grep -v "^$" | head -20
```

## Step 2 — 지표 계산

| 지표           | 값  |
| -------------- | --- |
| 총 커밋 수     |     |
| 추가된 줄 (+)  |     |
| 삭제된 줄 (-)  |     |
| 변경된 파일 수 |     |
| feat: 커밋     |     |
| fix: 커밋      |     |
| 하루 평균 커밋 |     |

## Step 3 — 핫스팟 분석

가장 많이 수정된 파일 Top 5를 분석한다:

- 왜 이 파일이 자주 변경됐는가?
- 불안정한 추상화, 버그 핫스팟, 활발한 개발 중?

## Step 4 — 잘한 점 & 개선 점

**잘한 점** (실제 커밋에서 근거를 찾아 구체적으로):

- 특정 기능 완료
- 버그 수정
- 코드 품질 개선

**개선 기회**:

- 핫스팟 파일 리팩토링 필요성
- 테스트 커버리지 부족한 영역
- CLAUDE.md 규칙 위반 패턴

## Step 5 — 다음 주 우선순위

현재 howcloud 상태(`CLAUDE.md`, git 히스토리)를 바탕으로 다음 주 작업 우선순위 Top 3를 제안한다.

## 출력 형식

```
## howcloud 주간 회고 — [날짜 범위]

### 지표
[표]

### 핫스팟
[분석]

### 잘한 점
[구체적 커밋 기반]

### 개선 기회
[구체적 근거 포함]

### 다음 주 우선순위
1. ...
2. ...
3. ...
```

기간: $ARGUMENTS
