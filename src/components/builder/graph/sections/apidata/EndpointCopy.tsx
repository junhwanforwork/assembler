"use client"

import { useState, type CSSProperties, type FC } from "react"
import { COLOR, SPACING, TYPOGRAPHY, RADIUS } from "@/lib/design-tokens"

// Endpoint 복사 (ASS-080) — "method path"를 mono로 보여주고 클릭하면 클립보드에 복사한다.
// 복사 성공 토스트 대신 라벨 인라인 전환("복사했어요")으로 짧게 피드백 후 원복.
export const EndpointCopy: FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = useState(false)

  async function copy(e: React.MouseEvent) {
    // 행 클릭(상세 토글)으로 버블링되지 않도록 — 테이블 행 안에서도 안전.
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // 클립보드 권한 거부 등 — 조용히 무시(복사 실패 시 사용자가 직접 선택 가능).
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      style={BTN}
      className="endpoint_copy"
      title="엔드포인트 복사하기"
      aria-label={`엔드포인트 ${text} 복사하기`}
    >
      <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{text}</span>
      <span style={{ ...TYPOGRAPHY.STYLE.LABEL_2, color: copied ? COLOR.POSITIVE : COLOR.TEXT_MUTED }}>
        {copied ? "복사했어요" : "복사"}
      </span>
    </button>
  )
}

const BTN: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: SPACING["2"],
  padding: `${SPACING["1"]} ${SPACING["2"]}`,
  borderRadius: RADIUS.SM,
  border: `1px solid ${COLOR.BORDER_DEFAULT}`,
  background: COLOR.BG_INPUT,
  color: COLOR.TEXT_PRIMARY,
  fontSize: "13px",
  cursor: "pointer",
  maxWidth: "100%",
}
