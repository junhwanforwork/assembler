"use client";

import { useState, type FC, type CSSProperties, type ChangeEvent } from "react";
import { COLOR, INPUT, RADIUS, TYPOGRAPHY } from "@/lib/design-tokens";

export interface TextAreaProps {
  label?: string;
  required?: boolean;
  optional?: boolean;
  id?: string;
  name?: string;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  state?: "default" | "error" | "disabled";
  helperText?: string;
  errorMessage?: string;
  maxLength?: number;
  rows?: number;
  resize?: "none" | "vertical";
  className?: string;
}

function getTextareaStyle(
  state: "default" | "error" | "disabled",
  isFocused: boolean,
  isHovered: boolean,
  rows: number,
  resize: "none" | "vertical"
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

  const minHeight = `${rows * 24 + 20}px`;

  return {
    width: "100%",
    minHeight,
    fontFamily: "inherit",
    fontSize: "14px",
    color: COLOR.TEXT_PRIMARY,
    backgroundColor: bg,
    borderRadius: RADIUS.MD,
    border: `${borderWidth} solid ${borderColor}`,
    boxShadow,
    outline: "none",
    transition: INPUT.TRANSITION,
    padding: "10px 14px",
    resize,
    lineHeight: 1.6,
    opacity: isDisabled ? 0.5 : 1,
    cursor: isDisabled ? "not-allowed" : "text",
    boxSizing: "border-box",
  };
}

export const TextArea: FC<TextAreaProps> = ({
  label,
  required,
  optional,
  id,
  name,
  placeholder,
  value,
  onChange,
  state = "default",
  helperText,
  errorMessage,
  maxLength,
  rows = 4,
  resize = "vertical",
  className,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const isDisabled = state === "disabled";
  const textareaStyle = getTextareaStyle(state, isFocused, isHovered, rows, resize);

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
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
      className={`text_area_wrap${className ? ` ${className}` : ""}`}
      style={{ display: "flex", flexDirection: "column", width: "100%" }}
    >
      {label && (
        <label htmlFor={id} style={labelStyle}>
          {label}
          {required && <span style={{ color: COLOR.NEGATIVE, fontWeight: 400 }}>*</span>}
          {optional && (
            <span style={{ color: COLOR.TEXT_MUTED, fontSize: "12px", fontWeight: 400 }}>
              (선택)
            </span>
          )}
        </label>
      )}

      <textarea
        id={id}
        name={name}
        style={textareaStyle}
        placeholder={placeholder}
        value={value}
        disabled={isDisabled}
        maxLength={maxLength}
        rows={rows}
        onChange={handleChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onMouseEnter={() => !isDisabled && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />

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
