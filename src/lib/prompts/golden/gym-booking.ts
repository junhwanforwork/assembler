import type { GoldenExample } from "../golden-set"

// Golden 예시 4 — 헬스장 수업 예약(예약 도메인). 화면 3 + 취소 역방향 흐름.

export const GYM_BOOKING: GoldenExample = {
  id: "gym-booking",
  idea: "헬스장 그룹 수업 예약 앱. 이번 주 수업 시간표를 보고 자리가 남은 수업을 예약하고, 내 예약을 확인하거나 취소할 수 있어야 해.",
  apis: [
    { id: "api-list-classes", productId: "gym-booking", method: "GET", endpoint: "/classes", summary: "주간 수업 시간표 조회", status: "active", source: "code" },
    { id: "api-create-booking", productId: "gym-booking", method: "POST", endpoint: "/bookings", summary: "수업 예약", status: "planned", source: "code" },
    { id: "api-cancel-booking", productId: "gym-booking", method: "DELETE", endpoint: "/bookings/{id}", summary: "예약 취소", status: "planned", source: "code" },
  ],
  dbTables: [
    {
      id: "db-classes",
      productId: "gym-booking",
      name: "classes",
      description: "그룹 수업 — 시간·정원",
      columns: [
        { name: "id", type: "uuid", nullable: false, isPrimaryKey: true },
        { name: "title", type: "text", nullable: false, isPrimaryKey: false },
        { name: "starts_at", type: "timestamptz", nullable: false, isPrimaryKey: false },
        { name: "capacity", type: "integer", nullable: false, isPrimaryKey: false },
      ],
      source: "code",
    },
    {
      id: "db-bookings",
      productId: "gym-booking",
      name: "bookings",
      description: "예약 — 회원·수업 연결",
      columns: [
        { name: "id", type: "uuid", nullable: false, isPrimaryKey: true },
        { name: "class_id", type: "uuid", nullable: false, isPrimaryKey: false, references: "classes.id" },
        { name: "member_id", type: "uuid", nullable: false, isPrimaryKey: false, references: "members.id" },
      ],
      source: "code",
    },
    {
      id: "db-members",
      productId: "gym-booking",
      name: "members",
      description: "회원 — 예약 주체",
      columns: [
        { name: "id", type: "uuid", nullable: false, isPrimaryKey: true },
        { name: "name", type: "text", nullable: false, isPrimaryKey: false },
      ],
      source: "code",
    },
  ],
  design: {
    requirements: [
      {
        id: "req-book-class",
        title: "회원은 자리가 남은 수업을 예약할 수 있어야 한다",
        description: "시간표에서 수업을 골라 정원 내에서 예약한다.",
        status: "approved",
        priority: "high",
        role: "회원",
        acceptanceCriteria: ["정원이 찬 수업은 예약할 수 없다", "예약 성공 시 내 예약 목록에 보인다"],
      },
      {
        id: "req-cancel-booking",
        title: "회원은 예약을 확인하고 취소할 수 있어야 한다",
        description: "내 예약 목록에서 예정된 예약을 취소한다.",
        status: "approved",
        priority: "medium",
        role: "회원",
        acceptanceCriteria: ["수업 시작 전에만 취소할 수 있다"],
      },
    ],
    features: [
      {
        id: "feat-class-browse",
        name: "수업 탐색",
        description: "주간 시간표 조회와 수업 상세 진입.",
        detailFeatures: [{ id: "df-browse-full", title: "정원 표시", description: "남은 자리·마감 표시" }],
        requirementIds: ["req-book-class"],
        pageIds: ["page-timetable", "page-class-detail"],
        apiIds: ["api-list-classes"],
        dbTableIds: ["db-classes"],
      },
      {
        id: "feat-class-book",
        name: "수업 예약",
        description: "수업 상세에서 정원 내 예약 생성.",
        detailFeatures: [{ id: "df-book-capacity", title: "정원 검증", description: "만석이면 예약 차단" }],
        requirementIds: ["req-book-class"],
        pageIds: ["page-class-detail"],
        apiIds: ["api-create-booking"],
        dbTableIds: ["db-bookings", "db-classes"],
      },
      {
        id: "feat-booking-manage",
        name: "예약 관리",
        description: "내 예약 목록 확인·취소.",
        detailFeatures: [{ id: "df-manage-cancel", title: "취소 기한", description: "수업 시작 전까지만" }],
        requirementIds: ["req-cancel-booking"],
        pageIds: ["page-my-bookings"],
        apiIds: ["api-cancel-booking"],
        dbTableIds: ["db-bookings", "db-members"],
      },
    ],
    pages: [
      { id: "page-timetable", name: "시간표", description: "이번 주 수업 목록을 요일별로 보여주는 화면.", wireframeId: null },
      { id: "page-class-detail", name: "수업 상세", description: "수업 정보와 예약 버튼이 있는 화면.", wireframeId: null },
      { id: "page-my-bookings", name: "내 예약", description: "예정된 예약을 확인·취소하는 화면.", wireframeId: null },
    ],
    flows: [
      {
        id: "flow-booking",
        name: "예약 흐름",
        edges: [
          { id: "edge-timetable-to-detail", fromPageId: "page-timetable", toPageId: "page-class-detail", trigger: "수업 선택 시" },
          { id: "edge-detail-to-mybookings", fromPageId: "page-class-detail", toPageId: "page-my-bookings", trigger: "예약 성공 시" },
          { id: "edge-mybookings-to-timetable", fromPageId: "page-my-bookings", toPageId: "page-timetable", trigger: "취소 후 다른 수업 찾기 시" },
        ],
      },
    ],
    wireframes: [],
    elements: [],
  },
}
