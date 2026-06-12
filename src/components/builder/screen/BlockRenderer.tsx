"use client";

import { type FC } from "react";
import { Button, TextInput, TextArea, Toggle, NumberStepper } from "@/components/ui";
import { COLOR, RADIUS, TYPOGRAPHY } from "@/lib/design-tokens";
import type { Block, BlockType } from "@/lib/types/builder";
import { BLOCK_DEF_MAP } from "@/lib/builder/block-catalog";
import type { ButtonVariant } from "@/components/ui";

// 순수 프리젠테이션. block.props를 안전 캐스팅 + 카탈로그 기본값 폴백으로 읽어
// 매칭되는 DS 컴포넌트를 렌더한다. 스토어 접근 없음.

const BUTTON_VARIANTS: ButtonVariant[] = ["solid", "primary", "neutral", "danger", "ghost"];

// 와이어프레임 미리보기용 뱃지 상태 색. DS Badge는 고정 라벨/무텍스트라
// 임의 텍스트를 못 받으므로, 같은 status 색 토큰으로 토큰 칩을 직접 그린다.
const BADGE_STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  neutral: { bg: COLOR.BG_SURFACE, text: COLOR.TEXT_SECONDARY },
  positive: { bg: COLOR.POSITIVE_MUTED, text: COLOR.POSITIVE },
  warning: { bg: COLOR.WARNING_MUTED, text: COLOR.WARNING },
  negative: { bg: COLOR.NEGATIVE_BG, text: COLOR.NEGATIVE },
};

interface BlockRendererProps {
  block: Block;
}

// 타입별 기본 props에서 키 하나를 폴백과 함께 안전하게 읽는다.
function readProp<T>(block: Block, key: string, fallback: T): T {
  const raw = block.props[key];
  if (raw !== undefined && raw !== null) return raw as T;
  const def = BLOCK_DEF_MAP[block.type].defaultProps[key];
  return (def as T) ?? fallback;
}

function readString(block: Block, key: string, fallback: string): string {
  const v = readProp<unknown>(block, key, fallback);
  return typeof v === "string" ? v : fallback;
}

export const BlockRenderer: FC<BlockRendererProps> = ({ block }) => {
  switch (block.type) {
    case "heading": {
      const text = readString(block, "text", "제목");
      return (
        <p style={{ ...TYPOGRAPHY.STYLE.H3, color: COLOR.TEXT_PRIMARY, margin: 0 }}>{text}</p>
      );
    }

    case "text": {
      const text = readString(block, "text", "본문 텍스트");
      return (
        <p style={{ ...TYPOGRAPHY.STYLE.BODY_2, color: COLOR.TEXT_SECONDARY, margin: 0 }}>{text}</p>
      );
    }

    case "button": {
      const label = readString(block, "label", "버튼");
      const rawVariant = readString(block, "variant", "solid");
      const variant = (BUTTON_VARIANTS as string[]).includes(rawVariant)
        ? (rawVariant as ButtonVariant)
        : "solid";
      return (
        <Button variant={variant} size="md">
          {label}
        </Button>
      );
    }

    case "text-input": {
      return (
        <TextInput
          label={readString(block, "label", "라벨")}
          placeholder={readString(block, "placeholder", "입력하세요")}
        />
      );
    }

    case "textarea": {
      return (
        <TextArea
          label={readString(block, "label", "라벨")}
          placeholder={readString(block, "placeholder", "여러 줄을 입력하세요")}
        />
      );
    }

    case "dropdown": {
      const label = readString(block, "label", "선택");
      const optionsRaw = readProp<unknown>(block, "options", []);
      const options = Array.isArray(optionsRaw)
        ? optionsRaw.filter((o): o is string => typeof o === "string")
        : [];
      const first = options[0] ?? "옵션을 추가해 보세요";
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <span
            style={{
              ...TYPOGRAPHY.STYLE.LABEL_2,
              fontWeight: TYPOGRAPHY.WEIGHT.SEMIBOLD,
              color: COLOR.TEXT_SECONDARY,
            }}
          >
            {label}
          </span>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              height: "40px",
              padding: "0 14px",
              backgroundColor: COLOR.BG_INPUT,
              border: `1px solid ${COLOR.BORDER_INPUT}`,
              borderRadius: RADIUS.MD,
              ...TYPOGRAPHY.STYLE.BODY_2,
              color: COLOR.TEXT_PRIMARY,
            }}
          >
            <span>{first}</span>
            <svg width="10" height="10" viewBox="0 0 8 8" fill="none" aria-hidden="true">
              <path
                d="M1 2.5L4 5.5L7 2.5"
                stroke={COLOR.TEXT_MUTED}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      );
    }

    case "toggle": {
      const label = readString(block, "label", "토글");
      const on = readProp<boolean>(block, "on", false) === true;
      // 미리보기는 읽기 전용 — onChange는 no-op.
      return <Toggle checked={on} onChange={() => {}} label={label} />;
    }

    case "badge": {
      const text = readString(block, "text", "뱃지");
      const status = readString(block, "status", "neutral");
      const tone = BADGE_STATUS_COLOR[status] ?? BADGE_STATUS_COLOR.neutral;
      return (
        <span
          className="badge_wrap inline-flex items-center"
          style={{
            backgroundColor: tone.bg,
            color: tone.text,
            ...TYPOGRAPHY.STYLE.LABEL_2,
            lineHeight: 1,
            padding: "4px 10px",
            borderRadius: RADIUS.PILL,
            whiteSpace: "nowrap",
            alignSelf: "flex-start",
          }}
        >
          {text}
        </span>
      );
    }

    case "number-stepper": {
      const value = readProp<number>(block, "value", 0);
      const safeValue = typeof value === "number" ? value : 0;
      return (
        <div style={{ width: "120px" }}>
          <NumberStepper value={safeValue} onChange={() => {}} />
        </div>
      );
    }

    case "divider": {
      return (
        <div
          style={{ height: "1px", width: "100%", backgroundColor: COLOR.BORDER_DEFAULT }}
          role="separator"
        />
      );
    }

    default:
      return assertNever(block.type);
  }
};

// BlockType union을 빠짐없이 처리했는지 컴파일 타임에 강제.
function assertNever(type: never): never {
  throw new Error(`처리하지 않은 블록 타입이에요: ${String(type)}`);
}

export type { BlockType };
