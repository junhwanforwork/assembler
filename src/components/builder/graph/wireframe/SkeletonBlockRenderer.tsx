"use client"

import { type CSSProperties, type FC, type ReactNode } from "react"
import { COLOR, RADIUS, SPACING, TOGGLE, TYPOGRAPHY } from "@/lib/design-tokens"
import type { Block } from "@/lib/types/builder"
import { readProp, readString } from "@/lib/builder/block-props"
import { SkelBar, SkelBox, SkelField, SkelText } from "./SkeletonPrimitives"

// 와이어프레임 전용 low-fi 모노크롬 스켈레톤. BlockRenderer(실제 화면 빌더 공용)와 달리
// 컬러 DS 컴포넌트가 아니라 회색 골격을 그린다 → "실제 화면의 스켈레톤"으로 읽힌다.
// 하이브리드 텍스트 정책: 의미 있는 라벨(필드/버튼/뱃지/드롭다운값/스테퍼값)은 실제 텍스트,
// 내용성 텍스트(heading·본문·빈 입력값)는 greeking 바. 색은 전부 제거(모노크롬).

interface SkeletonBlockRendererProps {
  block: Block
}

const ELLIPSIS: CSSProperties = { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }

export const SkeletonBlockRenderer: FC<SkeletonBlockRendererProps> = ({ block }) => {
  switch (block.type) {
    case "heading":
      // 헤딩 = 화면 구조 신호 → greeking 바(굵게).
      return <SkelBar width="55%" height={18} tone="strong" />

    case "text": {
      const text = readString(block, "text", "본문 텍스트")
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: SPACING["2"] }}>
          <SkelText typo={TYPOGRAPHY.STYLE.BODY_2} color={COLOR.TEXT_MUTED} style={{ wordBreak: "break-word" }}>
            {text}
          </SkelText>
          <SkelBar width="72%" height={8} tone="muted" />
        </div>
      )
    }

    case "button": {
      const label = readString(block, "label", "버튼")
      // variant 무시 — 모노크롬. 버튼은 input보다 강한 보더로 컨트롤 위계 표현.
      return (
        <SkelBox
          height={40}
          style={{
            width: "fit-content",
            maxWidth: 220,
            padding: "0 16px",
            justifyContent: "center",
            border: `1px solid ${COLOR.BORDER_STRONG}`,
          }}
        >
          <SkelText typo={TYPOGRAPHY.STYLE.LABEL_1} color={COLOR.TEXT_LABEL} style={ELLIPSIS}>
            {label}
          </SkelText>
        </SkelBox>
      )
    }

    case "text-input": {
      const label = readString(block, "label", "라벨")
      const placeholder = readString(block, "placeholder", "입력하세요")
      return (
        <SkelField label={label}>
          <SkelBox height={40}>
            {placeholder ? (
              <SkelText typo={TYPOGRAPHY.STYLE.BODY_2} color={COLOR.TEXT_DISABLED} style={ELLIPSIS}>
                {placeholder}
              </SkelText>
            ) : (
              <SkelBar width="40%" height={8} tone="muted" />
            )}
          </SkelBox>
        </SkelField>
      )
    }

    case "textarea": {
      const label = readString(block, "label", "라벨")
      // 본문 영역 3줄 바 = input과 한눈에 구별되는 신호.
      return (
        <SkelField label={label}>
          <SkelBox
            height={116}
            style={{ flexDirection: "column", alignItems: "flex-start", justifyContent: "flex-start", padding: "10px 12px" }}
          >
            <SkelBar width="90%" tone="muted" />
            <SkelBar width="100%" tone="muted" />
            <SkelBar width="60%" tone="muted" />
          </SkelBox>
        </SkelField>
      )
    }

    case "dropdown": {
      const label = readString(block, "label", "선택")
      const optionsRaw = readProp<unknown>(block, "options", [])
      const options = Array.isArray(optionsRaw) ? optionsRaw.filter((o): o is string => typeof o === "string") : []
      const first = options[0]
      return (
        <SkelField label={label}>
          <SkelBox height={40} style={{ justifyContent: "space-between" }}>
            <SkelText
              typo={TYPOGRAPHY.STYLE.BODY_2}
              color={first ? COLOR.TEXT_SECONDARY : COLOR.TEXT_DISABLED}
              style={{ ...ELLIPSIS, flex: 1 }}
            >
              {first ?? "옵션"}
            </SkelText>
            <Chevron />
          </SkelBox>
        </SkelField>
      )
    }

    case "toggle": {
      const label = readString(block, "label", "토글")
      const on = readProp<boolean>(block, "on", false) === true
      return (
        <div style={{ display: "flex", alignItems: "center", gap: SPACING["2"] }}>
          <SkelText typo={TYPOGRAPHY.STYLE.LABEL_1} color={COLOR.TEXT_SECONDARY}>
            {label}
          </SkelText>
          <ToggleTrack on={on} />
        </div>
      )
    }

    case "badge": {
      const text = readString(block, "text", "뱃지")
      // status 색 제거 — 모노크롬 pill.
      return (
        <SkelText
          typo={TYPOGRAPHY.STYLE.LABEL_2}
          color={COLOR.TEXT_SECONDARY}
          style={{
            alignSelf: "flex-start",
            padding: "3px 10px",
            borderRadius: RADIUS.PILL,
            border: `1px solid ${COLOR.BORDER_DEFAULT}`,
            backgroundColor: COLOR.BG_SURFACE,
            whiteSpace: "nowrap",
          }}
        >
          {text}
        </SkelText>
      )
    }

    case "number-stepper": {
      const value = readProp<number>(block, "value", 0)
      const safe = typeof value === "number" && Number.isFinite(value) ? String(value) : "–"
      return (
        <SkelBox
          height={34}
          radius={RADIUS.SM}
          style={{ width: 120, padding: 0, justifyContent: "space-between", overflow: "hidden" }}
        >
          <StepperEnd>−</StepperEnd>
          <SkelText
            typo={TYPOGRAPHY.STYLE.BODY_2}
            color={safe === "–" ? COLOR.TEXT_DISABLED : COLOR.TEXT_SECONDARY}
            style={{ flex: 1, textAlign: "center" }}
          >
            {safe}
          </SkelText>
          <StepperEnd>+</StepperEnd>
        </SkelBox>
      )
    }

    case "divider":
      return <div role="separator" style={{ height: 1, width: "100%", backgroundColor: COLOR.BORDER_DEFAULT }} />

    default:
      // 컴파일타임: 모든 BlockType 처리 강제(미처리 case 있으면 아래 줄이 타입 에러).
      // 런타임: 직렬화 깨짐 등 유니온 밖 타입이 와도 크래시 대신 중성 폴백.
      return assertExhaustive(block.type)
  }
}

