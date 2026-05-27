"use client";

import {
  type FC,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { COLOR, INPUT, RADIUS, SHADOW, TYPOGRAPHY, Z_INDEX } from "@/lib/design-tokens";

export interface SelectOption {
  value: string;
  label: string;
}

export type SelectSize = "sm" | "md";

export interface SelectProps {
  value: string;
  onChange: (next: string) => void;
  options: SelectOption[];
  placeholder?: string;
  label?: ReactNode;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  /** sm = 인라인 헤더용(32px), md = 폼 기본(40px) */
  size?: SelectSize;
  /** menu 최대 높이 (px). 옵션이 많을 때 스크롤 */
  maxMenuHeight?: number;
  /** 라벨 없는 인라인용 aria-label */
  "aria-label"?: string;
}

/**
 * Select — 커스텀 드롭다운. native <select> 의 OS 룩을 피하고,
 * focus·hover·키보드 네비게이션을 일관되게 처리.
 *
 * 키보드: Enter/Space 열기, Esc 닫기, ↑↓ 항목 이동, Enter 선택.
 */
export const Select: FC<SelectProps> = ({
  value,
  onChange,
  options,
  placeholder = "선택해 주세요",
  label,
  hint,
  error,
  required,
  disabled,
  id,
  size = "md",
  maxMenuHeight = 280,
  "aria-label": ariaLabel,
}) => {
  const autoId = useId();
  const triggerId = id ?? autoId;
  const listboxId = `${triggerId}-listbox`;
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState<number>(-1);
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const hasError = !!error;

  const selectedIdx = options.findIndex((o) => o.value === value);
  const selectedLabel = selectedIdx >= 0 ? options[selectedIdx].label : null;

  // 바깥 클릭 → 닫기
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  // 열릴 때 hover 인덱스를 현재 선택값으로 동기화
  useEffect(() => {
    if (open) setHoveredIdx(selectedIdx >= 0 ? selectedIdx : 0);
  }, [open, selectedIdx]);

  const commit = useCallback(
    (idx: number) => {
      if (idx < 0 || idx >= options.length) return;
      onChange(options[idx].value);
      setOpen(false);
      triggerRef.current?.focus();
    },
    [onChange, options],
  );

  function onTriggerKey(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }
  function onListKey(e: React.KeyboardEvent<HTMLUListElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHoveredIdx((i) => Math.min(options.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHoveredIdx((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      commit(hoveredIdx);
    }
  }

  const triggerBorder = hasError
    ? INPUT.BORDER_ERROR
    : open || focused
      ? INPUT.BORDER_FOCUS
      : hovered
        ? INPUT.BORDER_HOVER
        : INPUT.BORDER_DEFAULT;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={triggerId}
          className="text-sm font-medium"
          style={{ color: COLOR.TEXT_PRIMARY }}
        >
          {label}
          {required && <span style={{ color: COLOR.ACCENT }}> *</span>}
        </label>
      )}
      {hint && !error && (
        <span className="text-xs" style={{ color: COLOR.TEXT_MUTED }}>
          {hint}
        </span>
      )}

      <div ref={wrapRef} className="relative">
        <button
          ref={triggerRef}
          id={triggerId}
          type="button"
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-invalid={hasError || undefined}
          aria-label={label ? undefined : ariaLabel}
          disabled={disabled}
          onClick={() => !disabled && setOpen((o) => !o)}
          onKeyDown={onTriggerKey}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className="w-full flex items-center justify-between text-left outline-none"
          style={{
            padding: size === "sm" ? "6px 12px" : "10px 14px",
            height: size === "sm" ? 32 : undefined,
            fontSize: TYPOGRAPHY.SIZE.SM,
            borderRadius: RADIUS.MD,
            border: `1px solid ${triggerBorder}`,
            background: disabled ? INPUT.BG_DISABLED : INPUT.BG_DEFAULT,
            color: selectedLabel ? COLOR.TEXT_PRIMARY : COLOR.TEXT_MUTED,
            boxShadow: hasError
              ? INPUT.SHADOW_ERROR
              : open || focused
                ? INPUT.SHADOW_FOCUS
                : "none",
            transition: INPUT.TRANSITION,
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.55 : 1,
          }}
        >
          <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {selectedLabel ?? placeholder}
          </span>
          <Caret open={open} />
        </button>

        {open && (
          <ul
            id={listboxId}
            role="listbox"
            tabIndex={-1}
            // 마운트 직후 키보드 흐름 유지를 위해 autoFocus
            ref={(el) => el?.focus()}
            onKeyDown={onListKey}
            className="absolute left-0 right-0 mt-1 overflow-auto outline-none"
            style={{
              top: "100%",
              maxHeight: maxMenuHeight,
              zIndex: Z_INDEX.DROPDOWN,
              background: COLOR.BG_CARD,
              border: `1px solid ${COLOR.BORDER_DEFAULT}`,
              borderRadius: RADIUS.MD,
              boxShadow: SHADOW.DROPDOWN,
              padding: 4,
            }}
          >
            {options.length === 0 && (
              <li
                className="px-3 py-2 text-sm"
                style={{ color: COLOR.TEXT_MUTED }}
                role="presentation"
              >
                선택할 수 있는 항목이 없어요
              </li>
            )}
            {options.map((opt, i) => {
              const isSelected = opt.value === value;
              const isHover = i === hoveredIdx;
              return (
                <li
                  key={opt.value || `__empty_${i}`}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setHoveredIdx(i)}
                  onMouseDown={(e) => {
                    e.preventDefault(); // blur 방지
                    commit(i);
                  }}
                  className="cursor-pointer flex items-center justify-between"
                  style={{
                    padding: "8px 12px",
                    fontSize: TYPOGRAPHY.SIZE.SM,
                    borderRadius: RADIUS.SM,
                    background: isHover ? COLOR.BG_ELEVATED : "transparent",
                    color: isSelected ? COLOR.ACCENT : COLOR.TEXT_PRIMARY,
                    fontWeight: isSelected ? 600 : 400,
                  }}
                >
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {opt.label}
                  </span>
                  {isSelected && <CheckMark />}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {error && (
        <span className="text-xs" style={{ color: COLOR.NEGATIVE }}>
          {error}
        </span>
      )}
    </div>
  );
};

function Caret({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
      style={{
        flexShrink: 0,
        marginLeft: 8,
        transform: open ? "rotate(180deg)" : "rotate(0)",
        transition: "transform 150ms ease",
        color: COLOR.TEXT_MUTED,
      }}
    >
      <path d="M3.5 5.25l3.5 3.5 3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckMark() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M2.5 7.5l3 3 6-6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
