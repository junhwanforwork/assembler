// ASM-060 픽스처 — 오탐 트랩: 주석·문자열 속 export, 메서드 아닌 export.
// export async function DELETE — 라인 시작이 아니므로 무시돼야 한다
const doc = `
  export function PUT() {}
`

export async function GET(): Promise<Response> {
  return new Response(doc)
}

export const PATCH = async (): Promise<Response> => new Response("patched")

export const revalidate = 60
