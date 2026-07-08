// ASM-060 픽스처 — const 화살표 export 문법 + route group 세그먼트 제거 검증.
export const POST = async (): Promise<Response> => new Response("created", { status: 201 })
