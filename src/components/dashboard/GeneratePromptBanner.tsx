"use client";

import { useState, type FC, type CSSProperties } from "react";
import { Button, TextInput } from "@/components/ui";
import { COLOR, RADIUS, SPACING, TYPOGRAPHY } from "@/lib/design-tokens";

// 홈 상단 진입 — Assembler 코어가 prompt→그래프 생성(ASS-018)이므로 "아이디어를 설명" 진입을 전면에 둔다.
// v1: 생성=프로젝트를 만들고 빌더를 연다(AI 미연결). ASS-018 착지 시 onGenerate를 /api/generate 배선으로 교체.

interface GeneratePromptBannerProps {
  onGenerate: (prompt: string) => void;
  busy: boolean;
}

export const GeneratePromptBanner: FC<GeneratePromptBannerProps> = ({ onGenerate, busy }) => {
  const [prompt, setPrompt] = useState("");
  const canSubmit = prompt.trim().length > 0 && !busy;

  const submit = () => {
    if (!canSubmit) return;
    onGenerate(prompt.trim());
  };

  return (
    <section style={WRAP_STYLE} aria-label="아이디어로 프로젝트 시작하기">
      <div>
        <p style={{ ...TYPOGRAPHY.STYLE.TITLE_2, color: COLOR.TEXT_PRIMARY, margin: 0 }}>
          제품 아이디어를 설명하면 그래프를 만들어줘요
        </p>
        <p style={{ ...TYPOGRAPHY.STYLE.BODY_2, color: COLOR.TEXT_SECONDARY, marginTop: SPACING["1"] }}>
          요구사항부터 화면·API까지 연결된 구조로 시작해 보세요
        </p>
      </div>

      <div style={ROW_STYLE}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <TextInput
            size="lg"
            ariaLabel="제품 아이디어"
            value={prompt}
            onChange={setPrompt}
            onEnter={submit}
            placeholder="예: 카페 사장님을 위한 예약·주문 관리 서비스"
          />
        </div>
        <Button variant="solid" size="md" loading={busy} disabled={!canSubmit} onClick={submit}>
          만들기
        </Button>
      </div>
    </section>
  );
};

const WRAP_STYLE: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: SPACING["4"],
  padding: SPACING["6"],
  borderRadius: RADIUS.LG,
  border: `1px solid ${COLOR.BORDER_DEFAULT}`,
  background: COLOR.ACCENT_BG,
};

const ROW_STYLE: CSSProperties = {
  display: "flex",
  gap: SPACING["2"],
  alignItems: "center",
};
