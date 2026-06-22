---
paths:
  - "src/lib/types/**"
  - "src/lib/prompts/**"
---

# Assembler Object Model

## Origin

Assembler의 산출물은 문서가 아니라 **연결된 객체 그래프**다. 객체 정의가 흩어지거나 연결이 끊기면
"버튼을 누르면 다음에 뭐가 일어나는가?"에 답할 수 없다. 이 파일은 **모든 객체의 필드·연결·카디널리티의 단일 출처**다.
TS 타입(`src/lib/types/**`)과 생성 프롬프트(`src/lib/prompts/assembler.ts`)는 여기서 파생된다.

---

## 공통 규칙

- 모든 객체는 `id: string` 보유.
- 연결은 **id 참조로만** 한다(객체 중첩 금지) → 그래프 양방향 탐색 가능.
- N:N 연결은 **id 배열**. 역참조("Used By", "Triggered By")는 **파생**(저장하지 않고 조회 시 계산) — 단일 출처 유지.
- **고립 객체 금지**: 모든 객체는 최소 1개 연결을 가진다(루트 `Project` 제외).
- 모든 id 참조는 **존재하는 객체**를 가리켜야 한다(dangling 금지).

---

## Project — 최상위 컨테이너

| 필드 | 설명 |
| --- | --- |
| `id`, `name`, `description` | |
| (파생) `requirementIds[]` | Global Requirements — ProjectGraph 컬렉션에서 계산, 저장 안 함 |
| (파생) `featureIds[]` | Features — ProjectGraph 컬렉션에서 계산, 저장 안 함 |
| (파생) `pageIds[]` | Pages — ProjectGraph 컬렉션에서 계산, 저장 안 함 |
| (파생) `apiIds[]`, `databaseIds[]` | 전역 API/DB 객체 — ProjectGraph 컬렉션에서 계산, 저장 안 함 |
| (파생) `userFlowId` | 전역 User Flow(1개) — ProjectGraph `userFlow`에서 계산, 저장 안 함. 항상 존재(빈 edges 가능) |

직렬화 정본은 `ProjectGraph`(TS) — 컬렉션 배열 순서 = 표시 순서.

Wireframe·PageFlow·UIElement는 Page/Element에 종속 — Project 직속 아님.

## Requirement — WHY (전역)

프로젝트 전체에 영향. 예: "사용자는 가입할 수 있어야 한다."

| 필드 | 설명 |
| --- | --- |
| `id`, `title`, `description` | |
| (파생) `relatedFeatureIds[]` | 이 요구를 충족하는 Feature — `Feature.requirementIds`에서 조회 시 계산, 저장 안 함 |

- 카디널리티: **Requirement 1 — N Feature**.
- 세부 규칙은 Requirement가 아니라 `Feature.businessRules`로 둔다.

## Feature — WHAT

독립적 기능 단위. 예: Sign Up, Pause Subscription. **여러 Page에 걸칠 수 있고 Page와 독립**.

| 필드 | 설명 |
| --- | --- |
| `id`, `name`, `description` | |
| `businessRules[]` | 비즈니스 규칙 |
| `requirementIds[]` | 충족하는 Requirement |
| `pageIds[]` | 관련 Page (N:N) |
| `apiIds[]`, `databaseIds[]` | 관련 API/DB |
| `requiredData[]` | 필수 입력 데이터 (예: ID, 비밀번호) — 요구사항·기능 매트릭스 표 컬럼 (ASS-141) |
| `optionalData[]` | 선택 입력 데이터 — 빈 배열 = 미기재 |

- 카디널리티: **Feature N — N Page**.

## Page — WHERE

사용자 상호작용 장소. 예: Login, Profile, Project Detail.

| 필드 | 설명 |
| --- | --- |
| `id`, `name`, `description` | |
| `featureIds[]` | 이 Page가 구현하는 Feature (N:N) |
| `wireframeId` | 소유 Wireframe (1:1) |
| `pageFlowId?` | Page 내부 Flow |
| `apiIds[]`, `databaseIds[]` | 사용 API/DB |
| `x`, `y` | 캔버스 좌표 — 표현 필드(도메인 아님), AI 미생성·ASS-019 그리드 기본 배치 |
| `device` | 와이어프레임 프레임 폭 프리셋 `mobile`(360)·`tablet`(768)·`desktop`(1024) — 표현 필드(x/y와 동일, AI 미생성·기본 `mobile`). 폭 정본 `DEVICE_WIDTH` (ASS-056) |

- **규칙: Wireframe은 Page만 소유. Feature에 직접 붙이지 않는다.**

## Wireframe — Page 소유

