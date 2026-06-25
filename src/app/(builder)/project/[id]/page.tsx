import { GraphProjectClient } from "./GraphProjectClient"

// 실 프로젝트는 객체그래프 빌더(GraphShell)를 쓴다 (ASS-092 — 옛 BuilderShell 대체).
export default async function BuilderProjectPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <GraphProjectClient projectId={id} />
}
