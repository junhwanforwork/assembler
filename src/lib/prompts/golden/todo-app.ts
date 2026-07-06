import type { GoldenExample } from "../golden-set"

// Golden 예시 1 — 할 일 관리 앱(태스크 도메인). 화면 2 + 흐름 왕복.
// 개정 계약(ASM-052): wireframes/elements 없음, 코드-진실 참조는 feature.apiIds·dbTableIds.

export const TODO_APP: GoldenExample = {
  id: "todo-app",
  idea: "혼자 쓰는 간단한 할 일 관리 앱. 할 일을 추가하고, 목록에서 완료 체크하고, 항목을 눌러 내용을 수정할 수 있어야 해.",
  apis: [
    { id: "api-list-tasks", productId: "todo-app", method: "GET", endpoint: "/tasks", summary: "할 일 목록 조회", status: "active", source: "code" },
    { id: "api-create-task", productId: "todo-app", method: "POST", endpoint: "/tasks", summary: "할 일 추가", status: "planned", source: "code" },
    { id: "api-update-task", productId: "todo-app", method: "PATCH", endpoint: "/tasks/{id}", summary: "할 일 수정·완료 토글", status: "planned", source: "code" },
  ],
  dbTables: [
    {
      id: "db-tasks",
      productId: "todo-app",
      name: "tasks",
      description: "할 일 한 건 — 제목·메모·완료 여부",
      columns: [
        { name: "id", type: "uuid", nullable: false, isPrimaryKey: true },
        { name: "title", type: "text", nullable: false, isPrimaryKey: false },
        { name: "memo", type: "text", nullable: true, isPrimaryKey: false },
        { name: "is_done", type: "boolean", nullable: false, isPrimaryKey: false },
      ],
      source: "code",
    },
  ],
  design: {
    requirements: [
      {
        id: "req-manage-task",
        title: "사용자는 할 일을 추가·완료·수정할 수 있어야 한다",
        description: "목록 화면에서 할 일을 관리하고, 상세 화면에서 내용을 수정한다.",
        status: "approved",
        priority: "high",
        role: "사용자",
        acceptanceCriteria: ["목록에서 완료 체크가 즉시 저장된다", "항목을 누르면 상세 화면에서 수정할 수 있다"],
      },
    ],
    features: [
      {
        id: "feat-task-list",
        name: "할 일 목록",
        description: "할 일 목록 조회·완료 토글·추가 진입.",
        detailFeatures: [
          { id: "df-list-toggle", title: "완료 토글", description: "체크 즉시 저장" },
          { id: "df-list-empty", title: "빈 상태 안내", description: "할 일이 없으면 안내 노출" },
        ],
        requirementIds: ["req-manage-task"],
        pageIds: ["page-task-list"],
        apiIds: ["api-list-tasks", "api-update-task"],
        dbTableIds: ["db-tasks"],
      },
      {
        id: "feat-task-edit",
        name: "할 일 편집",
        description: "할 일 추가·제목·메모 수정 및 저장.",
        detailFeatures: [{ id: "df-edit-validate", title: "제목 검증", description: "제목 1자 이상이어야 저장" }],
        requirementIds: ["req-manage-task"],
        pageIds: ["page-task-detail"],
        apiIds: ["api-create-task", "api-update-task"],
        dbTableIds: ["db-tasks"],
      },
    ],
    pages: [
      { id: "page-task-list", name: "할 일 목록", description: "할 일 목록과 추가 버튼을 보여주는 메인 화면.", wireframeId: null },
      { id: "page-task-detail", name: "할 일 상세", description: "선택한 할 일의 제목·메모를 수정하는 화면.", wireframeId: null },
    ],
    flows: [
      {
        id: "flow-task",
        name: "할 일 관리 흐름",
        edges: [
          { id: "edge-list-to-detail", fromPageId: "page-task-list", toPageId: "page-task-detail", trigger: "할 일 항목 선택 시" },
          { id: "edge-detail-to-list", fromPageId: "page-task-detail", toPageId: "page-task-list", trigger: "저장 성공 시" },
        ],
      },
    ],
    wireframes: [],
    elements: [],
  },
}
