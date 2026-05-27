"use client";

import { type FC, type ReactNode, useEffect } from "react";
import { COLOR, RADIUS, SHADOW, Z_INDEX } from "@/lib/design-tokens";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  /** 하단 액션 버튼 — 보통 [Button neutral 닫기, Button primary/danger 확인] */
  footer?: ReactNode;
  /** Esc 키나 오버레이 클릭으로 닫기 비활성 (저장 중 등) */
  dismissible?: boolean;
  /** 최대 너비 (px). 기본 420 */
  maxWidth?: number;
  /** 모달 헤더의 aria-labelledby 용 id */
  labelledBy?: string;
}

/**
 * Modal — 오버레이 + 카드. Esc·오버레이 클릭으로 닫기.
 * - children 본문, footer 액션 영역 분리
 * - dismissible=false 면 저장 중 등 Esc/오버레이로 못 닫음
 */
export const Modal: FC<ModalProps> = ({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  dismissible = true,
  maxWidth = 420,
  labelledBy,
}) => {
  // Esc 닫기
  useEffect(() => {
    if (!open || !dismissible) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, dismissible, onClose]);

  // body 스크롤 잠금
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ background: COLOR.BG_OVERLAY, zIndex: Z_INDEX.MODAL }}
      onClick={() => dismissible && onClose()}
    >
      <div
        className="w-full"
        style={{
          maxWidth,
          background: COLOR.BG_CARD,
          border: `1px solid ${COLOR.BORDER_DEFAULT}`,
          borderRadius: RADIUS.LG,
          boxShadow: SHADOW.MODAL,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || description) && (
          <div className="px-6 pt-6 pb-2">
            {title && (
              <h2
                id={labelledBy}
                className="text-base font-bold"
                style={{ color: COLOR.TEXT_PRIMARY }}
              >
                {title}
              </h2>
            )}
            {description && (
              <p
                className="text-sm mt-2 leading-relaxed"
                style={{ color: COLOR.TEXT_SECONDARY }}
              >
                {description}
              </p>
            )}
          </div>
        )}
        {children && <div className="px-6 py-3">{children}</div>}
        {footer && (
          <div className="px-6 pb-6 pt-2 flex items-center justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
