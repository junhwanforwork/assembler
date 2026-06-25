"use client";

import { type FC, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createProject, deleteProject, listProjects } from "@/lib/builder/api";
import { generateGraph, createProjectWithGraph } from "@/lib/graph/api";
import { stashPendingGraph } from "@/lib/graph/pending-graph";
import { fetchClarify } from "@/lib/clarify/api";
import { buildBrief } from "@/lib/clarify/brief";
import type { ClarifyAnswers, ClarifyQuestionnaire } from "@/lib/types/clarify";
import { ClarifyForm } from "@/components/builder/clarify/ClarifyForm";
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
  // 생성 전 브리프(ASS-212) — 아이디어를 잠시 들고 질문지를 띄운다. questionnaire 있으면 폼 오버레이.
  const [briefIdea, setBriefIdea] = useState<string | null>(null);
  const [questionnaire, setQuestionnaire] = useState<ClarifyQuestionnaire | null>(null);
  // 생성 in-flight 동기 가드 — setState는 비동기라 같은-틱 더블클릭(제출/스킵/Esc)을 못 막는다.
  // ref로 중복 generateGraph(유료)·중복 프로젝트 생성을 막는다.
  const generatingRef = useRef(false);
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

  // 아이디어 → (brief?) → ProjectGraph 생성 → 그래프와 함께 프로젝트 생성 → 빌더 오픈 (ASS-093·ASS-212).
  // keepOverlay=true(제출 경로): 생성 실패 시 오버레이를 유지해 답을 보존하고 재시도하게 한다.
  const runGenerate = async (idea: string, brief: string | undefined, keepOverlay: boolean) => {
    if (generatingRef.current) return; // 동기 중복 가드
    generatingRef.current = true;
    setCreating(true);
    if (!keepOverlay) setQuestionnaire(null);
    try {
      const graph = await generateGraph(idea, brief);
      const id = await createProjectWithGraph(idea.trim() || "제목 없는 프로젝트", graph);
      // 방금 만든(=영속된) 그래프를 빌더로 건네 GET 재페치+재정규화를 건너뛴다 — 첫 가치 순간의 한 박자 제거.
      stashPendingGraph(id, graph);
      router.push(`/project/${id}`); // 성공 시 페이지 이동 — ref/오버레이는 언마운트로 정리
    } catch {
      generatingRef.current = false;
      setCreating(false);
      if (!keepOverlay) {
        setQuestionnaire(null);
        setBriefIdea(null);
      }
      // keepOverlay=true: 오버레이·답 유지 + 버튼 재활성 → 사용자가 다시 시도할 수 있다.
    }
  };

  // 생성 전 브리프 질문지를 먼저 띄운다(ASS-212). 질문지 0개·실패는 바로 생성 폴백 — 사용자를 막지 않는다.
  const handleGenerate = async (prompt: string) => {
    const idea = prompt.trim();
    setCreating(true);
    setBriefIdea(idea);
    const q = await fetchClarify(idea);
    if (q.questions.length === 0) {
      runGenerate(idea, undefined, false); // 폴백: 브리프 없이 바로 생성(banner busy 유지)
      return;
    }
    setCreating(false); // 폼 입력 동안 진입 버튼 busy 해제(오버레이가 상호작용 차단)
    setQuestionnaire(q);
  };

  const handleBriefSubmit = (answers: ClarifyAnswers) => {
    if (!briefIdea || !questionnaire) return;
    runGenerate(briefIdea, buildBrief(questionnaire, answers) || undefined, true);
  };

  const handleBriefSkip = () => {
    if (briefIdea) runGenerate(briefIdea, undefined, false);
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
    <>
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
      {questionnaire && briefIdea ? (
        <ClarifyForm
          questionnaire={questionnaire}
          onSubmit={handleBriefSubmit}
          onSkip={handleBriefSkip}
          submitting={creating}
        />
      ) : null}
    </>
  );
};
