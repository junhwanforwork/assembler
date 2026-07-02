import { describe, it, expect } from "vitest"
import { buildImplementationContext, connectedFeatureIds } from "./exportContext"
import type { Api, DbTable, WorkspaceDesign } from "@/lib/types/assembler"

// 내보내기 — 구현 컨텍스트 패키징(#64). 선택 기능의 연결된 명세만, 재사용/신규 구분,
// 끊어진 연결은 정직하게 표기(지어내기 금지)가 계약이다.

function fixtureDesign(): WorkspaceDesign {
  return {
    requirements: [
      {
        id: "req-1",
        title: "산책을 기록할 수 있어야 한다",
        description: "사용자는 산책 경로를 저장한다.",
        status: "approved",
        priority: "high",
        role: "user",
        acceptanceCriteria: ["시작/종료를 누르면 경로가 저장된다", "저장된 산책이 목록에 보인다"],
      },
      {
        id: "req-2",
        title: "알림을 받을 수 있어야 한다",
        description: "미연결 요구사항.",
        status: "draft",
        priority: "low",
        role: "user",
        acceptanceCriteria: [],
      },
    ],
    features: [
      {
        id: "feat-1",
        name: "산책 기록",
        description: "경로를 기록하고 저장한다.",
        detailFeatures: [{ id: "df-1", title: "경로 저장", description: "GPS 경로를 저장" }],
        requirementIds: ["req-1", "req-ghost"],
        pageIds: ["page-1", "page-ghost"],
        apiIds: ["api-active", "api-planned", "api-ghost"],
      },
      {
        id: "feat-2",
        name: "푸시 알림",
        description: "미선택 기능 — 출력에 나오면 안 된다.",
        detailFeatures: [],
        requirementIds: ["req-2"],
        pageIds: ["page-2"],
        apiIds: [],
      },
    ],
    pages: [
      { id: "page-1", name: "산책 홈", description: "기록 시작 화면", wireframeId: "wf-1" },
      { id: "page-2", name: "알림 설정", description: "", wireframeId: null },
      { id: "page-3", name: "산책 상세", description: "", wireframeId: null },
    ],
    flows: [
      {
        id: "flow-1",
        name: "기록 플로우",
        edges: [
          { id: "e-1", fromPageId: "page-1", toPageId: "page-3", trigger: "기록 종료 시" },
          { id: "e-2", fromPageId: "page-2", toPageId: "page-3", trigger: "알림 클릭 시" },
        ],
      },
      {
        id: "flow-2",
        name: "알림 플로우",
        edges: [{ id: "e-3", fromPageId: "page-2", toPageId: "page-2", trigger: "토글 시" }],
      },
    ],
    wireframes: [{ id: "wf-1", elementIds: ["el-1", "el-ghost"] }],
    elements: [
      {
        id: "el-1",
        label: "기록 시작 버튼",
        type: "button",
        action: "Click",
        states: [{ name: "Default", description: "" }, { name: "Loading", description: "저장 중" }],
        result: "산책 상세로 이동",
        apiIds: ["api-active"],
        dbTableIds: ["db-walks", "db-ghost"],
      },
    ],
  }
}

const APIS: Api[] = [
  { id: "api-active", productId: "p1", method: "GET", endpoint: "/walks", summary: "산책 목록", status: "active", source: "code" },
  { id: "api-planned", productId: "p1", method: "POST", endpoint: "/walks", summary: "산책 저장", status: "planned", source: "code" },
  { id: "api-deprecated", productId: "p1", method: "DELETE", endpoint: "/walks", summary: "옛 삭제", status: "deprecated", source: "mcp" },
]

const DB_TABLES: DbTable[] = [
  {
    id: "db-walks",
    productId: "p1",
    name: "walks",
    description: "산책 기록",
    columns: [
      { name: "id", type: "uuid", nullable: false, isPrimaryKey: true },
      { name: "path", type: "jsonb", nullable: true, isPrimaryKey: false },
    ],
    source: "code",
  },
]

function build(selected: string[] = ["feat-1"]): string {
  return buildImplementationContext(
    { workspaceName: "산책 메이트", design: fixtureDesign(), apis: APIS, dbTables: DB_TABLES },
    selected
  )
}

