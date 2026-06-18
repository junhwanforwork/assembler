import type { ProjectGraph } from "@/lib/types/assembler"

// /api/generate 호출 클라이언트 헬퍼. 서버의 snake_case 에러 코드를 해요체 문구로 매핑한다
// (api.md: 서버는 코드 / ux-writing.md: 사용자 노출은 해요체). 실패 시 Error를 던진다.

const ERROR_MESSAGES: Record<string, string> = {
  idea_required: "만들 제품 아이디어를 입력해 주세요.",
  idea_too_long: "아이디어가 너무 길어요. 조금 줄여서 다시 시도해 주세요.",
  api_key_missing: "생성 기능이 아직 연결되지 않았어요. 잠시 후 다시 시도해 주세요.",
  invalid_graph: "결과를 정리하지 못했어요. 다시 시도해 주세요.",
  generation_failed: "일시적인 오류가 생겼어요. 잠시 후 다시 시도해 주세요.",
}

const FALLBACK_MESSAGE = "일시적인 오류가 생겼어요. 잠시 후 다시 시도해 주세요."

export async function generateGraph(idea: string): Promise<ProjectGraph> {
  let res: Response
  try {
    res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idea }),
    })
  } catch {
    throw new Error("네트워크 연결을 확인하고 다시 시도해 주세요.")
  }

  const data = (await res.json().catch(() => ({}))) as {
    graph?: ProjectGraph
    error?: string
  }

  if (!res.ok || !data.graph) {
    throw new Error(ERROR_MESSAGES[data.error ?? ""] ?? FALLBACK_MESSAGE)
  }
  return data.graph
}
