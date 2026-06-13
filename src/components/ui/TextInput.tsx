"use client";

import {
  useState,
  useId,
  type FC,
  type ReactNode,
  type CSSProperties,
  type ChangeEvent,
} from "react";
import { COLOR, INPUT, RADIUS, TYPOGRAPHY } from "@/lib/design-tokens";

export interface TextInputProps {
  label?: string;
  required?: boolean;
  optional?: boolean;
  id?: string;
  name?: string;
  type?: "text" | "password" | "email" | "number" | "search";
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  state?: "default" | "error" | "disabled";
  helperText?: string;
  errorMessage?: string;
  maxLength?: number;
  size?: "sm" | "md" | "lg";
  leftSlot?: ReactNode;
  rightSlot?: ReactNode;
  onBlur?: () => void;
  onEnter?: () => void;
  ariaLabel?: string;
  className?: string;
}

function getFieldStyle(
  state: "default" | "error" | "disabled",
  isFocused: boolean,
  isHovered: boolean,
  size: "sm" | "md" | "lg",
  hasLeftSlot: boolean,
  hasRightSlot: boolean
): CSSProperties {
  const isError = state === "error";
  const isDisabled = state === "disabled";

  let borderColor: string = INPUT.BORDER_DEFAULT;
  let borderWidth = "1px";
  let boxShadow = "none";
  let bg: string = INPUT.BG_DEFAULT;

  if (isDisabled) {
    bg = INPUT.BG_DISABLED;
  } else if (isFocused) {
    borderColor = isError ? INPUT.BORDER_ERROR : INPUT.BORDER_FOCUS;
    borderWidth = "1.5px";
    boxShadow = isError ? INPUT.SHADOW_ERROR : INPUT.SHADOW_FOCUS;
    bg = INPUT.BG_DEFAULT;
  } else if (isError) {
    borderColor = INPUT.BORDER_ERROR;
    borderWidth = "1.5px";
  } else if (isHovered) {
    borderColor = INPUT.BORDER_HOVER;
    bg = INPUT.BG_HOVER;
  }

  const height = size === "sm" ? "36px" : size === "lg" ? "44px" : "40px";
  const fontSize = size === "sm" ? TYPOGRAPHY.SIZE.SM : "14px";
  const paddingH = size === "sm" ? "12px" : size === "lg" ? "16px" : "14px";

  const paddingLeft = hasLeftSlot ? "36px" : paddingH;
  const paddingRight = hasRightSlot ? "36px" : paddingH;

  return {
    width: "100%",
    height,
    fontFamily: "inherit",
    fontSize,
    color: COLOR.TEXT_PRIMARY,
    backgroundColor: bg,
    borderRadius: RADIUS.MD,
    border: `${borderWidth} solid ${borderColor}`,
    boxShadow,
    outline: "none",
    transition: INPUT.TRANSITION,
    padding: `0 ${paddingRight} 0 ${paddingLeft}`,
    opacity: isDisabled ? 0.5 : 1,
    cursor: isDisabled ? "not-allowed" : "text",
    boxSizing: "border-box",
  };
}

export const TextInput: FC<TextInputProps> = ({
  label,
  required,
  optional,
  id,
  name,
  type = "text",
  placeholder,
  value,
  defaultValue,
  onChange,
  state = "default",
  helperText,
  errorMessage,
  maxLength,
  size = "md",
  leftSlot,
  rightSlot,
  onBlur,
  onEnter,
  ariaLabel,
  className,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const autoId = useId();
  const resolvedId = id ?? autoId;

  const isDisabled = state === "disabled";
  const hasLeftSlot = leftSlot !== undefined;
  const hasRightSlot = rightSlot !== undefined;

  const fieldStyle = getFieldStyle(state, isFocused, isHovered, size, hasLeftSlot, hasRightSlot);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange?.(e.target.value);
  };

  const charCount = (value ?? "").length;
  const isOverLimit = maxLength !== undefined && charCount > maxLength;

  const helperStyle: CSSProperties = {
    fontSize: TYPOGRAPHY.SIZE.XS,
    lineHeight: 1.4,
    marginTop: "4px",
  };

  const labelStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    fontSize: TYPOGRAPHY.SIZE.SM,
    fontWeight: TYPOGRAPHY.WEIGHT.SEMIBOLD,
    color: COLOR.TEXT_SECONDARY,
    marginBottom: "6px",
  };

  return (
    <div
      className={`text_input_wrap${className ? ` ${className}` : ""}`}
      style={{ display: "flex", flexDirection: "column", width: "100%" }}
    >
      {label && (
        <label htmlFor={resolvedId} style={labelStyle}>
          {label}
          {required && <span style={{ color: COLOR.NEGATIVE, fontWeight: 400 }}>*</span>}
          {optional && (
            <span style={{ color: COLOR.TEXT_MUTED, fontSize: "12px", fontWeight: 400 }}>
              (선택)
            </span>
          )}
        </label>
      )}

      <div style={{ position: "relative", width: "100%" }}>
        {hasLeftSlot && (
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: "36px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
              zIndex: 1,
            }}
          >
            {leftSlot}
          </div>
        )}

        <input
          id={resolvedId}
          name={name}
          type={type}
          aria-label={ariaLabel}
          style={fieldStyle}
          placeholder={placeholder}
          value={value}
          defaultValue={defaultValue}
          disabled={isDisabled}
          maxLength={maxLength}
          onChange={handleChange}
          onKeyDown={(e) => {
            if (e.key === "Enter") onEnter?.();
          }}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false);
            onBlur?.();
          }}
          onMouseEnter={() => !isDisabled && setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        />

        {hasRightSlot && (
          <div
            style={{
              position: "absolute",
              right: 0,
              top: 0,
              bottom: 0,
              width: "36px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1,
            }}
          >
            {rightSlot}
          </div>
        )}
      </div>

      {(helperText || errorMessage || maxLength !== undefined) && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <span style={{ flex: 1 }}>
            {state === "error" && errorMessage && (
              <span style={{ ...helperStyle, color: COLOR.NEGATIVE }}>{errorMessage}</span>
            )}
            {state !== "error" && helperText && (
              <span style={{ ...helperStyle, color: COLOR.TEXT_MUTED }}>{helperText}</span>
            )}
          </span>

          {maxLength !== undefined && (
            <span
              style={{
                ...helperStyle,
                color: isOverLimit ? COLOR.NEGATIVE : COLOR.TEXT_MUTED,
                flexShrink: 0,
                marginLeft: "8px",
              }}
            >
              {charCount}/{maxLength}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
