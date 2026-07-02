import { getSessionId } from "@/lib/session"
import type { Product, Workspace } from "@/lib/types/assembler"
import type { DesignCounts } from "@/lib/types/design"

// 브라우저 fetch 래퍼 — 세션 헤더(x-session-id) 자동 첨부 + 표준 에러.
// 서버 라우트는 RLS로 소유권을 강제하므로 클라는 세션 id만 실어 보낸다.

export type { Product }
export type FileSummary = Workspace & { counts: DesignCounts }

// 에러 코드(snake_case)와 상태코드를 보존 — UI가 해요체 카피로 변환.
// details = 에러 응답 body 전체 — dangling_refs(409)의 refs처럼 코드 밖 정보를 UI가 쓸 수 있게.
export class ApiError extends Error {
  constructor(
    public code: string,
    public status: number,
    public details?: unknown
  ) {
    super(code)
    this.name = "ApiError"
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(path, {
      ...init,
      headers: { "Content-Type": "application/json", "x-session-id": getSessionId(), ...init?.headers },
    })
  } catch {
    throw new ApiError("network_error", 0)
  }
  const data: unknown = await res.json().catch(() => ({}))
  if (!res.ok) {
    const code = (data as { error?: string })?.error ?? "unknown_error"
    throw new ApiError(code, res.status, data)
  }
  return data as T
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) => request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) => request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
}
