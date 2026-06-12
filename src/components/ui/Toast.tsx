"use client";

import { useToastStore } from "@/lib/store/toast";
import { ToastPill } from "./ToastPill";

/**
 * Toast — container component. Reads from the global toast store and
 * delegates visual rendering to ToastPill.
 * Owns the fixed viewport positioning so ToastPill stays a pure presentational
 * component that Storybook can render without viewport constraints.
 * App entry points (layouts) use this component.
 */
export function Toast() {
  const message = useToastStore((s) => s.message);

  if (!message) return null;

  return (
    <div className="toast_wrap fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999]">
      <ToastPill message={message} />
    </div>
  );
}
