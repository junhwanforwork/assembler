---
paths:
  - "src/lib/types/**"
  - "src/lib/prompts/**"
---

# Assembler Flow Rules

## Origin

원래 스펙은 "Flows belong to Pages"(Page 내부)만 정의했으나, 실제 UI에는 **전역 User Flow 탭**(Page↔Page 이동)이
필요하다(스크린샷). 둘을 한 개념으로 뭉치면 "이 화면 안에서의 단계"와 "화면 간 이동"이 섞여 그래프가 깨진다.
그래서 Flow를 **두 스코프**로 분리한다.

---

## PageFlow — Page 내부 journey

한 Page 안에서 사용자가 거치는 단계.

```
Page Enter → Input Information → Submit → Success → Navigate
```

| 필드 | 설명 |
| --- | --- |
| `id`, `pageId` | 소유 Page |
| `steps[]` | `{ id, label, nextStepIds[] }` (분기 가능) — `steps[0]` = 진입 단계 |

- 카디널리티: **Page 1 — 1 PageFlow**(선택).
- 마지막 단계의 `Navigate`는 Page를 떠나는 지점 → 대응하는 **UserFlow edge**를 만든다.

## UserFlow — 전역 Page↔Page

프로젝트 전체의 화면 이동 그래프(스크린샷 "User Flow" 탭).

| 필드 | 설명 |
| --- | --- |
| `id` | 프로젝트당 1개 |
| `edges[]` | `{ id, fromPageId, toPageId, triggerElementId?, condition? }` |

- `triggerElementId` = 이동을 일으킨 UI Element(예: Submit Button) → Mapping과 연결.
- `condition` = 조건부 이동(예: "가입 성공 시").
- 카디널리티: **UserFlow N edges**, Page N — N Page.

---

## 두 스코프 연결 규칙

- UI Element의 `result = navigate(toPageId)` → 반드시 UserFlow edge 1개 생성
  (`fromPageId` = 요소가 속한 Page, `triggerElementId` = 그 요소).
- PageFlow의 `Navigate` 단계 → 동일 UserFlow edge로 표현(중복 생성 금지, 같은 edge 참조).
- 즉 **"화면 간 이동"의 단일 출처는 UserFlow edge**. PageFlow와 Mapping은 그 edge를 참조만 한다.

---

## 렌더 (구현 메모)

- UserFlow 뷰는 기존 `src/components/builder/flow/FlowCanvas.tsx`(노드=Page, 엣지=edge)를 재사용(ASS-033).
- PageFlow는 Page 상세 안에서 단계 리스트로 표시.
