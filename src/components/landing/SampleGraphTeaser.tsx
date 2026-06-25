import { Fragment, type FC, type CSSProperties } from "react"
import { COLOR, RADIUS, SPACING, TYPOGRAPHY } from "@/lib/design-tokens"

// 첫 방문자에게 "입력 한 줄이 무엇으로 이어지는지"를 가입·생성 전에 보여주는 티저.
// 가짜 프로젝트 데이터가 아니라 Assembler 의 실제 Source-of-Truth 체인(CLAUDE.md)을 그대로 도식화한다 —
// "모든 것은 연결된다" 카디널 룰을 시각적 페이오프로 만든다.
const CHAIN = ["요구사항", "기능", "페이지", "UI 요소", "API", "데이터베이스"] as const

export const SampleGraphTeaser: FC = () => (
  <figure style={WRAP_STYLE}>
    <div style={ROW_STYLE}>
      {CHAIN.map((label, i) => (
        <Fragment key={label}>
          <span style={NODE_STYLE}>{label}</span>
          {i < CHAIN.length - 1 ? (
            <span style={ARROW_STYLE} aria-hidden>
              →
            </span>
          ) : null}
        </Fragment>
      ))}
    </div>
    <figcaption style={CAPTION_STYLE}>입력 한 줄이 이 객체들로 이어져요</figcaption>
  </figure>
)

const WRAP_STYLE: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: SPACING["3"],
  margin: 0,
}

const ROW_STYLE: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  justifyContent: "center",
  gap: SPACING["2"],
}

const NODE_STYLE: CSSProperties = {
  ...TYPOGRAPHY.STYLE.LABEL_2,
  color: COLOR.TEXT_SECONDARY,
  backgroundColor: COLOR.BG_SECTION,
  border: `1px solid ${COLOR.BORDER_DEFAULT}`,
  borderRadius: RADIUS.PILL,
  padding: `${SPACING["1"]} ${SPACING["3"]}`,
  whiteSpace: "nowrap",
}

const ARROW_STYLE: CSSProperties = {
  ...TYPOGRAPHY.STYLE.LABEL_2,
  color: COLOR.TEXT_MUTED,
}

const CAPTION_STYLE: CSSProperties = {
  ...TYPOGRAPHY.STYLE.LABEL_2,
  color: COLOR.TEXT_MUTED,
}
