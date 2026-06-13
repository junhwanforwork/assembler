---
paths:
  - "src/components/**"
  - "src/lib/types/**"
---

# Assembler Wireframe Rules

## Origin

와이어프레임을 자유 드로잉으로 두면 각 요소가 "무슨 일을 하는지" 사라지고, 결국 디자인·기획·개발이
서로 다른 걸 상상한다. Assembler의 Wireframe은 **의미를 가진 UI Element들의 집합**으로, 모든 요소가
Mapping(State/Action/API/DB/Result)을 갖도록 강제한다.

---

## Wireframe

- **그림이 아니라 UI Element들의 모음**이다.
- 항상 **Page 소유**(`wireframe.pageId`). Feature에 직접 붙이지 않는다.
- `uiElementIds[]`는 순서를 가진다(세로 스택 렌더).

## UI Element 구조 (필수 필드)

| 필드 | 설명 |
| --- | --- |
| `name` | 명사구. 예: "Submit Button" |
| `description` | 비즈니스 의미 한 줄 |
| `type` | BlockType 10종 — block-catalog 단일 출처 (heading/text/button/text-input/textarea/dropdown/toggle/badge/number-stepper/divider) |
| `props` | 렌더 속성 — block-catalog 스키마 (버튼 label, 입력 placeholder 등) |
| `states[]` | Default / Disabled / Loading / Empty / Error / Negative 중 해당하는 것 |
| `action` | Click / Input / Select / Change / Toggle … |
| `apiIds[]` | API Mapping (N:N) |
| `databaseIds[]` | Database Mapping (N:N) |
| `result` | 상태 변화 / 네비게이션 / 피드백 (mapping.md) |

**모든 UI Element는 비즈니스 의미를 가진다.** 의미 없는 장식은 `result: none` 명시.

## 예시

```
Submit Button
  Description: Creates a new user account.
  Type: button
  Props: { label: "Sign Up", variant: "solid" }
  States: Default · Disabled · Loading
  Action: Click
  API: POST /signup
  Database: users
  Result: Navigate Complete Page
```

---

## 코드 재사용 (구현 메모)

- 기존 `src/components/builder/screen/BlockRenderer.tsx`(블록 → DS 컴포넌트 렌더)와
  `src/lib/types/builder.ts`의 `Block`/`SpecComponent`(상태/동작/결과)는 **UI Element의 표현 레이어로 재사용**한다.
- 즉 `UIElement.type` → BlockRenderer 스위치, `states/action/result` → 기존 SpecComponent 필드에 대응.
- 강등된 드래그 빌더(`palette`/`screen` dnd)는 Wireframe 객체 편집기(컴포넌트 교체)로 재배선(ASS-034).
