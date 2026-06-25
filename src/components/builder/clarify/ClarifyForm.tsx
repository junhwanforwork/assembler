"use client";

import { type CSSProperties, type FC, useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { COLOR, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from "@/lib/design-tokens";
import type { ClarifyAnswers, ClarifyQuestionnaire } from "@/lib/types/clarify";
import { ClarifyField } from "./ClarifyField";

// 생성 전 브리프 질문지 오버레이 (ASS-212). 답하면 onSubmit(answers) → brief 주입 생성,
// 건너뛰면 onSkip() → brief 없이 바로 생성(기존 경로). 둘 다 생성으로 이어지므로 사용자를 막지 않는다.
// Modal 컴포넌트가 없어 토큰 기반 자체 오버레이(폼이 길어 스크롤 카드).

interface ClarifyFormProps {
  questionnaire: ClarifyQuestionnaire;
  onSubmit: (answers: ClarifyAnswers) => void;
  onSkip: () => void;
  // 제출 후 생성 진행 중 — 버튼 loading + Esc/백드롭 잠금(중복 제출·실수 종료 방지).
  submitting: boolean;
}

export const ClarifyForm: FC<ClarifyFormProps> = ({ questionnaire, onSubmit, onSkip, submitting }) => {
  // slider 는 기본값으로 초기화 — 사용자가 안 건드려도 브리프에 규모가 반영되도록(이미지 동작).
  const [answers, setAnswers] = useState<ClarifyAnswers>(() => {
    const init: ClarifyAnswers = {};
    for (const q of questionnaire.questions) {
      if (q.kind === "slider" && q.range) init[q.id] = { kind: "slider", value: q.range.default };
    }
    return init;
  });

  // Esc = 건너뛰기(닫아도 생성으로 진행). 생성 진행 중엔 잠금(실수 종료·중복 제출 방지).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onSkip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onSkip, submitting]);

  const setAnswer = (id: string, answer: ClarifyAnswers[string] | undefined) => {
    setAnswers((prev) => {
      const next = { ...prev };
      if (answer === undefined) delete next[id];
      else next[id] = answer;
      return next;
    });
  };

  return (
    <div style={BACKDROP} onClick={() => !submitting && onSkip()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="제품 브리프 질문"
        style={CARD}
        onClick={(e) => e.stopPropagation()}
      >
        <header style={HEADER}>
          <p style={{ ...TYPOGRAPHY.STYLE.H3, color: COLOR.TEXT_PRIMARY, margin: 0 }}>
            잠깐, 몇 가지만 확인할게요
          </p>
          <p style={{ ...TYPOGRAPHY.STYLE.BODY_2, color: COLOR.TEXT_SECONDARY, margin: `${SPACING["1"]} 0 0` }}>
            답할수록 더 정확한 구조를 만들어요. 건너뛰어도 괜찮아요.
          </p>
        </header>

        <div style={BODY}>
          {questionnaire.questions.map((q) => (
            <ClarifyField
              key={q.id}
              question={q}
              answer={answers[q.id]}
              onChange={(a) => setAnswer(q.id, a)}
            />
          ))}
        </div>

        <footer style={FOOTER}>
          <Button variant="neutral" size="md" disabled={submitting} onClick={onSkip}>
            건너뛰고 바로 만들기
          </Button>
          <Button variant="solid" size="md" loading={submitting} onClick={() => onSubmit(answers)}>
            이대로 만들기
          </Button>
        </footer>
      </div>
    </div>
  );
};

const BACKDROP: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 50,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: SPACING["4"],
  backgroundColor: COLOR.BG_OVERLAY,
};

const CARD: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  width: "100%",
  maxWidth: "560px",
  maxHeight: "85vh",
  backgroundColor: COLOR.BG_SURFACE,
  border: `1px solid ${COLOR.BORDER_DEFAULT}`,
  borderRadius: RADIUS.XL,
  boxShadow: SHADOW.MODAL,
  overflow: "hidden",
};

const HEADER: CSSProperties = {
  padding: SPACING["6"],
  borderBottom: `1px solid ${COLOR.BORDER_DEFAULT}`,
};

const BODY: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: SPACING["6"],
  padding: SPACING["6"],
  overflowY: "auto",
};

const FOOTER: CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: SPACING["2"],
  padding: SPACING["4"],
  borderTop: `1px solid ${COLOR.BORDER_DEFAULT}`,
};
