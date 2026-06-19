import type { ProjectGraph } from "@/lib/types/assembler"

// Golden 예시 1 — 할 일 관리 앱. 목록 화면 + 상세/편집 화면.
// 체인 완결: Requirement → Feature → Page(2) → Wireframe → UIElement → Api → Database + userFlow edge.
// navigate 요소(el-todo-row, el-add-fab)는 대응 userFlow edge를 가진다(양방향 정합).

export const TODO_APP: { idea: string; graph: ProjectGraph } = {
  idea: "혼자 쓰는 간단한 할 일 관리 앱. 할 일을 추가하고, 목록에서 완료 체크하고, 항목을 눌러 내용을 수정할 수 있어야 해.",
  graph: {
    id: "todo-app",
    name: "할 일 관리 앱",
    description: "할 일을 추가·완료·수정하는 1인용 태스크 관리 앱.",

    requirements: [
      {
        id: "req-manage-task",
        title: "사용자는 할 일을 추가·완료·수정할 수 있어야 한다.",
        description: "목록 화면에서 할 일을 관리하고, 상세 화면에서 내용을 수정한다.",
      },
    ],

    features: [
      {
        id: "feat-task-list",
        name: "Task List",
        description: "할 일 목록 조회·완료 토글·추가 진입.",
        businessRules: [
          "완료 토글은 즉시 저장한다.",
          "할 일이 없으면 빈 상태 안내를 노출한다.",
        ],
        requirementIds: ["req-manage-task"],
        pageIds: ["page-task-list"],
        apiIds: ["api-list-tasks", "api-toggle-task"],
        databaseIds: ["db-tasks"],
      },
      {
        id: "feat-task-edit",
        name: "Task Edit",
        description: "할 일 제목·메모 수정 및 저장.",
        businessRules: [
          "제목은 1자 이상이어야 저장할 수 있다.",
          "저장 성공 시 목록 화면으로 돌아간다.",
        ],
        requirementIds: ["req-manage-task"],
        pageIds: ["page-task-detail"],
        apiIds: ["api-update-task"],
        databaseIds: ["db-tasks"],
      },
    ],

    pages: [
      {
        id: "page-task-list",
        name: "Task List",
        description: "할 일 목록과 추가 버튼을 보여주는 메인 화면.",
        featureIds: ["feat-task-list"],
        wireframeId: "wf-task-list",
        pageFlowId: "flow-task-list",
        apiIds: ["api-list-tasks", "api-toggle-task"],
        databaseIds: ["db-tasks"],
        x: 40,
        y: 40,
        device: "mobile",
      },
      {
        id: "page-task-detail",
        name: "Task Detail",
        description: "선택한 할 일의 제목·메모를 수정하는 화면.",
        featureIds: ["feat-task-edit"],
        wireframeId: "wf-task-detail",
        apiIds: ["api-update-task"],
        databaseIds: ["db-tasks"],
        x: 460,
        y: 40,
        device: "mobile",
      },
    ],

    wireframes: [
      {
        id: "wf-task-list",
        pageId: "page-task-list",
        uiElementIds: ["el-list-title", "el-todo-row", "el-todo-check", "el-add-fab", "el-empty-hint"],
      },
      {
        id: "wf-task-detail",
        pageId: "page-task-detail",
        uiElementIds: ["el-detail-title-input", "el-detail-memo", "el-save-button"],
      },
    ],

    uiElements: [
      {
        id: "el-list-title",
        name: "List Heading",
        description: "화면 제목 — 장식 요소.",
        type: "heading",
        props: { text: "오늘 할 일" },
        states: [{ label: "Default" }],
        action: "",
        apiIds: [],
        databaseIds: [],
        result: { kind: "none" },
      },
      {
        id: "el-todo-row",
        name: "Task Row",
        description: "할 일 한 건. 누르면 상세 화면으로 이동한다.",
        type: "text",
        props: { text: "장보기" },
        states: [
          { label: "Default" },
          { label: "Empty", detail: "할 일이 없으면 미노출" },
        ],
        action: "Click",
        apiIds: ["api-list-tasks"],
        databaseIds: ["db-tasks"],
        result: { kind: "navigate", toPageId: "page-task-detail", detail: "선택한 할 일 상세로 이동" },
      },
      {
        id: "el-todo-check",
        name: "Done Toggle",
        description: "할 일 완료 여부를 전환한다.",
        type: "toggle",
        props: { label: "완료", on: false },
        states: [
          { label: "Default", detail: "미완료" },
          { label: "Loading", detail: "저장 중" },
        ],
        action: "Toggle",
        apiIds: ["api-toggle-task"],
        databaseIds: ["db-tasks"],
        result: { kind: "stateChange", detail: "완료 상태 전환 후 즉시 저장" },
      },
      {
        id: "el-add-fab",
        name: "Add Button",
        description: "새 할 일을 만들기 위해 상세 화면으로 이동한다.",
        type: "button",
        props: { label: "할 일 추가하기", variant: "solid" },
        states: [{ label: "Default" }],
        action: "Click",
        apiIds: [],
        databaseIds: [],
        result: { kind: "navigate", toPageId: "page-task-detail", detail: "빈 상세 화면으로 이동" },
      },
      {
        id: "el-empty-hint",
        name: "Empty Hint",
        description: "할 일이 없을 때 안내 문구 — 장식 요소.",
        type: "text",
        props: { text: "아직 할 일이 없어요. 첫 할 일을 추가해 보세요." },
        states: [
          { label: "Default" },
          { label: "Empty", detail: "목록이 비어 있을 때만 노출" },
        ],
        action: "",
        apiIds: [],
        databaseIds: [],
        result: { kind: "none" },
      },
      {
        id: "el-detail-title-input",
        name: "Title Input",
        description: "할 일 제목을 입력받는다.",
        type: "text-input",
        props: { label: "제목", placeholder: "할 일을 입력하세요" },
        states: [
          { label: "Default" },
          { label: "Error", detail: "제목이 비었을 때" },
        ],
        action: "Input",
        apiIds: [],
        databaseIds: [],
        result: { kind: "none" },
      },
      {
        id: "el-detail-memo",
        name: "Memo Textarea",
        description: "할 일 메모를 입력받는다.",
        type: "textarea",
        props: { label: "메모", placeholder: "메모를 입력하세요" },
        states: [{ label: "Default" }],
        action: "Input",
        apiIds: [],
        databaseIds: [],
        result: { kind: "none" },
      },
      {
        id: "el-save-button",
        name: "Save Button",
        description: "입력한 제목·메모를 저장하고 목록으로 돌아간다.",
        type: "button",
        props: { label: "저장하기", variant: "solid" },
        states: [
          { label: "Default" },
          { label: "Loading", detail: "저장 중 비활성" },
          { label: "Disabled", detail: "제목 미입력 시" },
        ],
        action: "Click",
        apiIds: ["api-update-task"],
        databaseIds: ["db-tasks"],
        result: { kind: "navigate", toPageId: "page-task-list", detail: "저장 성공 시 목록으로" },
      },
    ],

    apis: [
      {
        id: "api-list-tasks",
        method: "GET",
        path: "/tasks",
        purpose: "사용자의 할 일 목록을 조회한다.",
        databaseIds: ["db-tasks"],
        success: "Task List Returned",
        error: "조회 실패 — 일시적인 오류 안내",
      },
      {
        id: "api-toggle-task",
        method: "PATCH",
        path: "/tasks/:id/done",
        purpose: "할 일의 완료 여부를 전환한다.",
        databaseIds: ["db-tasks"],
        success: "Task Done State Updated",
        error: "저장 실패 — 잠시 후 다시 시도 안내",
      },
      {
        id: "api-update-task",
        method: "PUT",
        path: "/tasks/:id",
        purpose: "할 일의 제목과 메모를 저장한다.",
        databaseIds: ["db-tasks"],
        success: "Task Updated",
        error: "제목 누락 — 인라인 에러 노출",
      },
    ],

    databases: [
      {
        id: "db-tasks",
        name: "tasks",
        purpose: "할 일 항목 저장.",
        columns: [
          "title — 할 일 제목",
          "memo — 메모 본문",
          "is_done — 완료 여부",
          "updated_at — 마지막 수정 시각",
        ],
      },
    ],

    pageFlows: [
      {
        id: "flow-task-list",
        pageId: "page-task-list",
        steps: [
          { id: "step-list-enter", label: "목록 화면 진입", nextStepIds: ["step-list-action"] },
          { id: "step-list-action", label: "할 일 선택 또는 추가", nextStepIds: ["step-list-navigate"] },
          { id: "step-list-navigate", label: "상세 화면으로 이동", nextStepIds: [] },
        ],
      },
    ],

    userFlow: {
      id: "userflow-todo",
      edges: [
        {
          id: "edge-row-to-detail",
          fromPageId: "page-task-list",
          toPageId: "page-task-detail",
          triggerElementId: "el-todo-row",
          condition: "할 일을 선택할 때",
        },
        {
          id: "edge-add-to-detail",
          fromPageId: "page-task-list",
          toPageId: "page-task-detail",
          triggerElementId: "el-add-fab",
          condition: "할 일 추가를 누를 때",
        },
        {
          id: "edge-save-to-list",
          fromPageId: "page-task-detail",
          toPageId: "page-task-list",
          triggerElementId: "el-save-button",
          condition: "저장 성공 시",
        },
      ],
    },
  },
}
