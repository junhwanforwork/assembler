import { create } from "zustand"
import type { Block, BlockType, Flow, Project, ProjectDocument, Screen } from "@/lib/types/builder"
import { BLOCK_DEF_MAP } from "@/lib/builder/block-catalog"

// 빌더 단일 스토어. 프로젝트 문서(화면·블록·플로우)를 통째로 들고 있고,
// 변경 시 hasUnsavedChanges 플래그를 올린다 → useBuilderAutosave가 디바운스 저장.

type BuilderView = "screen" | "flow"

const uid = () => crypto.randomUUID()

// 새 화면의 플로우 캔버스 위치 — 가로로 흐르도록 기존 화면 수 기준 그리드 배치.
const SCREEN_GAP_X = 320
const SCREEN_GAP_Y = 360
const PER_ROW = 3

interface BuilderState {
  projectId: string | null
  title: string
  screens: Screen[]
  flows: Flow[]
  activeScreenId: string | null
  selectedBlockId: string | null
  view: BuilderView
  hasUnsavedChanges: boolean

  load: (project: Project) => void
  toDocument: () => ProjectDocument
  markSaved: () => void

  setTitle: (title: string) => void
  setView: (view: BuilderView) => void

  addScreen: () => void
  removeScreen: (screenId: string) => void
  renameScreen: (screenId: string, title: string) => void
  selectScreen: (screenId: string) => void
  moveScreen: (screenId: string, x: number, y: number) => void

  addBlock: (screenId: string, type: BlockType, index?: number) => void
  removeBlock: (screenId: string, blockId: string) => void
  updateBlockProps: (screenId: string, blockId: string, props: Record<string, unknown>) => void
  reorderBlocks: (screenId: string, orderedIds: string[]) => void
  selectBlock: (blockId: string | null) => void

  addFlow: (sourceScreenId: string, targetScreenId: string) => void
  removeFlow: (flowId: string) => void
}

export const useBuilderStore = create<BuilderState>((set, get) => {
  // 모든 문서 변경 후 dirty 플래그를 올리는 헬퍼.
  const dirty = (partial: Partial<BuilderState>) => set({ ...partial, hasUnsavedChanges: true })

  const mapScreen = (screenId: string, fn: (s: Screen) => Screen) =>
    get().screens.map((s) => (s.id === screenId ? fn(s) : s))

  return {
    projectId: null,
    title: "",
    screens: [],
    flows: [],
    activeScreenId: null,
    selectedBlockId: null,
    view: "screen",
    hasUnsavedChanges: false,

    load: (project) =>
      set({
        projectId: project.id,
        title: project.title,
        screens: project.document.screens,
        flows: project.document.flows,
        activeScreenId: project.document.screens[0]?.id ?? null,
        selectedBlockId: null,
        view: "screen",
        hasUnsavedChanges: false,
      }),

    toDocument: () => ({ screens: get().screens, flows: get().flows }),
    markSaved: () => set({ hasUnsavedChanges: false }),

    setTitle: (title) => dirty({ title }),
    setView: (view) => set({ view }),

    addScreen: () => {
      const screens = get().screens
      const i = screens.length
      const screen: Screen = {
        id: uid(),
        title: `화면 ${i + 1}`,
        blocks: [],
        x: (i % PER_ROW) * SCREEN_GAP_X,
        y: Math.floor(i / PER_ROW) * SCREEN_GAP_Y,
      }
      dirty({ screens: [...screens, screen], activeScreenId: screen.id })
    },

    removeScreen: (screenId) => {
      const screens = get().screens.filter((s) => s.id !== screenId)
      const flows = get().flows.filter(
        (f) => f.sourceScreenId !== screenId && f.targetScreenId !== screenId
      )
      const activeScreenId =
        get().activeScreenId === screenId ? screens[0]?.id ?? null : get().activeScreenId
      dirty({ screens, flows, activeScreenId, selectedBlockId: null })
    },

    renameScreen: (screenId, title) =>
      dirty({ screens: mapScreen(screenId, (s) => ({ ...s, title })) }),

    selectScreen: (screenId) => set({ activeScreenId: screenId, selectedBlockId: null }),

    moveScreen: (screenId, x, y) =>
      dirty({ screens: mapScreen(screenId, (s) => ({ ...s, x, y })) }),

    addBlock: (screenId, type, index) => {
      const block: Block = { id: uid(), type, props: { ...BLOCK_DEF_MAP[type].defaultProps } }
      dirty({
        screens: mapScreen(screenId, (s) => {
          const blocks = [...s.blocks]
          blocks.splice(index ?? blocks.length, 0, block)
          return { ...s, blocks }
        }),
        selectedBlockId: block.id,
      })
    },

    removeBlock: (screenId, blockId) =>
      dirty({
        screens: mapScreen(screenId, (s) => ({
          ...s,
          blocks: s.blocks.filter((b) => b.id !== blockId),
        })),
        selectedBlockId: get().selectedBlockId === blockId ? null : get().selectedBlockId,
      }),

    updateBlockProps: (screenId, blockId, props) =>
      dirty({
        screens: mapScreen(screenId, (s) => ({
          ...s,
          blocks: s.blocks.map((b) =>
            b.id === blockId ? { ...b, props: { ...b.props, ...props } } : b
          ),
        })),
      }),

    reorderBlocks: (screenId, orderedIds) =>
      dirty({
        screens: mapScreen(screenId, (s) => {
          const byId = new Map(s.blocks.map((b) => [b.id, b]))
          const blocks = orderedIds.map((id) => byId.get(id)).filter((b): b is Block => !!b)
          return { ...s, blocks }
        }),
      }),

    selectBlock: (blockId) => set({ selectedBlockId: blockId }),

    addFlow: (sourceScreenId, targetScreenId) => {
      if (sourceScreenId === targetScreenId) return
      const exists = get().flows.some(
        (f) => f.sourceScreenId === sourceScreenId && f.targetScreenId === targetScreenId
      )
      if (exists) return
      const flow: Flow = { id: uid(), sourceScreenId, targetScreenId }
      dirty({ flows: [...get().flows, flow] })
    },

    removeFlow: (flowId) => dirty({ flows: get().flows.filter((f) => f.id !== flowId) }),
  }
})
