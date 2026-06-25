"use client";

import { type FC, type ReactElement, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { COLOR, Z_INDEX } from "@/lib/design-tokens";

interface TooltipProps {
  content: string;
  children: ReactElement;
  position?: "top" | "bottom" | "left" | "right";
}

// 테마와 무관하게 항상 다크 배경 + 흰 텍스트
// (다크모드에서 TEXT_INVERSE가 어두운 색이 되어 안 보이는 문제 방지)
const TOOLTIP_BASE: React.CSSProperties = {
  position: "fixed",
  backgroundColor: COLOR.TOAST_BG,
  color: COLOR.TOAST_TEXT,
  fontSize: 11,
  fontWeight: 500,
  padding: "4px 8px",
  borderRadius: 6,
  whiteSpace: "nowrap",
  pointerEvents: "none",
  zIndex: Z_INDEX.DROPDOWN,
};

// overflow-hidden 부모에서도 잘리지 않도록 createPortal로 document.body에 렌더링
export const Tooltip: FC<TooltipProps> = ({ content, children, position = "top" }) => {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!visible || !wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    const GAP = 4;
    let top = 0;
    let left = 0;
    switch (position) {
      case "top":
        top = rect.top - GAP;
        left = rect.left + rect.width / 2;
        break;
      case "bottom":
        top = rect.bottom + GAP;
        left = rect.left + rect.width / 2;
        break;
      case "left":
        top = rect.top + rect.height / 2;
        left = rect.left - GAP;
        break;
      case "right":
        top = rect.top + rect.height / 2;
        left = rect.right + GAP;
        break;
    }
    setCoords({ top, left });
  }, [visible, position]);

  const transformStyle: React.CSSProperties =
    position === "top"
      ? { transform: "translateX(-50%) translateY(-100%)" }
      : position === "bottom"
        ? { transform: "translateX(-50%)" }
        : position === "left"
          ? { transform: "translateX(-100%) translateY(-50%)" }
          : { transform: "translateY(-50%)" };

  return (
    <div
      ref={wrapperRef}
      style={{ position: "relative", display: "inline-flex" }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible &&
        createPortal(
          <div style={{ ...TOOLTIP_BASE, top: coords.top, left: coords.left, ...transformStyle }}>
            {content}
          </div>,
          document.body
        )}
    </div>
  );
};
