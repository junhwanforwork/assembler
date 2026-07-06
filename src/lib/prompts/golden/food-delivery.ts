import type { GoldenExample } from "../golden-set"

// Golden 예시 3 — 음식 배달 주문(주문 도메인). 화면 4 + 선형 퍼널 흐름.

export const FOOD_DELIVERY: GoldenExample = {
  id: "food-delivery",
  idea: "동네 음식점 배달 주문 앱. 가게를 고르고 메뉴를 장바구니에 담아 주문하면, 주문 상태를 실시간으로 확인할 수 있어야 해.",
  apis: [
    { id: "api-list-restaurants", productId: "food-delivery", method: "GET", endpoint: "/restaurants", summary: "가게 목록 조회", status: "active", source: "code" },
    { id: "api-get-menus", productId: "food-delivery", method: "GET", endpoint: "/restaurants/{id}/menus", summary: "가게 메뉴 조회", status: "active", source: "code" },
    { id: "api-create-order", productId: "food-delivery", method: "POST", endpoint: "/orders", summary: "주문 생성·결제", status: "planned", source: "code" },
    { id: "api-get-order", productId: "food-delivery", method: "GET", endpoint: "/orders/{id}", summary: "주문 상태 조회", status: "planned", source: "code" },
  ],
  dbTables: [
    {
      id: "db-restaurants",
      productId: "food-delivery",
      name: "restaurants",
      description: "가게 — 이름·카테고리·영업 여부",
      columns: [
        { name: "id", type: "uuid", nullable: false, isPrimaryKey: true },
        { name: "name", type: "text", nullable: false, isPrimaryKey: false },
        { name: "is_open", type: "boolean", nullable: false, isPrimaryKey: false },
      ],
      source: "code",
    },
    {
      id: "db-menus",
      productId: "food-delivery",
      name: "menus",
      description: "메뉴 — 가게 소속·가격",
      columns: [
        { name: "id", type: "uuid", nullable: false, isPrimaryKey: true },
        { name: "restaurant_id", type: "uuid", nullable: false, isPrimaryKey: false, references: "restaurants.id" },
        { name: "name", type: "text", nullable: false, isPrimaryKey: false },
        { name: "price", type: "integer", nullable: false, isPrimaryKey: false },
      ],
      source: "code",
    },
    {
      id: "db-orders",
      productId: "food-delivery",
      name: "orders",
      description: "주문 — 메뉴 묶음·배달 상태",
      columns: [
        { name: "id", type: "uuid", nullable: false, isPrimaryKey: true },
        { name: "restaurant_id", type: "uuid", nullable: false, isPrimaryKey: false, references: "restaurants.id" },
        { name: "status", type: "text", nullable: false, isPrimaryKey: false },
      ],
      source: "code",
    },
  ],
  design: {
    requirements: [
      {
        id: "req-order-food",
        title: "사용자는 메뉴를 골라 배달 주문할 수 있어야 한다",
        description: "가게 탐색 → 메뉴 담기 → 주문·결제의 퍼널을 완주한다.",
        status: "approved",
        priority: "high",
        role: "주문자",
        acceptanceCriteria: ["장바구니에 담은 메뉴로 주문이 생성된다", "영업 종료 가게는 주문할 수 없다"],
      },
      {
        id: "req-track-order",
        title: "사용자는 주문 상태를 확인할 수 있어야 한다",
        description: "접수→조리→배달중→완료 상태를 본다.",
        status: "approved",
        priority: "medium",
        role: "주문자",
        acceptanceCriteria: ["주문 직후 상태 화면으로 이동한다"],
      },
    ],
    features: [
      {
        id: "feat-restaurant-browse",
        name: "가게 탐색",
        description: "가게 목록·메뉴 조회와 장바구니 진입.",
        detailFeatures: [{ id: "df-browse-closed", title: "영업 여부 표시", description: "영업 종료 가게는 주문 차단" }],
        requirementIds: ["req-order-food"],
        pageIds: ["page-home", "page-restaurant"],
        apiIds: ["api-list-restaurants", "api-get-menus"],
        dbTableIds: ["db-restaurants", "db-menus"],
      },
      {
        id: "feat-cart-order",
        name: "장바구니 주문",
        description: "담은 메뉴 확인·수량 조절·주문 생성.",
        detailFeatures: [
          { id: "df-cart-quantity", title: "수량 조절", description: "메뉴별 수량 증감" },
          { id: "df-cart-single-store", title: "단일 가게 규칙", description: "한 번에 한 가게 메뉴만" },
        ],
        requirementIds: ["req-order-food"],
        pageIds: ["page-cart"],
        apiIds: ["api-create-order"],
        dbTableIds: ["db-orders", "db-menus"],
      },
      {
        id: "feat-order-track",
        name: "주문 추적",
        description: "주문 상태 조회·갱신 표시.",
        detailFeatures: [{ id: "df-track-status", title: "상태 단계", description: "접수·조리·배달중·완료" }],
        requirementIds: ["req-track-order"],
        pageIds: ["page-order-status"],
        apiIds: ["api-get-order"],
        dbTableIds: ["db-orders"],
      },
    ],
    pages: [
      { id: "page-home", name: "홈", description: "동네 가게 목록을 보여주는 화면.", wireframeId: null },
      { id: "page-restaurant", name: "가게 상세", description: "가게 정보와 메뉴 목록, 담기 버튼이 있는 화면.", wireframeId: null },
      { id: "page-cart", name: "장바구니", description: "담은 메뉴를 확인하고 주문하는 화면.", wireframeId: null },
      { id: "page-order-status", name: "주문 상태", description: "주문 진행 단계를 보여주는 화면.", wireframeId: null },
    ],
    flows: [
      {
        id: "flow-order",
        name: "주문 퍼널",
        edges: [
          { id: "edge-home-to-restaurant", fromPageId: "page-home", toPageId: "page-restaurant", trigger: "가게 선택 시" },
          { id: "edge-restaurant-to-cart", fromPageId: "page-restaurant", toPageId: "page-cart", trigger: "장바구니 보기 클릭 시" },
          { id: "edge-cart-to-status", fromPageId: "page-cart", toPageId: "page-order-status", trigger: "주문 성공 시" },
        ],
      },
    ],
    wireframes: [],
    elements: [],
  },
}
