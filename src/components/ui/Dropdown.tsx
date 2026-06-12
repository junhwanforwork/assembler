"use client";

import { useEffect, useRef, useState, type CSSProperties, type FC, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { COLOR, SHADOW, RADIUS } from "@/lib/design-tokens";

export interface DropdownProps {
  trigger: ReactNode;
  children: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  align?: "left" | "right";
  title?: string;
  /** Extra classes applied to the wrapper div (e.g. "flex-1 min-w-0" for full-width triggers) */
  className?: string;
}

export const Dropdown: FC<DropdownProps> = ({
  trigger,
  children,
  open,
  onOpenChange,
  align = "left",
  title,
  className,
}) => {
  const triggerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});

  useEffect(() => {
    if (!open || !triggerRef.current) return;

    function updatePosition() {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      // Use actual panel height when available (after first render), fall back to estimate
      const panelHeight = panelRef.current?.offsetHeight ?? 320;
      const spaceBelow = window.innerHeight - rect.bottom - 8;
      const spaceAbove = rect.top - 8;
      // Flip upward only when there's clearly more space above than below
      const showAbove = spaceBelow < panelHeight && spaceAbove > spaceBelow;
      const maxHeight = Math.min(320, (showAbove ? spaceAbove : spaceBelow) - 8);

      setPanelStyle({
        position: "fixed",
        ...(showAbove ? { bottom: window.innerHeight - rect.top + 6 } : { top: rect.bottom + 6 }),
        ...(align === "right" ? { right: window.innerWidth - rect.right } : { left: rect.left }),
        zIndex: 9999,
        maxHeight,
      });
    }

    updatePosition(); // initial pass (panel not yet measured)
    // Second pass after panel has mounted — corrects flip using actual height
    const rafId = requestAnimationFrame(updatePosition);

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, align]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      onOpenChange(false);
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [open, onOpenChange]);

  // Escape key closes the panel
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onOpenChange(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  const panel = open ? (
    <div
      ref={panelRef}
      className="dropdown_panel"
      style={{
        ...panelStyle,
        background: COLOR.BG_BASE,
        borderRadius: RADIUS["2XL"],
        boxShadow: SHADOW.DROPDOWN,
        minWidth: "200px",
        padding: "16px",
        overflowY: "auto",
      }}
    >
      {title && (
        <p className="text-sm font-semibold mb-3" style={{ color: COLOR.TEXT_PRIMARY }}>
          {title}
        </p>
      )}
      <div className="flex flex-col gap-[2px]">{children}</div>
    </div>
  ) : null;

  return (
    <div
      className={`dropdown_wrap relative inline-block${className ? ` ${className}` : ""}`}
      ref={triggerRef}
    >
      <div onClick={() => onOpenChange(!open)}>{trigger}</div>
      {typeof document !== "undefined" && panel ? createPortal(panel, document.body) : null}
    </div>
  );
};

// ─── Trigger button ───────────────────────────────────────────────────────────

/** Visual style variants for DropdownTrigger.
 *
 * filled   — accent-colored background, white text (primary action)
 * outlined — pill with border; selected state → accent bg + border (default)
 * text     — no border, no background; just label + chevron (subtle, inline)
 * ghost    — surface-tinted background, no border
 */
export type DropdownTriggerVariant = "filled" | "outlined" | "text" | "ghost";

export interface DropdownTriggerProps {
  label: string;
  isSelected?: boolean;
  disabled?: boolean;
  open?: boolean;
  title?: string;
  variant?: DropdownTriggerVariant;
}

function triggerStyles(
  variant: DropdownTriggerVariant,
  isSelected: boolean,
  disabled: boolean
): React.CSSProperties {
  const base: React.CSSProperties = {
    borderRadius: "999px",
    cursor: disabled ? "not-allowed" : "pointer",
  };

  switch (variant) {
    case "filled":
      return {
        ...base,
        border: "none",
        background: isSelected ? COLOR.ACCENT_HOVER : COLOR.ACCENT,
        color: COLOR.TEXT_INVERSE,
      };
    case "outlined":
      return {
        ...base,
        border: `1px solid ${isSelected ? COLOR.ACCENT : COLOR.BORDER_DEFAULT}`,
        background: isSelected ? COLOR.ACCENT_BG : COLOR.BG_BASE,
        color: isSelected ? COLOR.ACCENT : COLOR.TEXT_PRIMARY,
      };
    case "text":
      // Subtle surface bg + ghost border — reads as an interactive chip without visual weight
      return {
        ...base,
        border: `1px solid ${COLOR.BORDER_DEFAULT}`,
        background: COLOR.BG_SURFACE,
        color: COLOR.TEXT_PRIMARY,
        borderRadius: RADIUS.SM,
      };
    case "ghost":
      return {
        ...base,
        border: "none",
        background: isSelected ? COLOR.ACCENT_BG : COLOR.BG_SURFACE,
        color: isSelected ? COLOR.ACCENT : COLOR.TEXT_PRIMARY,
      };
  }
}

export const DropdownTrigger: FC<DropdownTriggerProps> = ({
  label,
  isSelected = false,
  disabled = false,
  open: _open = false,
  title,
  variant = "outlined",
}) => {
  return (
    <button
      type="button"
      disabled={disabled}
      title={title}
      className="dropdown_trigger"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "6px 12px",
        fontSize: "13px",
        fontWeight: 500,
        opacity: disabled ? 0.5 : 1,
        ...triggerStyles(variant, isSelected, disabled),
      }}
    >
      {label}
      <svg
        width="8"
        height="8"
        viewBox="0 0 8 8"
        fill="none"
        aria-hidden="true"
        style={{
          transform: _open ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 120ms ease",
        }}
      >
        <path
          d="M1 2.5L4 5.5L7 2.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
};
