import { getSessionId } from "@/lib/session"
import { normalizeGraph } from "@/lib/graph/normalize"
import type { ProjectGraph } from "@/lib/types/assembler"
import type { GraphStreamEvent } from "@/lib/graph/stream-protocol"

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

// 아이디어 → ProjectGraph 스트림(ASS-204). 레이어/완료/오류 envelope를 순서대로 yield.
// pre-stream 오류(세션·아이디어·길이)는 JSON {error}로 와서 즉시 throw(해요체).
export async function* streamGraph(idea: string, brief?: string): AsyncGenerator<GraphStreamEvent> {
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ idea, brief }),
  })
  if (!res.ok || !res.body) {
    const json = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(json.error || "일시적인 오류가 생겼어요. 잠시 후 다시 시도해 주세요.")
  }
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    // SSE 프레임 경계 = 빈 줄(\n\n). 각 프레임의 data: 줄만 파싱.
    let sep: number
    while ((sep = buffer.indexOf("\n\n")) !== -1) {
      const frame = buffer.slice(0, sep)
      buffer = buffer.slice(sep + 2)
      const dataLine = frame.split("\n").find((l) => l.startsWith("data:"))
      if (!dataLine) continue
      const json = dataLine.slice(5).trim()
      if (!json) continue
      // 경계 깨짐 등 손상 프레임 1개는 스킵(서버 consumeLine과 대칭) — 전체 스트림 중단 방지.
      let event: GraphStreamEvent
      try {
        event = JSON.parse(json) as GraphStreamEvent
      } catch {
        continue
      }
      yield event
    }
  }
}

// 아이디어 → ProjectGraph(단발, 비스트림). 비스트림 소비자·eval·폴백용 — 서버는 스트림이라 done까지 소비해 합친다.
// ProjectListClient(랜딩/대시보드 진입)는 v1에서 이 블로킹 경로 유지 — 점진 공개는 빌더 내 PromptPanel만(후속 통일).
export async function generateGraph(idea: string, brief?: string): Promise<ProjectGraph> {
  let graph: ProjectGraph | null = null
  for await (const ev of streamGraph(idea, brief)) {
    if (ev.type === "error") throw new Error(ev.message)
    if (ev.type === "layer" || ev.type === "done") graph = ev.graph
  }
  if (!graph) throw new Error("일시적인 오류가 생겼어요. 잠시 후 다시 시도해 주세요.")
  return graph
}
