"use client"

import { useState, type CSSProperties, type FC } from "react"
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import type { Page, ProjectGraph, UIElement } from "@/lib/types/assembler"
import { UI_ELEMENT_TYPES } from "@/lib/types/assembler"
import { useGraphStore } from "@/lib/store/graph"
import { elementsOfPage, incompleteCount, isMappingComplete } from "@/lib/graph/selectors"
import { BLOCK_DEF_MAP } from "@/lib/builder/block-catalog"
import { Dropdown, DropdownTrigger, DropdownItem } from "@/components/ui"
import { COLOR, RADIUS, SPACING, TYPOGRAPHY } from "@/lib/design-tokens"
import { ElementIcon, IconPage } from "../tree/icons"
import { InlineDeleteButton } from "../shared/InlineDeleteButton"

// 화면 섹션 Tab — Pages 목록 + 선택 페이지 Layers(요소 dnd 정렬·추가·삭제). builder-layout.md §3.3 Tab.
export const WireframeLayers: FC<{ graph: ProjectGraph }> = ({ graph }) => {
  const selectedPageId = useGraphStore((s) => s.selectedPageId)
  const selectPage = useGraphStore((s) => s.selectPage)

  if (graph.pages.length === 0) {
    return <p style={EMPTY}>아직 페이지가 없어요. 대화로 화면을 만들어 보세요.</p>
  }

  return (
    <div>
      {graph.pages.map((page) => (
        <div key={page.id}>
          <button
            type="button"
            onClick={() => selectPage(page.id)}
            style={{ ...PAGE_ROW, backgroundColor: selectedPageId === page.id ? COLOR.ACCENT_BG : "transparent" }}
          >
            <IconPage />
            <span style={PAGE_NAME}>{page.name}</span>
            {incompleteCount(graph, page.id) > 0 ? (
              <span style={WARN}>⚠ {incompleteCount(graph, page.id)}</span>
            ) : null}
          </button>
          {selectedPageId === page.id ? <LayerList page={page} graph={graph} /> : null}
        </div>
      ))}
    </div>
  )
}

const LayerList: FC<{ page: Page; graph: ProjectGraph }> = ({ page, graph }) => {
  const reorderUIElements = useGraphStore((s) => s.reorderUIElements)
  const elements = elementsOfPage(graph, page.id)
  const ids = elements.map((e) => e.id)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const from = ids.indexOf(String(active.id))
    const to = ids.indexOf(String(over.id))
    if (from < 0 || to < 0) return
    reorderUIElements(page.wireframeId, arrayMove(ids, from, to))
  }

  return (
    <div style={LAYERS}>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          {elements.map((el) => (
            <SortableLayerRow key={el.id} element={el} />
          ))}
        </SortableContext>
      </DndContext>
      <AddElementMenu wireframeId={page.wireframeId} />
    </div>
  )
}

const SortableLayerRow: FC<{ element: UIElement }> = ({ element }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: element.id,
  })
  const selected = useGraphStore((s) => s.selectedElementId === element.id)
  const selectElement = useGraphStore((s) => s.selectElement)
  const removeUIElement = useGraphStore((s) => s.removeUIElement)

  return (
    <div
      ref={setNodeRef}
      style={{
        ...ROW,
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        backgroundColor: selected ? COLOR.ACCENT_BG : "transparent",
      }}
    >
      <button type="button" {...attributes} {...listeners} aria-label="순서 변경 핸들" style={HANDLE}>
        ⋮⋮
      </button>
      <button type="button" onClick={() => selectElement(element.id)} style={ROW_NAME}>
        <ElementIcon type={element.type} />
        <span style={ROW_LABEL}>{element.name}</span>
        {!isMappingComplete(element) ? <span style={WARN}>⚠</span> : null}
      </button>
      <InlineDeleteButton label={`${element.name} 삭제`} onClick={() => removeUIElement(element.id)} />
    </div>
  )
}

const AddElementMenu: FC<{ wireframeId: string }> = ({ wireframeId }) => {
  const [open, setOpen] = useState(false)
  const addUIElement = useGraphStore((s) => s.addUIElement)
  return (
    <div style={{ marginTop: SPACING["1"] }}>
      <Dropdown
        open={open}
        onOpenChange={setOpen}
        trigger={<DropdownTrigger label="+ 요소 추가하기" open={open} variant="text" />}
      >
        {UI_ELEMENT_TYPES.map((t) => (
          <DropdownItem
            key={t}
            label={BLOCK_DEF_MAP[t].label}
            onClick={() => {
              addUIElement(wireframeId, t)
              setOpen(false)
            }}
          />
        ))}
      </Dropdown>
    </div>
  )
}

const PAGE_ROW: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: SPACING["2"],
  width: "100%",
  padding: `${SPACING["1"]} ${SPACING["2"]}`,
  border: "none",
  borderRadius: RADIUS.SM,
  cursor: "pointer",
  color: COLOR.TEXT_PRIMARY,
}
const PAGE_NAME: CSSProperties = { ...TYPOGRAPHY.STYLE.LABEL_1, flex: 1, minWidth: 0, textAlign: "left" }
const LAYERS: CSSProperties = {
  marginLeft: SPACING["3"],
  paddingLeft: SPACING["2"],
  borderLeft: `1px solid ${COLOR.BORDER_DEFAULT}`,
}
const ROW: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: SPACING["1"],
  borderRadius: RADIUS.SM,
}
const HANDLE: CSSProperties = {
  border: "none",
  background: "transparent",
  color: COLOR.TEXT_MUTED,
  cursor: "grab",
  padding: "0 2px",
  fontSize: "11px",
  lineHeight: 1,
}
const ROW_NAME: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: SPACING["2"],
  flex: 1,
  minWidth: 0,
  border: "none",
  background: "transparent",
  cursor: "pointer",
  padding: `${SPACING["1"]} 0`,
  color: COLOR.TEXT_SECONDARY,
}
const ROW_LABEL: CSSProperties = { ...TYPOGRAPHY.STYLE.LABEL_2, flex: 1, minWidth: 0, textAlign: "left" }
const WARN: CSSProperties = { ...TYPOGRAPHY.STYLE.LABEL_2, color: COLOR.WARNING }
const EMPTY: CSSProperties = { ...TYPOGRAPHY.STYLE.BODY_2, color: COLOR.TEXT_MUTED, padding: SPACING["3"] }