describe("connectedFeatureIds (#34 프리셀렉트)", () => {
  it("체크된 요구사항에 연결된 기능 id를 돌려준다", () => {
    expect(connectedFeatureIds(fixtureDesign(), ["req-1"])).toEqual(["feat-1"])
    expect(connectedFeatureIds(fixtureDesign(), ["req-2"])).toEqual(["feat-2"])
  })

  it("여러 요구사항이 같은 기능을 가리켜도 중복 없이 1번", () => {
    expect(connectedFeatureIds(fixtureDesign(), ["req-1", "req-ghost"])).toEqual(["feat-1"])
  })

  it("빈 입력이면 빈 배열", () => {
    expect(connectedFeatureIds(fixtureDesign(), [])).toEqual([])
  })
})

describe("buildImplementationContext (#64)", () => {
  it("선택한 기능만 포함한다 — 미선택 기능은 어디에도 없다", () => {
    const md = build(["feat-1"])
    expect(md).toContain("산책 기록")
    expect(md).not.toContain("푸시 알림")
    expect(md).not.toContain("알림 설정")
  })

  it("연결된 요구사항과 수용 기준을 포함하고, 미연결 요구사항은 제외한다", () => {
    const md = build()
    expect(md).toContain("산책을 기록할 수 있어야 한다")
    expect(md).toContain("시작/종료를 누르면 경로가 저장된다")
    expect(md).not.toContain("알림을 받을 수 있어야 한다")
  })

  it("세부 기능이 들어간다", () => {
    expect(build()).toContain("경로 저장")
  })

  it("유저 플로우는 선택 기능의 화면을 지나는 edge만 — 화면 이름과 트리거로", () => {
    const md = build()
    expect(md).toContain("산책 홈 → 산책 상세")
    expect(md).toContain("기록 종료 시")
    expect(md).not.toContain("알림 클릭 시")
    expect(md).not.toContain("토글 시")
  })

  it("API를 재사용(코드에 있음)과 신규(planned)로 구분한다 — 환각 방지 핵심", () => {
    const md = build()
    const reuseSection = md.slice(md.indexOf("## API — 재사용"), md.indexOf("## API — 신규"))
    const newSection = md.slice(md.indexOf("## API — 신규"))
    expect(reuseSection).toContain("GET /walks")
    expect(newSection).toContain("POST /walks")
    // 참조 안 된 API는 어느 쪽에도 안 나온다.
    expect(md).not.toContain("DELETE /walks")
  })

  it("API에 출처(code/mcp)를 표기한다", () => {
    expect(build()).toContain("code")
  })

  it("요소가 참조한 DB 테이블을 컬럼 요약과 함께 포함한다", () => {
    const md = build()
    expect(md).toContain("walks")
    expect(md).toContain("uuid")
    expect(md).toContain("PK")
  })

  it("와이어프레임 요소의 매핑(액션→결과)을 포함한다", () => {
    const md = build()
    expect(md).toContain("기록 시작 버튼")
    expect(md).toContain("산책 상세로 이동")
  })

  it("끊어진 참조는 정직하게 표기하고 지어내지 않는다", () => {
    const md = build()
    expect(md).toContain("연결 끊김")
    expect(md).toContain("req-ghost")
    expect(md).toContain("page-ghost")
    expect(md).toContain("api-ghost")
    expect(md).toContain("db-ghost")
    expect(md).toContain("el-ghost")
  })

  it("코딩 에이전트 지침(지어내기 금지)을 머리에 싣는다", () => {
    const md = build()
    expect(md).toContain("지어내지")
    expect(md.startsWith("# 구현 컨텍스트 — 산책 메이트")).toBe(true)
  })

  it("역할이 빈 값이면 '역할:' 조각을 생략한다", () => {
    const design = fixtureDesign()
    design.requirements[0].role = ""
    const md = buildImplementationContext(
      { workspaceName: "산책 메이트", design, apis: APIS, dbTables: DB_TABLES },
      ["feat-1"]
    )
    expect(md).not.toContain("역할:")
    expect(md).toContain("상태: approved · 우선순위: high")
  })

  it("deprecated API가 참조되면 재사용 목록에 중단 예정 경고를 단다", () => {
    const design = fixtureDesign()
    design.features[0].apiIds = ["api-deprecated"]
    const md = buildImplementationContext(
      { workspaceName: "산책 메이트", design, apis: APIS, dbTables: DB_TABLES },
      ["feat-1"]
    )
    expect(md).toContain("DELETE /walks")
    expect(md).toContain("중단")
  })
})
