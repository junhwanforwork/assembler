"use client";

import { type FC, type CSSProperties } from "react";
import { Button, TextInput } from "@/components/ui";
import { COLOR, SPACING, TYPOGRAPHY } from "@/lib/design-tokens";
import { AuthIndicator } from "@/components/auth/AuthIndicator";

// 상단바 — 브랜드 · 검색 · 새 프로젝트 · 인증 표시. 빌더 셸(GraphHeader)과 분리된 홈 헤더.

interface DashboardHeaderProps {
  query: string;
  onQueryChange: (q: string) => void;
  onNewProject: () => void;
  creating: boolean;
}

export const DashboardHeader: FC<DashboardHeaderProps> = ({
  query,
  onQueryChange,
  onNewProject,
  creating,
}) => {
  return (
    <header style={WRAP_STYLE}>
      <div style={BRAND_STYLE}>
        <span aria-hidden="true" style={{ color: COLOR.ACCENT, fontSize: "18px" }}>
          ◆
        </span>
        <span style={{ ...TYPOGRAPHY.STYLE.TITLE_2, color: COLOR.TEXT_PRIMARY }}>Assembler</span>
      </div>

      <div style={SEARCH_WRAP_STYLE}>
        <TextInput
          size="sm"
          value={query}
          onChange={onQueryChange}
          placeholder="프로젝트 검색"
          leftSlot={
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
              <circle cx="6.5" cy="6.5" r="4.5" stroke={COLOR.TEXT_MUTED} strokeWidth="1.4" />
              <path d="M10 10L13 13" stroke={COLOR.TEXT_MUTED} strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          }
        />
      </div>

      <div style={ACTIONS_STYLE}>
        <Button variant="solid" size="md" loading={creating} onClick={onNewProject}>
          새 프로젝트 만들기
        </Button>
        <AuthIndicator />
      </div>
    </header>
  );
};

const WRAP_STYLE: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: SPACING["4"],
  height: "var(--gnb-h)",
  flexShrink: 0,
  padding: `0 ${SPACING["6"]}`,
  background: COLOR.BG_SURFACE,
  borderBottom: `1px solid ${COLOR.BORDER_DEFAULT}`,
};

const BRAND_STYLE: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: SPACING["2"],
  flexShrink: 0,
};

const SEARCH_WRAP_STYLE: CSSProperties = {
  flex: 1,
  display: "flex",
  justifyContent: "center",
  maxWidth: "420px",
  margin: "0 auto",
};

const ACTIONS_STYLE: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: SPACING["3"],
  flexShrink: 0,
};
