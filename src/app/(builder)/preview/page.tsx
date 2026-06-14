import { GraphShell } from "@/components/builder/graph/GraphShell"
import { SAMPLE_GRAPH } from "@/lib/fixtures/sample-graph"

// 새 5영역 그래프 셸 미리보기 (ASS-025). 영속(ASS-017) 전이라 픽스처를 태워 렌더 검증.
// 실 프로젝트 연결은 ASS-017/024 후 `/project/[id]`로 전환.
export default function BuilderPreviewPage() {
  return <GraphShell projectId="preview" initialGraph={SAMPLE_GRAPH} />
}
