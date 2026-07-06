import type { WorkspaceDesign } from "@/lib/types/assembler"
import type { DesignCollectionKey } from "@/lib/types/chat"
import type { DanglingRef, DanglingRefKind } from "@/lib/types/design"

// 도크 표시용 id→이름 해석 공용 유틸(ASM-047) — planDiff·ChangePlanCard가 공유.
// planImpact.refName은 실패 시 raw id를 돌려줘 재사용 불가(시그니처 변경 금지) — 여기선
// 실패를 null로 돌려 호출부가 정직 폴백(raw id 노출 금지·개수 보존)을 고른다.

export const COLLECTION_LABEL: Record<DesignCollectionKey, string> = {
  requirements: "요구사항",
  features: "기능",
  pages: "페이지",
  flows: "플로우",
  wireframes: "와이어프레임",
  elements: "요소",
}

// 공백뿐인 이름은 없는 것과 같다 — 빈 문자열이 truthy 검사·"이름 없는 X" 폴백을 둘 다 비껴가
// `'   '`·`"로그인, "` 같은 깨진 렌더를 만든다(AI payload는 트림 경계를 안 거침).
export function normalizeName(name: string | undefined | null): string | null {
  const trimmed = name?.trim()
  return trimmed ? trimmed : null
}

export function resolveItemName(
  design: WorkspaceDesign,
  collection: DesignCollectionKey,
  id: string,
): string | null {
  switch (collection) {
    case "requirements":
      return normalizeName(design.requirements.find((r) => r.id === id)?.title)
    case "features":
      return normalizeName(design.features.find((f) => f.id === id)?.name)
    case "pages":
      return normalizeName(design.pages.find((p) => p.id === id)?.name)
    case "flows":
      return normalizeName(design.flows.find((f) => f.id === id)?.name)
    case "wireframes":
      // 와이어프레임은 이름이 없다 — 소유 페이지 이름으로 부른다(카디널 룰 2: Page 1—1 Wireframe).
      return normalizeName(design.pages.find((p) => p.wireframeId === id)?.name)
    case "elements":
      return normalizeName(design.elements.find((e) => e.id === id)?.label)
  }
}

// 컬렉션을 모르는 id(예: DanglingRef.from)를 전 컬렉션에서 찾는다.
// 항목은 있는데 이름을 빌릴 곳이 없으면(orphan 와이어프레임) name null.
export function findItemByAnyId(
  design: WorkspaceDesign,
  id: string,
): { collection: DesignCollectionKey; name: string | null } | null {
  const collections = Object.keys(COLLECTION_LABEL) as DesignCollectionKey[]
  for (const collection of collections) {
    const exists = (design[collection] as { id: string }[]).some((item) => item.id === id)
    if (exists) return { collection, name: resolveItemName(design, collection, id) }
  }
  return null
}

const DANGLING_KIND_LABEL: Record<DanglingRefKind, string> = {
  requirement: "요구사항",
  page: "페이지",
  wireframe: "와이어프레임",
  element: "요소",
  api: "API",
  dbTable: "DB 테이블",
  flowPage: "페이지",
}

// 받침 유무로 을/를 — 마지막 글자가 한글이 아니면(예: "API" — 모음으로 읽힘) 를.
function eulReul(word: string): "을" | "를" {
  const code = word.charCodeAt(word.length - 1)
  if (code < 0xac00 || code > 0xd7a3) return "를"
  return (code - 0xac00) % 28 > 0 ? "을" : "를"
}

// 서버 findDanglingRefs의 from 접두사 → 컬렉션(design.ts:86-123 실산출 포맷).
const FROM_PREFIX_COLLECTION: Record<string, DesignCollectionKey> = {
  requirement: "requirements",
  feature: "features",
  page: "pages",
  flow: "flows",
  wireframe: "wireframes",
  element: "elements",
}

// `kind:id`(flow는 `flow:id/edge:id`) 파싱. 미지 포맷은 null — 호출부가 bare id 조회로 관용 처리.
function parseDanglingFrom(from: string): { collection: DesignCollectionKey; id: string } | null {
  const head = from.split("/")[0]
  const sep = head.indexOf(":")
  if (sep < 0) return null
  const collection = FROM_PREFIX_COLLECTION[head.slice(0, sep)]
  const id = head.slice(sep + 1)
  if (!collection || !id) return null
  return { collection, id }
}

// 끊어진 연결 한 건의 해요체 카피 — 내부 id 대신 이름+종류로(X-03, ux-writing.md).
export function danglingRefMessage(design: WorkspaceDesign, ref: DanglingRef): string {
  const parsed = parseDanglingFrom(ref.from)
  const referrer = parsed
    ? { collection: parsed.collection, name: resolveItemName(design, parsed.collection, parsed.id) }
    : findItemByAnyId(design, ref.from)
  const subject = referrer
    ? referrer.name
      ? `${COLLECTION_LABEL[referrer.collection]} '${referrer.name}'`
      : `이름 없는 ${COLLECTION_LABEL[referrer.collection]}`
    : "이름 없는 항목"
  const missing = DANGLING_KIND_LABEL[ref.kind]
  return `${subject}에 연결된 ${missing}${eulReul(missing)} 찾을 수 없어요.`
}
