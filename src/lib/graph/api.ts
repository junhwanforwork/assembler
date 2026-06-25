import { getSessionId } from "@/lib/session"
import { normalizeGraph } from "@/lib/graph/normalize"
import type { ProjectGraph } from "@/lib/types/assembler"

// 객체그래프 빌더(GraphShell) 클라이언트 API. 모든 요청에 x-session-id 헤더 주입.
// document(jsonb)는 옛 빌더와 공유 컬럼 — 로드 시 normalizeGraph로 어떤 형태든 유효 ProjectGraph로 보정.

function headers(): HeadersInit {
  return { "Content-Type": "application/json", "x-session-id": getSessionId() }
}

// document가 옛 {screens,flows}·부분 그래프·빈 값이어도 normalizeGraph가 유효 그래프로 만든다(빈 그래프 = 히어로).
export async function loadProjectGraph(id: string): Promise<{ title: string; graph: ProjectGraph }> {
  const res = await fetch(`/api/projects/${id}`, { headers: headers() })
  if (!res.ok) throw new Error("프로젝트를 찾을 수 없어요.")
  const json = (await res.json()) as { project: { title: string; document: unknown } }
  return { title: json.project.title, graph: normalizeGraph(json.project.document) }
}

export async function saveProjectGraph(id: string, title: string, graph: ProjectGraph): Promise<void> {
  const res = await fetch(`/api/projects/${id}`, {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify({ title, document: graph }),
  })
  if (!res.ok) throw new Error("저장하지 못했어요.")
}

// 생성 그래프로 새 프로젝트를 한 번에 만든다(생성 결과 유실 방지 — 생성→생성즉시저장→오픈).
export async function createProjectWithGraph(title: string, graph: ProjectGraph): Promise<string> {
  const res = await fetch("/api/projects", {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ title, document: graph }),
  })
  if (!res.ok) throw new Error("프로젝트를 만들지 못했어요.")
  const json = (await res.json()) as { id: string }
  return json.id
}

// 아이디어 → ProjectGraph. 서버 에러 메시지(해요체)를 그대로 올린다(ux-writing).
export async function generateGraph(idea: string): Promise<ProjectGraph> {
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ idea }),
  })
  const json = (await res.json().catch(() => ({}))) as { graph?: ProjectGraph; error?: string }
  if (!res.ok || !json.graph) {
    throw new Error(json.error || "일시적인 오류가 생겼어요. 잠시 후 다시 시도해 주세요.")
  }
  return json.graph
}
