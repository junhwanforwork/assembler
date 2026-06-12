import { getSessionId } from "@/lib/session"
import type { Project, ProjectDocument, ProjectListItem } from "@/lib/types/builder"

// 빌더 클라이언트 API 헬퍼. 모든 요청에 x-session-id 헤더를 주입한다.

function headers(): HeadersInit {
  return { "Content-Type": "application/json", "x-session-id": getSessionId() }
}

export async function listProjects(): Promise<ProjectListItem[]> {
  const res = await fetch("/api/projects", { headers: headers() })
  if (!res.ok) throw new Error("프로젝트를 불러오지 못했어요.")
  const json = (await res.json()) as { projects: ProjectListItem[] }
  return json.projects
}

export async function createProject(title?: string): Promise<string> {
  const res = await fetch("/api/projects", {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ title }),
  })
  if (!res.ok) throw new Error("프로젝트를 만들지 못했어요.")
  const json = (await res.json()) as { id: string }
  return json.id
}

export async function loadProject(id: string): Promise<Project> {
  const res = await fetch(`/api/projects/${id}`, { headers: headers() })
  if (!res.ok) throw new Error("프로젝트를 찾을 수 없어요.")
  const json = (await res.json()) as { project: Project }
  return json.project
}

export async function saveProject(
  id: string,
  title: string,
  document: ProjectDocument
): Promise<void> {
  const res = await fetch(`/api/projects/${id}`, {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify({ title, document }),
  })
  if (!res.ok) throw new Error("저장하지 못했어요.")
}

export async function deleteProject(id: string): Promise<void> {
  const res = await fetch(`/api/projects/${id}`, { method: "DELETE", headers: headers() })
  if (!res.ok) throw new Error("삭제하지 못했어요.")
}
