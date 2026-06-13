"use client";

import { useState, type FC, type CSSProperties } from "react";
import { Dropdown, DropdownTrigger, DropdownItem } from "@/components/ui";
import { COLOR, RADIUS, SPACING, TYPOGRAPHY, INTERACTION, DURATION, EASE } from "@/lib/design-tokens";

// 좌측 내비 — account-structure(개인+팀 2단)에 정렬. v1은 개인 워크스페이스만 동작,
// 팀·즐겨찾기·휴지통은 Phase 9 자리(비활성 stub).

export type DashNav = "recent" | "all";

interface DashboardSidebarProps {
  nav: DashNav;
  onNav: (nav: DashNav) => void;
}

interface NavDef {
  key: DashNav | "starred" | "trash";
  label: string;
  glyph: string;
  enabled: boolean;
}

const NAV_ITEMS: NavDef[] = [
  { key: "recent", label: "최근", glyph: "◷", enabled: true },
  { key: "all", label: "전체 프로젝트", glyph: "▦", enabled: true },
  { key: "starred", label: "즐겨찾기", glyph: "★", enabled: false },
  { key: "trash", label: "휴지통", glyph: "🗑", enabled: false },
];

export const DashboardSidebar: FC<DashboardSidebarProps> = ({ nav, onNav }) => {
  const [wsOpen, setWsOpen] = useState(false);

  return (
    <aside style={WRAP_STYLE}>
      {/* 워크스페이스 스위처 — v1 개인만, 팀은 Phase 9 */}
      <Dropdown
        open={wsOpen}
        onOpenChange={setWsOpen}
        trigger={<DropdownTrigger label="개인" open={wsOpen} variant="ghost" />}
      >
        <DropdownItem label="개인 워크스페이스" selected onClick={() => setWsOpen(false)} />
        <DropdownItem label="+ 팀 만들기 (곧)" disabled onClick={() => {}} />
      </Dropdown>

      <div style={DIVIDER_STYLE} />

      <nav style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        {NAV_ITEMS.map((item) => (
          <NavRow
            key={item.key}
            def={item}
            active={item.enabled && item.key === nav}
            onClick={() => item.enabled && onNav(item.key as DashNav)}
          />
        ))}
      </nav>
    </aside>
  );
};

const NavRow: FC<{ def: NavDef; active: boolean; onClick: () => void }> = ({ def, active, onClick }) => {
  const [hovered, setHovered] = useState(false);

  const bg = active ? COLOR.ACCENT_BG : hovered && def.enabled ? INTERACTION.HOVER_BG : "transparent";
  const color = active ? COLOR.ACCENT : def.enabled ? COLOR.TEXT_SECONDARY : COLOR.TEXT_DISABLED;

  return (
    <button
      type="button"
      disabled={!def.enabled}
      title={def.enabled ? undefined : "곧 추가돼요"}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...TYPOGRAPHY.STYLE.LABEL_1,
        display: "flex",
        alignItems: "center",
        gap: SPACING["3"],
        width: "100%",
        padding: `${SPACING["2"]} ${SPACING["3"]}`,
        borderRadius: RADIUS.MD,
        border: "none",
        background: bg,
        color,
        cursor: def.enabled ? "pointer" : "not-allowed",
        textAlign: "left",
        transition: `background-color ${DURATION.BASE} ${EASE.DEFAULT}`,
      }}
    >
      <span aria-hidden="true" style={{ width: "16px", textAlign: "center" }}>
        {def.glyph}
      </span>
      <span>{def.label}</span>
    </button>
  );
};

const WRAP_STYLE: CSSProperties = {
  width: "var(--left-w)",
  flexShrink: 0,
  height: "100%",
  overflowY: "auto",
  padding: SPACING["4"],
  borderRight: `1px solid ${COLOR.BORDER_DEFAULT}`,
  display: "flex",
  flexDirection: "column",
  gap: SPACING["3"],
};

const DIVIDER_STYLE: CSSProperties = {
  height: "1px",
  background: COLOR.BORDER_DEFAULT,
  margin: `${SPACING["1"]} 0`,
};
