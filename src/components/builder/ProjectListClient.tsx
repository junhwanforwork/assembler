"use client";

import { type FC, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createProject, deleteProject, listProjects } from "@/lib/builder/api";
import { generateGraph, createProjectWithGraph } from "@/lib/graph/api";
import { stashPendingGraph } from "@/lib/graph/pending-graph";
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
  // 첫 방문 자동 진입을 한 번만 처리(StrictMode 이중 호출·재페치 시 빈 프로젝트 중복 생성 방지).
  const firstVisitHandled = useRef(false);

  useEffect(() => {
    let cancelled = false;
    listProjects()
      .then(async (list) => {
        if (cancelled) return;
        // 프로젝트 0개 = 프롬프트-퍼스트 랜딩 대신 빈 빌더로 바로 진입(ASS-207).
        // 0개일 때만 생성하므로 빈 프로젝트는 보통 1개로 수렴(다음 방문엔 목록에 떠 재사용).
        // 단, 그 빈 프로젝트를 지워 다시 0개가 되면 재진입 시 또 만든다 — "0개 = 빈 빌더" 불변식이 우선.
        // 가드는 await 전에 세워 StrictMode 이중 호출의 중복 생성을 막고, 실패 시 풀어 수동 재시도를 허용한다.
        if (list.length === 0 && !firstVisitHandled.current) {
          firstVisitHandled.current = true;
          try {
            const id = await createProject();
            if (!cancelled) router.replace(`/project/${id}`);
            return;
          } catch {
            // 생성 실패 — 가드 해제 후 대시보드(빈 목록)로 폴백. 헤더 "새 프로젝트 만들기"로 재시도.
            firstVisitHandled.current = false;
          }
        }
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
  }, [router]);

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
      // 방금 만든(=영속된) 그래프를 빌더로 건네 GET 재페치+재정규화를 건너뛴다 — 첫 가치 순간의 한 박자 제거.
      stashPendingGraph(id, graph);
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
