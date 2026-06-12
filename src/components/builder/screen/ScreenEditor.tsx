"use client";

/**
 * ScreenEditor — 활성 화면의 중앙 캔버스 + 단일 DndContext 소유자.
 *
 * ── DndContext 합성 결정 ──────────────────────────────────────────────────────
 * 팔레트(useDraggable)와 화면 블록(useSortable)은 **같은** DndContext 안에 있어야
 * 팔레트 → 화면 드롭이 동작한다. 그래서 ScreenEditor가 DndContext를 소유하고,
 * 팔레트를 `palette` prop(ReactNode 슬롯)으로 받아 컨텍스트 내부에 함께 렌더한다.
 *
 * BuilderShell 사용법:
 *   <ScreenEditor palette={<Palette />} />
 * 셸은 palette 슬롯을 좌측 패널에, 화면 컬럼을 중앙에 배치하는 레이아웃만 책임진다.
 * (레이아웃 CSS는 셸이, dnd 배선은 ScreenEditor가 — 책임 분리)
 *
 * 처리하는 두 가지 드래그:
 *  (a) 기존 블록 정렬 — active가 sortable 블록 → reorderBlocks
 *  (b) 팔레트 신규 드롭 — active.data.current.fromPalette === BlockType → addBlock(insertIndex)
 */