그림이 아니라 **UI Elements의 집합**.

| 필드 | 설명 |
| --- | --- |
| `id`, `pageId` | 소유 Page |
| `uiElementIds[]` | UI Elements (순서 있음) |

- 카디널리티: **Page 1 — 1 Wireframe**, **Wireframe 1 — N UIElement**. 상세: `wireframe.md`.

## UIElement

모든 요소는 비즈니스 의미를 가진다.

| 필드 | 설명 |
| --- | --- |
| `id`, `name`, `description`, `type` | `type`은 BlockType 10종(block-catalog) |
| `props` | 렌더 속성 — block-catalog 스키마 |
| `states[]` | Default/Disabled/Loading/Empty/Error/Negative … |
| `action` | Click/Input/Select/Change … |
| `apiIds[]` | 호출 API (N:N) |
| `databaseIds[]` | 영향 DB (N:N) |
| `result` | 상태 변화 / 네비게이션 결과 — mapping.md 5종 구조화 |

- 상세: `wireframe.md`, `mapping.md`.

## Api — 전역 공유 객체

엔드포인트뿐 아니라 **목적**을 적는다(PM·디자이너·개발자 모두 이해 가능).

| 필드 | 설명 |
| --- | --- |
| `id`, `method`, `path`, `purpose` | `method`는 GET/POST/PUT/PATCH/DELETE 5종 — TS `API_METHODS` 미러 |
| `databaseIds[]` | 사용하는 DB |
| `success`, `error` | 결과 |
| (파생) `triggeredByElementIds[]`, `usedInPageIds[]` | 역참조 |

- 카디널리티: **Api N — N UIElement**, **Api N — N Database**.

## Database — 전역 공유 객체

| 필드 | 설명 |
| --- | --- |
| `id`, `name`(table), `purpose` | `name`은 snake_case 영어 테이블명 |
| `columns[]` | 컬럼 설명 문자열 — 빈 배열 = 미기재 (균질 직렬화) |
| (파생) `usedByFeatureIds[]`, `relatedApiIds[]` | 역참조 |

## PageFlow — Page 내부

Page 안의 사용자 journey. 예: Enter → Input → Submit → Success → Navigate.

| 필드 | 설명 |
| --- | --- |
| `id`, `pageId` | |
| `steps[]` | `{ id, label, nextStepIds[] }` |

- 상세: `flow.md`.

## UserFlow — 전역

Page ↔ Page 네비게이션 그래프(스크린샷의 "User Flow" 탭).

| 필드 | 설명 |
| --- | --- |
| `id` | 프로젝트당 1개 |
| `edges[]` | `{ id, fromPageId, toPageId, triggerElementId?, condition? }` |

- 상세: `flow.md`.

## Mapping — 핵심

UI Element이 "다음에 뭐가?"에 답하는 **연결 그 자체**. 별도 저장 객체가 아니라
`UIElement`의 연결 필드(`apiIds`/`databaseIds`/`result`) + `UserFlow` edge로 표현된다. 상세: `mapping.md`.

## DocLink — 외부 문서 참조 (reference 레이어)

객체가 외부 문서(정책서·API 스펙·디자인·티켓)를 가리키는 **참조 링크**. `{ label, url }`.
Requirement·Feature·Page·UIElement·Api·Database가 `links?: DocLink[]`로 옵셔널 보유.

- 그래프 연결(id 참조)과 **별개 레이어** — 고립 검사 대상이 아니다(외부 URL이라 그래프 노드가 아님).
- **AI는 URL을 만들지 않는다(환각 방지)** — 생성 시 비우고, 사용자가 인스펙터에서 직접 연결.
- 렌더는 새 탭(`target=_blank` + `rel="noopener noreferrer"`). Notion/Jira 등 자동 매칭은 후속(MCP).

---

## 무결성 / 삭제 규칙

- `Wireframe.pageId`, `PageFlow.pageId`, `UserFlow.edges[].fromPageId/toPageId` 는 유효한 Page.
- `Page.wireframeId`, `Page.pageFlowId` 는 유효한 Wireframe/PageFlow. 소유 관계 불일치 시 자식의 `pageId`가 출처.
- `UIElement.apiIds/databaseIds` 는 유효한 Api/Database.
- **삭제 시:** Page 삭제 → 소속 Wireframe·PageFlow 삭제 + 관련 UserFlow edge 정리.
  Api/Database 삭제 → 참조하던 UIElement·Feature·Page에서 id 제거.
- 역참조(Used By/Triggered By)는 저장하지 않으므로 삭제 시 일관성 유지 부담 없음 — 조회 시 계산.
