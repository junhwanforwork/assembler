// ASM-060 픽스처 — 실제 Next 라우트가 아니라 추출기 테스트 입력(함수 export 문법).
export async function GET(): Promise<Response> {
  return new Response("ok")
}

export async function DELETE(): Promise<Response> {
  return new Response(null, { status: 204 })
}
