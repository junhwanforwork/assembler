"use client";

import { type FC } from "react";
import { TextInput } from "./TextInput";
import { TextArea } from "./TextArea";

export type InputType = "text" | "textarea";
export type InputState = "default" | "error" | "disabled";

export interface InputProps {
  type?: InputType;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  state?: InputState;
  helperText?: string;
  errorMessage?: string;
  maxLength?: number;
}

/**
 * Input — thin backwards-compat wrapper.
 * New code should use TextInput or TextArea directly.
 */
export const Input: FC<InputProps> = ({ type = "text", ...props }) => {
  if (type === "textarea") {
    return <TextArea {...props} />;
  }
  return <TextInput {...props} />;
};
