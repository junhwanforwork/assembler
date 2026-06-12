---
paths:
  - "src/lib/types/**"
  - "src/lib/prompts/**"
---

# Assembler Mapping Rules

## Origin

Assembler에서 가장 중요한 객체는 **Mapping**이다. 와이어프레임을 "그림"으로만 그리면
디자이너·기획·개발이 같은 화면을 봐도 "이 버튼을 누르면 실제로 뭐가 일어나는지" 합의가 안 된다.
Mapping은 모든 UI Element를 **동작 → API → DB → 상태변화 → 결과**로 강제 연결해 그 공백을 없앤다.

---

## 핵심 질문 5가지

모든 UI Element는 반드시 답해야 한다:

1. 사용자가 상호작용하면 **무엇이 일어나는가?** (Action)
2. **어떤 API**가 호출되는가? (`apiIds`)
3. **어떤 Database**가 영향받는가? (`databaseIds`)
4. **어떤 상태 변화**가 생기는가? (state 전환)
5. 사용자는 **무엇을 보는가?** (`result`)

답이 빈 UI Element = 미완성. 장식 요소(순수 텍스트/구분선)도 `result: none`을 명시한다.

---

## 체인 표기 (단일 흐름)

```
Email Input
  ↓
Submit Button   (Action: Click)
  ↓
POST /signup    (Api)
  ↓
users           (Database)
  ↓
User Created    (상태 변화)
  ↓
Navigate Complete Page   (Result)
```

- 위→아래 = 인과 순서. 각 줄은 실제 객체(id 참조)여야 한다.
- 분기(성공/실패)는 두 갈래로: `→ Success: Navigate` / `→ Error: 인라인 에러 노출`.

---

## 카디널리티

- 한 UI Element는 **복수 API**를 호출할 수 있다(N:N). 예: 제출 시 검증 API + 생성 API.
- 한 UI Element는 **복수 Database**에 영향 가능(N:N).
- 한 API는 여러 UI Element가 트리거할 수 있다 → API의 `triggeredByElementIds`는 **역참조(파생)**.

---

## Result 종류

| Result | 의미 |
| --- | --- |
| `navigate(pageId)` | 다른 Page로 이동 → **UserFlow edge로도 표현**(flow.md) |
| `stateChange` | 같은 화면의 상태 전환(예: Loading→Success) |
| `toast` / `inlineError` | 피드백 노출 |
| `none` | 장식 요소(결과 없음) — 명시 필수 |

`navigate` 결과는 반드시 대응하는 **UserFlow edge**(`fromPageId`=현재 Page, `triggerElementId`=이 Element)를 만든다 → 그래프 일관성.

---

## 작성 스타일

- 명사구·직접 동작. "사용자는 버튼을 눌러 가입할 수 있습니다"(X) → `Submit Button / Action: Click / Api: POST /signup / Result: Create User`(O). 상세: `content-style.md`.
