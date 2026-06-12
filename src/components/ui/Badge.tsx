"use client";

import { type FC } from "react";
import { COLOR, RADIUS, TYPOGRAPHY } from "@/lib/design-tokens";

export type BadgeStatus = "draft" | "published" | "closed" | "archived";

export interface BadgeProps {
  status: BadgeStatus;
}

const BADGE_LABEL: Record<BadgeStatus, string> = {
  draft: "초안",
  published: "진행 중",
  closed: "마감",
  // archived is deprecated — treated identical to closed in the UI
  archived: "마감",
};

// Each status has a background tint + matching text color derived from COLOR tokens.
// published → positive green, closed/archived → warning amber, draft → muted gray.
const BADGE_STYLE: Record<BadgeStatus, { bg: string; text: string }> = {
  draft: {
    bg: COLOR.BG_SURFACE,
    text: COLOR.TEXT_MUTED,
  },
  published: {
    bg: COLOR.POSITIVE_MUTED,
    text: COLOR.POSITIVE,
  },
  closed: {
    bg: COLOR.WARNING_MUTED,
    text: COLOR.WARNING,
  },
  archived: {
    bg: COLOR.WARNING_MUTED,
    text: COLOR.WARNING,
  },
};

/**
 * Badge — displays survey status with a tonal pill style.
 * Statuses map to Korean labels per product policy.
 */
export const Badge: FC<BadgeProps> = ({ status }) => {
  const { bg, text } = BADGE_STYLE[status];

  return (
    <span
      className="badge_wrap inline-flex items-center"
      style={{
        backgroundColor: bg,
        color: text,
        fontSize: TYPOGRAPHY.SIZE.XS,
        fontWeight: Number(TYPOGRAPHY.WEIGHT.MEDIUM),
        lineHeight: 1,
        padding: "3px 8px",
        borderRadius: RADIUS.PILL,
        whiteSpace: "nowrap",
      }}
    >
      {BADGE_LABEL[status]}
    </span>
  );
};
