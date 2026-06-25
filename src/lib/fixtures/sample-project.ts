import type { Project } from "@/lib/types/builder"

// perf 하네스 전용 빌더 픽스처 — FlowCanvas(flow-drag) 구동용. 3개 화면을 떨어뜨려 배치해
// 드래그 이동 거리가 충분하도록 한다. SAMPLE_GRAPH(그래프 객체)와 별개 레이어(빌더 문서 모델).
export const SAMPLE_PROJECT: Project = {
  id: "perf",
  sessionId: "perf",
  title: "Perf Harness",
  document: {
    screens: [
      {
        id: "s-login",
        title: "로그인",
        x: 80,
        y: 80,
        blocks: [
          { id: "b-email", type: "text-input", props: { label: "이메일", placeholder: "you@example.com" } },
          { id: "b-submit", type: "button", props: { label: "로그인하기" } },
        ],
      },
      {
        id: "s-home",
        title: "홈",
        x: 520,
        y: 80,
        blocks: [{ id: "b-title", type: "heading", props: { text: "환영해요" } }],
      },
      {
        id: "s-settings",
        title: "설정",
        x: 960,
        y: 460,
        blocks: [{ id: "b-toggle", type: "toggle", props: { label: "알림 받기", on: true } }],
      },
    ],
    flows: [{ id: "f-login-home", sourceScreenId: "s-login", targetScreenId: "s-home" }],
  },
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
}
