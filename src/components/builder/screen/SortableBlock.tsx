"use client";

import { memo, type FC, type CSSProperties } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { COLOR, RADIUS, SPACING, DURATION, EASE } from "@/lib/design-tokens";
import type { Block } from "@/lib/types/builder";
import { useBuilderStore } from "@/lib/store/builder";
import { BlockRenderer } from "./BlockRenderer";

interface SortableBlockProps {
  block: Block;
  screenId: string;
}

// BlockRenderer를 useSortable로 감싼다. 드래그 핸들·선택·삭제를 붙인다.
// memo — 한 블록을 편집해도 다른 블록은 props(block 참조)가 그대로라 재렌더하지 않는다.
const SortableBlockImpl: FC<SortableBlockProps> = ({ block, screenId }) => {
  const selectedBlockId = useBuilderStore((s) => s.selectedBlockId);
  const selectBlock = useBuilderStore((s) => s.selectBlock);
  const removeBlock = useBuilderStore((s) => s.removeBlock);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  });

  const isSelected = selectedBlockId === block.id;

  const wrapStyle: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    position: "relative",
    display: "flex",
    alignItems: "flex-start",
    gap: SPACING["2"],
    padding: SPACING["3"],
    borderRadius: RADIUS.MD,
    backgroundColor: COLOR.BG_SECTION,
    border: `1px solid ${isSelected ? COLOR.ACCENT : COLOR.BORDER_DEFAULT}`,
    boxShadow: isSelected ? `0 0 0 1px ${COLOR.ACCENT}` : "none",
    opacity: isDragging ? 0.45 : 1,
    cursor: "pointer",
    transitionProperty: "border-color, box-shadow",
    transitionDuration: DURATION.FAST,
    transitionTimingFunction: EASE.DEFAULT,
  };

  return (
    <div
      ref={setNodeRef}
      style={wrapStyle}
      className="sortable_block_wrap"
      onClick={() => selectBlock(block.id)}
    >
      {/* 드래그 핸들 — 여기만 잡아야 정렬이 시작됨 (블록 본문 클릭은 선택용) */}
      <button
        type="button"
        aria-label="블록 옮기기"
        className="sortable_block_handle"
        style={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "20px",
          height: "24px",
          background: "transparent",
          border: "none",
          cursor: "grab",
          color: COLOR.TEXT_MUTED,
          touchAction: "none",
        }}
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
      >
        <svg width="12" height="16" viewBox="0 0 12 16" fill="none" aria-hidden="true">
          {[3, 8, 13].map((cy) =>
            [3, 9].map((cx) => (
              <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.4" fill="currentColor" />
            ))
          )}
        </svg>
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        <BlockRenderer block={block} />
      </div>

      {/* 삭제 — 선택 여부와 무관하게 항상 노출 */}
      <button
        type="button"
        aria-label="블록 삭제"
        className="sortable_block_delete"
        style={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "24px",
          height: "24px",
          background: "transparent",
          border: "none",
          borderRadius: RADIUS.SM,
          cursor: "pointer",
          color: COLOR.TEXT_MUTED,
        }}
        onClick={(e) => {
          e.stopPropagation();
          removeBlock(screenId, block.id);
        }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path
            d="M3 3L11 11M11 3L3 11"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  );
};

export const SortableBlock = memo(SortableBlockImpl);
