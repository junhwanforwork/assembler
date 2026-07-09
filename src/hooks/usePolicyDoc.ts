import { useEffect } from "react"
import { create } from "zustand"
import { api } from "@/lib/api/client"

// 정책 문서 브리지(ASM-069) — 정책 문서 API를 부르는 **유일한 곳**.
// 통합에서 레인 1 실물 결합은 이 파일 하나로 끝난다(PolicyDoc 타입도 여기 로컬 스텁 → 통합 시 실물 import 교체).
// product 스코프 — productId는 GET /api/workspaces/[id].productId로 획득(ExportModal.tsx 패턴).
//
// 공유 store인 이유: 좌 레일 목록(LeftRail)과 중앙 편집 뷰(PolicyView)가 같은 목록을 보고,
// 생성·저장·삭제 후 둘 다 즉시 갱신돼야 한다. 공통 부모(EditorClient)는 소유 밖이라 상태를 위로 못 올린다 →
// 모듈 스코프 store로 단일 fetch·양측 동기화. (서버 데이터라 useEditorStore(화면 상태 전용)엔 두지 않는다.)

export type PolicyDoc = {
  id: string
  productId: string
  title: string
  body: string
  apiIds: string[]
  dbTableIds: string[]
  createdAt: string
  updatedAt: string
}

export type PolicyDocPatch = Partial<Pick<PolicyDoc, "title" | "body" | "apiIds" | "dbTableIds">>
// POST 본문(계약) — title 필수, 나머지 선택. 새 문서를 한 번에 채워 만들 수 있다.
export type PolicyDocDraft = { title: string } & Partial<Pick<PolicyDoc, "body" | "apiIds" | "dbTableIds">>

type Status = "idle" | "loading" | "ready" | "error"

type PolicyDocsStore = {
  workspaceId: string | null
  productId: string | null
  docs: PolicyDoc[]
  status: Status
  load: (workspaceId: string) => Promise<void>
  create: (input: PolicyDocDraft) => Promise<PolicyDoc | null>
  update: (docId: string, patch: PolicyDocPatch) => Promise<PolicyDoc | null>
  remove: (docId: string) => Promise<boolean>
}

async function resolveProductId(workspaceId: string): Promise<string> {
  const ws = await api.get<{ productId: string }>(`/api/workspaces/${workspaceId}`)
  return ws.productId
}

export const usePolicyDocsStore = create<PolicyDocsStore>((set, get) => ({
  workspaceId: null,
  productId: null,
  docs: [],
  status: "idle",

  load: async (workspaceId) => {
    const st = get()
    // 같은 워크스페이스를 이미 불렀거나 부르는 중이면 재요청하지 않는다(에러는 재시도 허용).
    if (st.workspaceId === workspaceId && (st.status === "loading" || st.status === "ready")) return
    set({ workspaceId, status: "loading", docs: [], productId: null })
    try {
      const productId = await resolveProductId(workspaceId)
      const res = await api.get<{ docs: PolicyDoc[] }>(`/api/products/${productId}/policy-docs`)
      // 로딩 중 워크스페이스가 바뀌었으면(늦은 응답) 버린다.
      if (get().workspaceId !== workspaceId) return
      set({ productId, docs: res.docs, status: "ready" })
    } catch {
      if (get().workspaceId !== workspaceId) return
      set({ status: "error" })
    }
  },

  create: async (input) => {
    const { productId } = get()
    if (!productId) return null
    try {
      const res = await api.post<{ doc: PolicyDoc }>(`/api/products/${productId}/policy-docs`, input)
      set((s) => ({ docs: [...s.docs, res.doc] }))
      return res.doc
    } catch {
      return null
    }
  },

  update: async (docId, patch) => {
    const { productId } = get()
    if (!productId) return null
    try {
      const res = await api.patch<{ doc: PolicyDoc }>(`/api/products/${productId}/policy-docs/${docId}`, patch)
      set((s) => ({ docs: s.docs.map((d) => (d.id === docId ? res.doc : d)) }))
      return res.doc
    } catch {
      return null
    }
  },

  remove: async (docId) => {
    const { productId } = get()
    if (!productId) return false
    try {
      await api.del<{ ok: true }>(`/api/products/${productId}/policy-docs/${docId}`)
      set((s) => ({ docs: s.docs.filter((d) => d.id !== docId) }))
      return true
    } catch {
      return false
    }
  },
}))

// 소비 훅 — 워크스페이스가 정해지면 목록을 부른다(공유 store라 여러 소비처가 불러도 fetch는 1회).
export function usePolicyDocs(workspaceId: string | null): PolicyDocsStore {
  const store = usePolicyDocsStore()
  useEffect(() => {
    if (workspaceId) void store.load(workspaceId)
    // load는 안정 참조(store 액션) — workspaceId 변화에만 반응한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId])
  return store
}
