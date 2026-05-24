---
description: OPINION AI 프롬프트를 연구 기반 패턴으로 개선한다. prompt-engineer 에이전트를 호출해 지정 엔드포인트의 프롬프트를 분석·개선·적용한다.
---

# improve-prompt

## 사용법

```
/improve-prompt [엔드포인트명]
```

엔드포인트명 생략 시 전체 5개 목록을 제시하고 선택을 받는다.

**예시:**

- `/improve-prompt ai-chat`
- `/improve-prompt analyze`
- `/improve-prompt analysis`
- `/improve-prompt ai-edit-question`
- `/improve-prompt pulse`

---

## 실행 순서

### 1. 대상 확인

인수가 있으면 해당 엔드포인트로 진행.
인수가 없으면 아래 목록을 보여주고 선택받는다:

| 번호 | 엔드포인트         | 파일                                                 |
| ---- | ------------------ | ---------------------------------------------------- |
| 1    | `analyze`          | `src/app/api/analyze/route.ts`                       |
| 2    | `ai-chat`          | `src/app/api/surveys/[id]/ai-chat/route.ts`          |
| 3    | `ai-edit-question` | `src/app/api/surveys/[id]/ai-edit-question/route.ts` |
| 4    | `analysis`         | `src/app/api/surveys/[id]/analysis/route.ts`         |
| 5    | `pulse`            | `src/app/api/pulse/generate/route.ts`                |

### 2. prompt-engineer 에이전트 호출

대상 파일을 읽고 현재 프롬프트를 아래 체크리스트로 평가한다.

**체크리스트:**

```
[ ] XML 시맨틱 태그 사용 (<role>, <rules>, <examples>, <forbidden>)
[ ] Iron Law 포함 (ai-chat, ai-edit-question만 해당)
[ ] Few-shot 예시 ≥ 2쌍, 분포 균형
[ ] Temperature 명시됨
[ ] 추측 언어 없음 (analysis만 해당: "~로 보인다", "아마도")
[ ] Prompt cache 적용 (system이 호출마다 불변인 경우)
[ ] 수치화된 임계값 (모호한 표현 → 구체적 숫자)
[ ] 페르소나 구체적 (단순 "전문가" → 도메인+연차+역할)
```

### 3. 개선안 제시 후 적용

❌ 항목에 대해 개선안을 작성하고 사용자 확인 후 파일에 적용한다.

### 4. 빌드 확인

```bash
npx tsc --noEmit
```

타입 에러 없는지 확인.

### 5. opin-qa 회귀 검증 요청 (선택)

프롬프트 변경이 큰 경우 opin-qa에 아래 케이스 검증을 요청한다:

- 정상 케이스 3개
- 엣지 케이스 2개 (모호한 입력, 빈 입력)
- 변경 전 실패했던 케이스가 있으면 해당 케이스

---

## 패턴 레퍼런스

### XML 시맨틱 태그 구조

```
<role>도메인+연차+역할 한 줄</role>
<iron_law>[ABSOLUTE] 검증 규칙</iron_law>
<output_rules>필드별 출력 규칙</output_rules>
<field_constraints>타입별 제약</field_constraints>
<forbidden>❌ 잘못된 예시</forbidden>
<examples>입력→출력 쌍</examples>
```

### Iron Law 패턴

```
<iron_law>
[ABSOLUTE] JSON 출력 전, [검증 조건]을 확인한다.
[ABSOLUTE] 조건 미충족 시 [대안 행동]한다.
[ABSOLUTE] 검증 없이 출력하지 않는다.
</iron_law>
```

### Few-shot 분포 균형 원칙

- 카테고리별 최소 1쌍
- 정상 케이스 + 엣지 케이스 혼합
- 잘못된 예시(forbidden)와 쌍으로 제시하면 효과 증가

### Temperature 가이드

| 용도                       | Temperature | 이유                 |
| -------------------------- | ----------- | -------------------- |
| JSON 구조 출력, 분류, 수정 | 0.1         | 결정적, 일관성       |
| 설문 생성 (창의성 필요)    | 0.7         | 다양성 확보          |
| 콘텐츠 생성 (Pulse 등)     | 0.8         | 창의성 + 형식 안정성 |

---

## 참고 자료

- 연구 1: 프로덕션 LLM 20가지 패턴 (innovation123.tistory.com/300)
- 연구 2: dair-ai/Prompt-Engineering-Guide (Few-shot, CoT, Reliability)
- OPINION 에이전트 정의: `.claude/agents/prompt-engineer.md`
