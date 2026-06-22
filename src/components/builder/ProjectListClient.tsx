"use client";

import { type FC, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createProject, deleteProject, listProjects } from "@/lib/builder/api";
import { generateGraph, createProjectWithGraph } from "@/lib/graph/api";
import type { ProjectListItem } from "@/lib/types/builder";
import {
  DashboardShell,
  type DashLoadState,
  type DashSort,
} from "@/components/dashboard/DashboardShell";
import type { DashNav } from "@/components/dashboard/DashboardSidebar";

// 홈 대시보드(루트 /)의 데이터·상태 레이어. 표현은 DashboardShell이 담당한다.
// 세션(개인) 단위 — 로그인은 Phase 9.

export const ProjectListClient: FC = () => {
  const router = useRouter();
  const [items, setItems] = useState<ProjectListItem[]>([]);
  const [state, setState] = useState<DashLoadState>("loading");
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<DashSort>("recent");
  const [nav, setNav] = useState<DashNav>("recent");

  useEffect(() => {
    let cancelled = false;
    listProjects()
      .then((list) => {
        if (cancelled) return;
        setItems(list);
        setState("ready");
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 검색 필터 + 정렬은 파생값 — 로드된 목록에서 클라이언트 계산.
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q ? items.filter((p) => p.title.toLowerCase().includes(q)) : items;
    const sorted = [...filtered].sort((a, b) =>
      sort === "name"
        ? a.title.localeCompare(b.title)
        : new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    return sorted;
  }, [items, query, sort]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const id = await createProject();
      router.push(`/project/${id}`);
    } catch {
      setCreating(false);
    }
  };

  // 아이디어 → ProjectGraph 생성 → 그래프와 함께 프로젝트 생성 → 객체그래프 빌더 오픈 (ASS-093).
  const handleGenerate = async (prompt: string) => {
    setCreating(true);
    try {
      const graph = await generateGraph(prompt);
      const id = await createProjectWithGraph(prompt.trim() || "제목 없는 프로젝트", graph);
      router.push(`/project/${id}`);
    } catch {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    const prev = items;
    setItems((cur) => cur.filter((p) => p.id !== id));
    try {
      await deleteProject(id);
    } catch {
      setItems(prev);
    }
  };

  return (
    <DashboardShell
      items={visible}
      state={state}
      hasAnyProjects={items.length > 0}
      query={query}
      onQueryChange={setQuery}
      onNewProject={handleCreate}
      creating={creating}
      onOpen={(id) => router.push(`/project/${id}`)}
      onDelete={handleDelete}
      onGenerate={handleGenerate}
      sort={sort}
      onSortChange={setSort}
      nav={nav}
      onNav={setNav}
    />
  );
};
