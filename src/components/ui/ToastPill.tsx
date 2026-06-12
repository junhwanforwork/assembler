"use client";

import { type FC } from "react";
import { COLOR } from "@/lib/design-tokens";

interface ToastPillProps {
  // null renders nothing — matches the store's initial state shape
  message: string | null;
}

/**
 * ToastPill — pure presentational layer.
 * Renders the pill's visual style only (bg, shape, text).
 * Positioning (fixed, bottom-center) is the container's responsibility (Toast.tsx).
 * Extracted so Storybook can render it without a zustand provider or viewport concerns.
 */
export const ToastPill: FC<ToastPillProps> = ({ message }) => {
  if (!message) return null;

  return (
    <div
      className="toast_pill text-sm font-medium text-white px-4 py-2 rounded-full whitespace-nowrap"
      style={{
        backgroundColor: COLOR.TOAST_BG,
        boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
        animation: "toastFadeIn 0.15s ease-out",
        pointerEvents: "none",
      }}
      aria-live="polite"
      aria-atomic="true"
    >
      {message}

      {/* Keyframe defined inline — avoids a globals.css dependency for a single component */}
      <style>{`
        @keyframes toastFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};
