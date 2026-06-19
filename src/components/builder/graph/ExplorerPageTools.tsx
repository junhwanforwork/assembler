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
import type { ProjectGraph, UIElement } from "@/lib/types/assembler"
import { UI_ELEMENT_TYPES } from "@/lib/types/assembler"
import { useGraphStore } from "@/lib/store/graph"
import { elementsOfPage, isMappingComplete } from "@/lib/graph/selectors"
import { BLOCK_DEF_MAP } from "@/lib/builder/block-catalog"
import { Dropdown, DropdownTrigger, DropdownItem } from "@/components/ui"
import { COLOR, RADIUS, SPACING, TYPOGRAPHY } from "@/lib/design-tokens"
import { ElementIcon } from "./tree/icons"
import { InlineDeleteButton } from "./shared/InlineDeleteButton"

// 통합 트리(ASS-070)가 흡수하지 못하는 요소 편집(드래그 정렬·추가·삭제)을 보존하는 도구 블록.
// 트리에서 page/element 선택 시 해당 페이지 요소를 정렬·추가·삭제할 수 있게 트리 하단에 노출.
export const ExplorerPageTools: FC<{ graph: ProjectGraph }> = ({ graph }) => {
  const selectedPageId = useGraphStore((s) => s.selectedPageId)
  if (!selectedPageId) return null
  const page = graph.pages.find((p) => p.id === selectedPageId)
  if (!page) return null

  return (
    <div style={WRAP}>
      <p style={HEADING}>요소 편집 · {page.name}</p>
      <LayerList wireframeId={page.wireframeId} graph={graph} pageId={page.id} />
    </div>
  )
}

const LayerList: FC<{ wireframeId: string; graph: ProjectGraph; pageId: string }> = ({
  wireframeId,
  graph,
  pageId,
}) => {
  const reorderUIElements = useGraphStore((s) => s.reorderUIElements)
  const elements = elementsOfPage(graph, pageId)
  const ids = elements.map((e) => e.id)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const from = ids.indexOf(String(active.id))
    const to = ids.indexOf(String(over.id))
    if (from < 0 || to < 0) return
    reorderUIElements(wireframeId, arrayMove(ids, from, to))
  }

  return (
    <div>
      {elements.length === 0 ? (
        <p style={EMPTY}>아직 요소가 없어요. 아래에서 요소를 추가해 보세요.</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            {elements.map((el) => (
              <SortableLayerRow key={el.id} element={el} />
            ))}
          </SortableContext>
        </DndContext>
      )}
      <AddElementMenu wireframeId={wireframeId} />
    </div>
  )
}

const SortableLayerRow: FC<{ element: UIElement }> = ({ element }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: element.id,
  })
  const selected = useGraphStore((s) => s.selectedElementId === element.id)
  const selectNode = useGraphStore((s) => s.selectNode)
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
      <button type="button" onClick={() => selectNode("element", element.id)} style={ROW_NAME}>
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

const WRAP: CSSProperties = {
  marginTop: SPACING["3"],
  paddingTop: SPACING["3"],
  borderTop: `1px solid ${COLOR.BORDER_DEFAULT}`,
}
const HEADING: CSSProperties = {
  ...TYPOGRAPHY.STYLE.LABEL_2,
  color: COLOR.TEXT_MUTED,
  margin: `0 0 ${SPACING["2"]}`,
  paddingLeft: SPACING["2"],
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
const EMPTY: CSSProperties = {
  ...TYPOGRAPHY.STYLE.BODY_2,
  color: COLOR.TEXT_MUTED,
  padding: `${SPACING["1"]} ${SPACING["2"]}`,
  margin: 0,
}
