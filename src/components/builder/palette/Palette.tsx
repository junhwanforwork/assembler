"use client";

import { memo, useCallback, type FC, type CSSProperties } from "react";
import { useDraggable } from "@dnd-kit/core";
import { COLOR, RADIUS, SPACING, TYPOGRAPHY, INTERACTION } from "@/lib/design-tokens";
import type { BlockType } from "@/lib/types/builder";
import { BLOCK_DEFS } from "@/lib/builder/block-catalog";
import { useBuilderStore } from "@/lib/store/builder";

// 좌측 팔레트. 각 칩은 ScreenEditor의 DndContext에서 드래그되며(useDraggable),
// 클릭하면 활성 화면 맨 끝에 블록을 추가한다(드래그 없이도 동작).

interface PaletteChipProps {
  type: BlockType;
  label: string;
  disabled: boolean;
  onAppend: (type: BlockType) => void;
}

const PaletteChip: FC<PaletteChipProps> = memo(({ type, label, disabled, onAppend }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${type}`,
    data: { fromPalette: type },
    disabled,
  });

  const chipStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: SPACING["2"],
    width: "100%",
    padding: `${SPACING["3"]} ${SPACING["3"]}`,
    borderRadius: RADIUS.MD,
    backgroundColor: COLOR.BG_SECTION,
    border: `1px solid ${COLOR.BORDER_DEFAULT}`,
    color: COLOR.TEXT_PRIMARY,
    cursor: disabled ? "not-allowed" : "grab",
    opacity: isDragging ? 0.45 : disabled ? 0.5 : 1,
    textAlign: "left",
    touchAction: "none",
    transition: INTERACTION.TRANSITION_BG,
    ...TYPOGRAPHY.STYLE.LABEL_1,
  };

  return (
    <button
      type="button"
      ref={setNodeRef}
      className="palette_chip"
      style={chipStyle}
      disabled={disabled}
      onClick={() => onAppend(type)}
      onMouseEnter={(e) => {
        if (!disabled) e.currentTarget.style.backgroundColor = INTERACTION.HOVER_BG_SURFACE;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = COLOR.BG_SECTION;
      }}
      {...attributes}
      {...listeners}
    >
      <span
        aria-hidden="true"
        style={{
          flexShrink: 0,
          width: "16px",
          height: "16px",
          borderRadius: RADIUS.XS,
          backgroundColor: COLOR.ACCENT_LIGHT,
        }}
      />
      <span>{label}</span>
    </button>
  );
});
PaletteChip.displayName = "PaletteChip";

export const Palette: FC = () => {
  const activeScreenId = useBuilderStore((s) => s.activeScreenId);
  const addBlock = useBuilderStore((s) => s.addBlock);

  const disabled = activeScreenId === null;

  // useCallback — 안정적인 onAppend 참조로 memo된 PaletteChip의 재렌더를 막는다.
  const handleAppend = useCallback(
    (type: BlockType) => {
      if (activeScreenId === null) return;
      addBlock(activeScreenId, type);
    },
    [activeScreenId, addBlock]
  );

  return (
    <div
      className="palette_wrap"
      style={{ display: "flex", flexDirection: "column", gap: SPACING["3"] }}
    >
      <p
        style={{
          ...TYPOGRAPHY.STYLE.LABEL_2,
          fontWeight: TYPOGRAPHY.WEIGHT.SEMIBOLD,
          color: COLOR.TEXT_MUTED,
          margin: 0,
        }}
      >
        컴포넌트
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: SPACING["2"] }}>
        {BLOCK_DEFS.map((def) => (
          <PaletteChip
            key={def.type}
            type={def.type}
            label={def.label}
            disabled={disabled}
            onAppend={handleAppend}
          />
        ))}
      </div>
    </div>
  );
};
