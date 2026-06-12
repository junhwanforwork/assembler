import { BuilderShell } from "@/components/builder/BuilderShell"

export default async function BuilderProjectPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <BuilderShell projectId={id} />
}
