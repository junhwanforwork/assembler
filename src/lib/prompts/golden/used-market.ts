import type { GoldenExample } from "../golden-set"

// Golden 예시 2 — 동네 중고거래(거래 도메인). 화면 4 + 분기 흐름.

export const USED_MARKET: GoldenExample = {
  id: "used-market",
  idea: "동네 이웃끼리 중고 물건을 사고파는 앱. 판매글을 올리고, 피드에서 물건을 둘러보고, 마음에 들면 판매자와 채팅으로 거래해.",
  apis: [
    { id: "api-list-listings", productId: "used-market", method: "GET", endpoint: "/listings", summary: "판매글 피드 조회", status: "active", source: "code" },
    { id: "api-create-listing", productId: "used-market", method: "POST", endpoint: "/listings", summary: "판매글 등록", status: "planned", source: "code" },
    { id: "api-get-listing", productId: "used-market", method: "GET", endpoint: "/listings/{id}", summary: "판매글 상세 조회", status: "active", source: "code" },
    { id: "api-create-chat", productId: "used-market", method: "POST", endpoint: "/chats", summary: "거래 채팅방 생성", status: "planned", source: "code" },
  ],
  dbTables: [
    {
      id: "db-listings",
      productId: "used-market",
      name: "listings",
      description: "판매글 — 제목·가격·상태",
      columns: [
        { name: "id", type: "uuid", nullable: false, isPrimaryKey: true },
        { name: "seller_id", type: "uuid", nullable: false, isPrimaryKey: false, references: "users.id" },
        { name: "title", type: "text", nullable: false, isPrimaryKey: false },
        { name: "price", type: "integer", nullable: false, isPrimaryKey: false },
      ],
      source: "code",
    },
    {
      id: "db-chats",
      productId: "used-market",
      name: "chats",
      description: "거래 채팅방 — 판매글·구매자 연결",
      columns: [
        { name: "id", type: "uuid", nullable: false, isPrimaryKey: true },
        { name: "listing_id", type: "uuid", nullable: false, isPrimaryKey: false, references: "listings.id" },
        { name: "buyer_id", type: "uuid", nullable: false, isPrimaryKey: false, references: "users.id" },
      ],
      source: "code",
    },
    {
      id: "db-users",
      productId: "used-market",
      name: "users",
      description: "회원 — 판매자·구매자 공통",
      columns: [
        { name: "id", type: "uuid", nullable: false, isPrimaryKey: true },
        { name: "nickname", type: "text", nullable: false, isPrimaryKey: false },
      ],
      source: "code",
    },
  ],
  design: {
    requirements: [
      {
        id: "req-sell-item",
        title: "사용자는 물건을 판매글로 올릴 수 있어야 한다",
        description: "제목·가격·사진으로 판매글을 등록한다.",
        status: "approved",
        priority: "high",
        role: "판매자",
        acceptanceCriteria: ["등록한 판매글이 피드에 보인다", "가격 없는 판매글은 등록되지 않는다"],
      },
      {
        id: "req-trade-chat",
        title: "구매자는 판매자와 채팅으로 거래할 수 있어야 한다",
        description: "판매글에서 채팅을 시작해 가격·시간을 조율한다.",
        status: "approved",
        priority: "medium",
        role: "구매자",
        acceptanceCriteria: ["판매글 상세에서 채팅을 시작할 수 있다"],
      },
    ],
    features: [
      {
        id: "feat-listing-post",
        name: "판매글 등록",
        description: "제목·가격 입력으로 판매글 작성·등록.",
        detailFeatures: [{ id: "df-post-validate", title: "가격 검증", description: "0원 이상 필수" }],
        requirementIds: ["req-sell-item"],
        pageIds: ["page-listing-write"],
        apiIds: ["api-create-listing"],
        dbTableIds: ["db-listings"],
      },
      {
        id: "feat-listing-feed",
        name: "판매글 탐색",
        description: "동네 판매글 피드 조회와 상세 진입.",
        detailFeatures: [{ id: "df-feed-detail", title: "상세 보기", description: "피드에서 판매글 상세로 이동" }],
        requirementIds: ["req-sell-item"],
        pageIds: ["page-feed", "page-listing-detail"],
        apiIds: ["api-list-listings", "api-get-listing"],
        dbTableIds: ["db-listings"],
      },
      {
        id: "feat-trade-chat",
        name: "거래 채팅",
        description: "판매글 상세에서 채팅방 생성·거래 조율.",
        detailFeatures: [{ id: "df-chat-create", title: "채팅방 생성", description: "판매글·구매자 쌍으로 1개" }],
        requirementIds: ["req-trade-chat"],
        pageIds: ["page-listing-detail", "page-chat-room"],
        apiIds: ["api-create-chat"],
        dbTableIds: ["db-chats", "db-users"],
      },
    ],
    pages: [
      { id: "page-feed", name: "피드", description: "동네 판매글 목록을 보여주는 홈 화면.", wireframeId: null },
      { id: "page-listing-write", name: "판매글 쓰기", description: "제목·가격을 입력해 판매글을 등록하는 화면.", wireframeId: null },
      { id: "page-listing-detail", name: "판매글 상세", description: "물건 정보와 채팅 시작 버튼이 있는 화면.", wireframeId: null },
      { id: "page-chat-room", name: "채팅방", description: "판매자와 메시지를 주고받는 화면.", wireframeId: null },
    ],
    flows: [
      {
        id: "flow-trade",
        name: "거래 흐름",
        edges: [
          { id: "edge-feed-to-detail", fromPageId: "page-feed", toPageId: "page-listing-detail", trigger: "판매글 선택 시" },
          { id: "edge-feed-to-write", fromPageId: "page-feed", toPageId: "page-listing-write", trigger: "판매글 등록 버튼 클릭 시" },
          { id: "edge-write-to-feed", fromPageId: "page-listing-write", toPageId: "page-feed", trigger: "등록 성공 시" },
          { id: "edge-detail-to-chat", fromPageId: "page-listing-detail", toPageId: "page-chat-room", trigger: "채팅 시작 시" },
        ],
      },
    ],
    wireframes: [],
    elements: [],
  },
}
