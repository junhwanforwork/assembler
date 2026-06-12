"use client";

import { type FC, type ReactNode } from "react";
import { COLOR, TYPOGRAPHY } from "@/lib/design-tokens";
import { Button } from "./Button";

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  ctaLabel?: string;
  onCtaClick?: () => void;
}

/**
 * EmptyState — shown when a list or section has no content.
 * CTA renders only when both ctaLabel and onCtaClick are provided.
 */
export const EmptyState: FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  ctaLabel,
  onCtaClick,
}) => {
  const hasCta = Boolean(ctaLabel && onCtaClick);

  return (
    <div
      className="empty_state_wrap"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "48px 24px",
        gap: "12px",
      }}
    >
      {icon && (
        <span
          style={{ color: COLOR.TEXT_MUTED, display: "flex", alignItems: "center" }}
          aria-hidden="true"
        >
          {icon}
        </span>
      )}

      <p
        style={{
          margin: 0,
          fontSize: TYPOGRAPHY.SIZE.BASE,
          fontWeight: Number(TYPOGRAPHY.WEIGHT.SEMIBOLD),
          color: COLOR.TEXT_PRIMARY,
          lineHeight: 1.4,
        }}
      >
        {title}
      </p>

      {description && (
        <p
          style={{
            margin: 0,
            fontSize: TYPOGRAPHY.SIZE.SM,
            fontWeight: Number(TYPOGRAPHY.WEIGHT.REGULAR),
            color: COLOR.TEXT_MUTED,
            lineHeight: 1.55,
            maxWidth: "280px",
          }}
        >
          {description}
        </p>
      )}

      {hasCta && (
        <div style={{ marginTop: "4px" }}>
          <Button variant="primary" size="sm" onClick={onCtaClick}>
            {ctaLabel}
          </Button>
        </div>
      )}
    </div>
  );
};
