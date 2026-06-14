// ProjectGraph structured-outputs JSON 스키마 — /api/generate 가 output_config.format 으로 유효 JSON 강제.
// ⚠ src/lib/types/assembler.ts 의 ProjectGraph 타입이 정본 — 타입 변경 시 이 스키마도 동기한다(드리프트 수기 방어).
// json_schema 제약(claude-api): minimum/maxLength/recursive 미지원, 모든 object 는 additionalProperties:false 필수,
//   open object(additionalProperties:true) 불가 → props 는 알려진 키를 열거한다. 길이·범위 검증은 정규화(ASS-019).
// enum 은 단일 출처(UI_ELEMENT_TYPES·API_METHODS)에서 펼쳐 드리프트를 0으로.
// Page.x/y 는 스키마에서 제외 — AI 미생성, 정규화가 그리드로 채움(ASS-019).

import { API_METHODS, UI_ELEMENT_TYPES } from "@/lib/types/assembler"

type Schema = Record<string, unknown>

const str: Schema = { type: "string" }

function strArray(): Schema {
  return { type: "array", items: { type: "string" } }
}

function obj(properties: Record<string, Schema>, required: string[]): Schema {
  return { type: "object", properties, required, additionalProperties: false }
}

function arrayOf(items: Schema): Schema {
  return { type: "array", items }
}

const requirement = obj({ id: str, title: str, description: str }, ["id", "title", "description"])

const feature = obj(
  {
    id: str,
    name: str,
    description: str,
    businessRules: strArray(),
    requirementIds: strArray(),
    pageIds: strArray(),
    apiIds: strArray(),
    databaseIds: strArray(),
  },
  ["id", "name", "description", "businessRules", "requirementIds", "pageIds", "apiIds", "databaseIds"],
)

// pageFlowId 는 optional(required 제외). x/y 는 스키마에 없음 — 모델이 좌표를 만들지 않게.
const page = obj(
  {
    id: str,
    name: str,
    description: str,
    featureIds: strArray(),
    wireframeId: str,
    pageFlowId: str,
    apiIds: strArray(),
    databaseIds: strArray(),
  },
  ["id", "name", "description", "featureIds", "wireframeId", "apiIds", "databaseIds"],
)

const wireframe = obj({ id: str, pageId: str, uiElementIds: strArray() }, ["id", "pageId", "uiElementIds"])

// props — open object 불가. UI ELEMENT CONTRACT(assembler.ts) 의 타입별 키를 합쳐 열거(전부 optional).
const uiElementProps = obj(
  {
    text: str,
    label: str,
    placeholder: str,
    variant: str,
    options: strArray(),
    on: { type: "boolean" },
    status: str,
    value: { type: "number" },
  },
  [],
)

const uiElementState = obj({ label: str, detail: str }, ["label"])

// result — 5종 판별 유니온. navigate 만 toPageId required, none 은 detail 없음(mapping.md).
const uiElementResult: Schema = {
  anyOf: [
    obj({ kind: { const: "navigate" }, toPageId: str, detail: str }, ["kind", "toPageId"]),
    obj({ kind: { const: "stateChange" }, detail: str }, ["kind", "detail"]),
    obj({ kind: { const: "toast" }, detail: str }, ["kind", "detail"]),
    obj({ kind: { const: "inlineError" }, detail: str }, ["kind", "detail"]),
    obj({ kind: { const: "none" } }, ["kind"]),
  ],
}

const uiElement = obj(
  {
    id: str,
    name: str,
    description: str,
    type: { type: "string", enum: [...UI_ELEMENT_TYPES] },
    props: uiElementProps,
    states: arrayOf(uiElementState),
    action: str,
    apiIds: strArray(),
    databaseIds: strArray(),
    result: uiElementResult,
  },
  ["id", "name", "description", "type", "props", "states", "action", "apiIds", "databaseIds", "result"],
)

const api = obj(
  {
    id: str,
    method: { type: "string", enum: [...API_METHODS] },
    path: str,
    purpose: str,
    databaseIds: strArray(),
    success: str,
    error: str,
  },
  ["id", "method", "path", "purpose", "databaseIds", "success", "error"],
)

const database = obj({ id: str, name: str, purpose: str, columns: strArray() }, ["id", "name", "purpose", "columns"])

const pageFlowStep = obj({ id: str, label: str, nextStepIds: strArray() }, ["id", "label", "nextStepIds"])

const pageFlow = obj({ id: str, pageId: str, steps: arrayOf(pageFlowStep) }, ["id", "pageId", "steps"])

// triggerElementId·condition 은 optional(required 제외).
const userFlowEdge = obj(
  { id: str, fromPageId: str, toPageId: str, triggerElementId: str, condition: str },
  ["id", "fromPageId", "toPageId"],
)

const userFlow = obj({ id: str, edges: arrayOf(userFlowEdge) }, ["id", "edges"])

/** ProjectGraph 전체 — structured outputs schema. 루트가 곧 그래프(래퍼 없음). */
export const PROJECT_GRAPH_SCHEMA: Schema = obj(
  {
    id: str,
    name: str,
    description: str,
    requirements: arrayOf(requirement),
    features: arrayOf(feature),
    pages: arrayOf(page),
    wireframes: arrayOf(wireframe),
    uiElements: arrayOf(uiElement),
    apis: arrayOf(api),
    databases: arrayOf(database),
    pageFlows: arrayOf(pageFlow),
    userFlow,
  },
  [
    "id", "name", "description", "requirements", "features", "pages", "wireframes",
    "uiElements", "apis", "databases", "pageFlows", "userFlow",
  ],
)
