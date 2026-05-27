"use client";

import {
  type FC,
  type ReactNode,
  type CSSProperties,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
  useId,
  useState,
} from "react";
import { COLOR, INPUT, RADIUS, TYPOGRAPHY } from "@/lib/design-tokens";

// ─── Shared label/hint/error wrapper ──────────────────────────────────────────

interface FieldWrapperProps {
  label?: ReactNode;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  htmlFor?: string;
  children: ReactNode;
}

function FieldWrapper({ label, hint, error, required, htmlFor, children }: FieldWrapperProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={htmlFor}
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
      {children}
      {error && (
        <span className="text-xs" style={{ color: COLOR.NEGATIVE }}>
          {error}
        </span>
      )}
    </div>
  );
}

// ─── Field-level style (shared by Input + TextArea) ───────────────────────────

function fieldStyle(opts: { focused: boolean; hovered: boolean; hasError: boolean; disabled: boolean }): CSSProperties {
  const { focused, hovered, hasError, disabled } = opts;
  const borderColor = hasError
    ? INPUT.BORDER_ERROR
    : focused
      ? INPUT.BORDER_FOCUS
      : hovered
        ? INPUT.BORDER_HOVER
        : INPUT.BORDER_DEFAULT;
  const bg = disabled ? INPUT.BG_DISABLED : hovered && !focused ? INPUT.BG_HOVER : INPUT.BG_DEFAULT;
  const shadow = hasError ? INPUT.SHADOW_ERROR : focused ? INPUT.SHADOW_FOCUS : "none";
  return {
    width: "100%",
    padding: "10px 14px",
    fontSize: TYPOGRAPHY.SIZE.SM,
    borderRadius: RADIUS.MD,
    border: `1px solid ${borderColor}`,
    background: bg,
    color: COLOR.TEXT_PRIMARY,
    outline: "none",
    boxShadow: shadow,
    transition: INPUT.TRANSITION,
  };
}

// ─── Input ────────────────────────────────────────────────────────────────────

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
}

export const Input: FC<InputProps> = ({
  label,
  hint,
  error,
  required,
  id,
  className,
  style,
  disabled,
  onFocus,
  onBlur,
  onMouseEnter,
  onMouseLeave,
  ...rest
}) => {
  const autoId = useId();
  const inputId = id ?? autoId;
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const hasError = !!error;

  return (
    <FieldWrapper label={label} hint={hint} error={error} required={required} htmlFor={inputId}>
      <input
        id={inputId}
        disabled={disabled}
        className={className}
        aria-invalid={hasError || undefined}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        onMouseEnter={(e) => {
          setHovered(true);
          onMouseEnter?.(e);
        }}
        onMouseLeave={(e) => {
          setHovered(false);
          onMouseLeave?.(e);
        }}
        style={{ ...fieldStyle({ focused, hovered, hasError, disabled: !!disabled }), ...style }}
        {...rest}
      />
    </FieldWrapper>
  );
};

// ─── TextArea ─────────────────────────────────────────────────────────────────

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  monospace?: boolean;
}

export const TextArea: FC<TextAreaProps> = ({
  label,
  hint,
  error,
  required,
  id,
  className,
  style,
  disabled,
  monospace,
  onFocus,
  onBlur,
  onMouseEnter,
  onMouseLeave,
  rows = 4,
  ...rest
}) => {
  const autoId = useId();
  const taId = id ?? autoId;
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const hasError = !!error;

  return (
    <FieldWrapper label={label} hint={hint} error={error} required={required} htmlFor={taId}>
      <textarea
        id={taId}
        disabled={disabled}
        rows={rows}
        className={className}
        aria-invalid={hasError || undefined}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        onMouseEnter={(e) => {
          setHovered(true);
          onMouseEnter?.(e);
        }}
        onMouseLeave={(e) => {
          setHovered(false);
          onMouseLeave?.(e);
        }}
        style={{
          ...fieldStyle({ focused, hovered, hasError, disabled: !!disabled }),
          resize: "vertical",
          minHeight: 72,
          fontFamily: monospace
            ? "ui-monospace, SFMono-Regular, Menlo, monospace"
            : undefined,
          ...style,
        }}
        {...rest}
      />
    </FieldWrapper>
  );
};