import { type FC, type ReactNode, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { COLOR, RADIUS, SPACING, TYPOGRAPHY, SHADOW } from "@/lib/design-tokens";
import type { BlockType } from "@/lib/types/builder";
import { BLOCK_DEF_MAP } from "@/lib/builder/block-catalog";
import { useBuilderStore } from "@/lib/store/builder";
import { SortableBlock } from "./SortableBlock";
import { BlockRenderer } from "./BlockRenderer";

const DROPZONE_ID = "screen-dropzone";

interface ScreenEditorProps {
  /** 같은 DndContext 안에 렌더할 팔레트 슬롯. */
  palette?: ReactNode;
}

// active.data.current에서 팔레트 드래그인지 판별.
function getPaletteType(data: Record<string, unknown> | undefined): BlockType | null {
  if (!data) return null;
  const t = data.fromPalette;
  return typeof t === "string" && t in BLOCK_DEF_MAP ? (t as BlockType) : null;
}

export const ScreenEditor: FC<ScreenEditorProps> = ({ palette }) => {
  const screens = useBuilderStore((s) => s.screens);
  const activeScreenId = useBuilderStore((s) => s.activeScreenId);
  const addBlock = useBuilderStore((s) => s.addBlock);
  const reorderBlocks = useBuilderStore((s) => s.reorderBlocks);

  const [draggingPaletteType, setDraggingPaletteType] = useState<BlockType | null>(null);
  const [draggingBlockId, setDraggingBlockId] = useState<string | null>(null);

  // 클릭과 드래그 구분 — 5px 이동 후에야 드래그 시작.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const activeScreen = screens.find((s) => s.id === activeScreenId) ?? null;
  const blocks = activeScreen?.blocks ?? [];
  const blockIds = blocks.map((b) => b.id);

  const handleDragStart = (e: DragStartEvent) => {
    const paletteType = getPaletteType(e.active.data.current);
    if (paletteType) {
      setDraggingPaletteType(paletteType);
    } else {
      setDraggingBlockId(String(e.active.id));
    }
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const paletteType = getPaletteType(e.active.data.current);
    setDraggingPaletteType(null);
    setDraggingBlockId(null);

    if (!activeScreenId) return;
    const { over } = e;

    // (b) 팔레트 신규 드롭
    if (paletteType) {
      if (!over) {
        // 캔버스 위가 아니면 맨 끝에 추가.
        addBlock(activeScreenId, paletteType);
        return;
      }
      if (over.id === DROPZONE_ID) {
        addBlock(activeScreenId, paletteType);
        return;
      }
      const overIndex = blockIds.indexOf(String(over.id));
      addBlock(activeScreenId, paletteType, overIndex >= 0 ? overIndex : undefined);
      return;
    }

    // (a) 기존 블록 정렬
    if (!over || e.active.id === over.id) return;
    const from = blockIds.indexOf(String(e.active.id));
    const to = blockIds.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    reorderBlocks(activeScreenId, arrayMove(blockIds, from, to));
  };

  const handleDragCancel = () => {
    setDraggingPaletteType(null);
    setDraggingBlockId(null);
  };

  const draggingBlock = draggingBlockId
    ? blocks.find((b) => b.id === draggingBlockId) ?? null
    : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {palette}

      <div className="screen_editor_area" style={CANVAS_AREA_STYLE}>
        {activeScreen === null ? (
          <EmptyScreenState />
        ) : (
          <div className="screen_frame" style={FRAME_STYLE}>
            <p style={{ ...TYPOGRAPHY.STYLE.LABEL_2, color: COLOR.TEXT_MUTED, margin: 0 }}>
              {activeScreen.title}
            </p>
            {blocks.length === 0 ? (
              <DropZone />
            ) : (
              <SortableContext items={blockIds} strategy={verticalListSortingStrategy}>
                <div style={{ display: "flex", flexDirection: "column", gap: SPACING["2"] }}>
                  {blocks.map((block) => (
                    <SortableBlock key={block.id} block={block} screenId={activeScreen.id} />
                  ))}
                </div>
              </SortableContext>
            )}
          </div>
        )}
      </div>

      <DragOverlay>
        {draggingPaletteType ? (
          <div style={OVERLAY_CHIP_STYLE}>{BLOCK_DEF_MAP[draggingPaletteType].label}</div>
        ) : draggingBlock ? (
          <div style={OVERLAY_BLOCK_STYLE}>
            <BlockRenderer block={draggingBlock} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

// ── 빈 상태 ──────────────────────────────────────────────────────────────────

const EmptyScreenState: FC = () => (
  <div style={EMPTY_STATE_STYLE}>
    <p style={{ ...TYPOGRAPHY.STYLE.TITLE_2, color: COLOR.TEXT_PRIMARY, margin: 0 }}>
      화면을 추가해 보세요
    </p>
    <p style={{ ...TYPOGRAPHY.STYLE.BODY_2, color: COLOR.TEXT_MUTED, margin: 0 }}>
      화면을 만들면 여기에 컴포넌트를 쌓을 수 있어요
    </p>
  </div>
);

const DropZone: FC = () => {
  const { setNodeRef, isOver } = useDroppable({ id: DROPZONE_ID });
  return (
    <div
      ref={setNodeRef}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "160px",
        borderRadius: RADIUS.MD,
        border: `1.5px dashed ${isOver ? COLOR.ACCENT : COLOR.BORDER_STRONG}`,
        backgroundColor: isOver ? COLOR.ACCENT_BG : "transparent",
        textAlign: "center",
        padding: SPACING["6"],
      }}
    >
      <p style={{ ...TYPOGRAPHY.STYLE.BODY_2, color: COLOR.TEXT_MUTED, margin: 0 }}>
        여기에 컴포넌트를 끌어다 놓아 보세요
      </p>
    </div>
  );
};

// ── 스타일 ───────────────────────────────────────────────────────────────────

const CANVAS_AREA_STYLE: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  height: "100%",
  overflowY: "auto",
  display: "flex",
  justifyContent: "center",
  padding: SPACING["8"],
};

const FRAME_STYLE: React.CSSProperties = {
  width: "100%",
  maxWidth: "420px",
  display: "flex",
  flexDirection: "column",
  gap: SPACING["3"],
  padding: SPACING["5"],
  borderRadius: RADIUS.LG,
  backgroundColor: COLOR.BG_SURFACE,
  border: `1px solid ${COLOR.BORDER_DEFAULT}`,
  alignSelf: "flex-start",
};

const EMPTY_STATE_STYLE: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: SPACING["2"],
};

const OVERLAY_CHIP_STYLE: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: `${SPACING["2"]} ${SPACING["3"]}`,
  borderRadius: RADIUS.MD,
  backgroundColor: COLOR.BG_SECTION,
  border: `1px solid ${COLOR.ACCENT}`,
  color: COLOR.TEXT_PRIMARY,
  ...TYPOGRAPHY.STYLE.LABEL_1,
};

const OVERLAY_BLOCK_STYLE: React.CSSProperties = {
  padding: SPACING["3"],
  borderRadius: RADIUS.MD,
  backgroundColor: COLOR.BG_SECTION,
  border: `1px solid ${COLOR.ACCENT}`,
  boxShadow: SHADOW.DROPDOWN,
  maxWidth: "380px",
};
