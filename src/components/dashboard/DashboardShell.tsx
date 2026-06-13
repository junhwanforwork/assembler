"use client";

import { useState, type FC, type CSSProperties } from "react";
import { Dropdown, DropdownTrigger, DropdownItem, EmptyState } from "@/components/ui";
import { COLOR, SPACING, TYPOGRAPHY } from "@/lib/design-tokens";
import type { ProjectListItem } from "@/lib/types/builder";
import { DashboardHeader } from "./DashboardHeader";
import { DashboardSidebar, type DashNav } from "./DashboardSidebar";
import { GeneratePromptBanner } from "./GeneratePromptBanner";
import { ProjectCard } from "./ProjectCard";

// 홈 대시보드 셸 — 헤더 + 사이드바 + 메인(배너·툴바·그리드)을 조립한다.
// 데이터/상태/핸들러는 ProjectListClient가 주입(이 컴포넌트는 레이아웃·표현 담당).

export type DashSort = "recent" | "name";
export type DashLoadState = "loading" | "ready" | "error";

interface DashboardShellProps {
  items: ProjectListItem[]; // 이미 필터·정렬된 목록
  state: DashLoadState;
  hasAnyProjects: boolean; // 검색 0건 vs 첫 방문 0건 구분
  query: string;
  onQueryChange: (q: string) => void;
  onNewProject: () => void;
  creating: boolean;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onGenerate: (prompt: string) => void;
  sort: DashSort;
  onSortChange: (s: DashSort) => void;
  nav: DashNav;
  onNav: (n: DashNav) => void;
}

export const DashboardShell: FC<DashboardShellProps> = (props) => {
  const { items, state, hasAnyProjects, query, sort, onSortChange, nav } = props;

  return (
    <div style={ROOT_STYLE}>
      <DashboardHeader
        query={query}
        onQueryChange={props.onQueryChange}
        onNewProject={props.onNewProject}
        creating={props.creating}
      />

      <div style={BODY_STYLE}>
        <DashboardSidebar nav={nav} onNav={props.onNav} />

        <main style={MAIN_STYLE}>
          <GeneratePromptBanner onGenerate={props.onGenerate} busy={props.creating} />

          <div style={TOOLBAR_STYLE}>
            <h1 style={{ ...TYPOGRAPHY.STYLE.H2, color: COLOR.TEXT_PRIMARY, margin: 0 }}>
              {nav === "recent" ? "최근 프로젝트" : "내 프로젝트"}
            </h1>
            <SortControl sort={sort} onChange={onSortChange} />
          </div>

          {state === "loading" && <Notice text="불러오는 중이에요" />}
          {state === "error" && (
            <Notice text="목록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요." />
          )}

          {state === "ready" && items.length === 0 && hasAnyProjects && (
            <EmptyState title="검색 결과가 없어요" description="다른 이름으로 검색해 보세요." />
          )}
          {state === "ready" && items.length === 0 && !hasAnyProjects && (
            <EmptyState
              title="아직 만든 프로젝트가 없어요"
              description="위에 아이디어를 적거나 새 프로젝트로 시작해 보세요."
              ctaLabel="새 프로젝트 만들기"
              onCtaClick={props.onNewProject}
            />
          )}

          {state === "ready" && items.length > 0 && (
            <div style={GRID_STYLE}>
              {items.map((item) => (
                <ProjectCard
                  key={item.id}
                  item={item}
                  onOpen={() => props.onOpen(item.id)}
                  onDelete={() => props.onDelete(item.id)}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

const SortControl: FC<{ sort: DashSort; onChange: (s: DashSort) => void }> = ({ sort, onChange }) => {
  const [open, setOpen] = useState(false);
  const label = sort === "recent" ? "최근 수정순" : "이름순";

  return (
    <Dropdown
      open={open}
      onOpenChange={setOpen}
      align="right"
      trigger={<DropdownTrigger label={label} open={open} variant="text" />}
    >
      <DropdownItem
        label="최근 수정순"
        selected={sort === "recent"}
        onClick={() => {
          onChange("recent");
          setOpen(false);
        }}
      />
      <DropdownItem
        label="이름순"
        selected={sort === "name"}
        onClick={() => {
          onChange("name");
          setOpen(false);
        }}
      />
    </Dropdown>
  );
};

const Notice: FC<{ text: string }> = ({ text }) => (
  <p style={{ ...TYPOGRAPHY.STYLE.BODY_1, color: COLOR.TEXT_MUTED, marginTop: SPACING["8"] }}>{text}</p>
);

const ROOT_STYLE: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100vh",
  background: COLOR.BG_BASE,
};

const BODY_STYLE: CSSProperties = {
  flex: 1,
  display: "flex",
  minHeight: 0,
};

const MAIN_STYLE: CSSProperties = {
  flex: 1,
  overflowY: "auto",
  padding: SPACING["8"],
  display: "flex",
  flexDirection: "column",
  gap: SPACING["6"],
};

const TOOLBAR_STYLE: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: SPACING["4"],
};

const GRID_STYLE: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
  gap: SPACING["4"],
};