// 드롭다운 chevron — BlockRenderer와 동일 path, 모노크롬 stroke.
const Chevron: FC = () => (
  <svg width="10" height="10" viewBox="0 0 8 8" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
    <path
      d="M1 2.5L4 5.5L7 2.5"
      stroke={COLOR.TEXT_MUTED}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

// 토글 트랙 — 실제 Toggle 치수(36×20, knob16, offset2). outline만(채우면 "on" 색 함의). 위치만 상태 반영.
const ToggleTrack: FC<{ on: boolean }> = ({ on }) => (
  <div
    style={{
      position: "relative",
      width: TOGGLE.TRACK_WIDTH,
      height: TOGGLE.TRACK_HEIGHT,
      borderRadius: RADIUS.PILL,
      border: `1px solid ${COLOR.BORDER_STRONG}`,
      backgroundColor: "transparent",
      boxSizing: "border-box",
      flexShrink: 0,
    }}
  >
    <div
      style={{
        position: "absolute",
        top: TOGGLE.KNOB_OFFSET,
        left: 0,
        width: TOGGLE.KNOB_SIZE,
        height: TOGGLE.KNOB_SIZE,
        borderRadius: RADIUS.PILL,
        backgroundColor: COLOR.TEXT_DISABLED,
        transform: `translateX(${on ? TOGGLE.TRACK_WIDTH - TOGGLE.KNOB_SIZE - TOGGLE.KNOB_OFFSET : TOGGLE.KNOB_OFFSET}px)`,
      }}
    />
  </div>
)

// 스테퍼 끝 버튼 영역(28w) — −/+ 글리프.
const StepperEnd: FC<{ children: ReactNode }> = ({ children }) => (
  <span
    style={{
      width: 28,
      flexShrink: 0,
      alignSelf: "stretch",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: COLOR.TEXT_MUTED,
      fontSize: 16,
    }}
  >
    {children}
  </span>
)

// 미지/직렬화 깨짐 타입 폴백 — dashed 박스 + 타입명. 절대 throw하지 않는다(뷰어는 untrusted 그래프 렌더).
// BlockRenderer의 throw형 assertNever와 의도적으로 다르다(빌더=신뢰 데이터 vs 뷰어=AI/직렬화 데이터).
function assertExhaustive(type: never): ReactNode {
  return (
    <SkelBox height={40} style={{ justifyContent: "center", border: `1px dashed ${COLOR.BORDER_STRONG}` }}>
      <SkelText typo={TYPOGRAPHY.STYLE.LABEL_2} color={COLOR.TEXT_MUTED}>
        {String(type)}
      </SkelText>
    </SkelBox>
  )
}
