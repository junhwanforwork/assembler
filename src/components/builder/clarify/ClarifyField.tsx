"use client";

import { type CSSProperties, type FC } from "react";
import { COLOR, SPACING, TYPOGRAPHY } from "@/lib/design-tokens";
import { Slider, TextInput } from "@/components/ui";
import type { ClarifyAnswer, ClarifyQuestion } from "@/lib/types/clarify";
import { SelectChip } from "./SelectChip";
import { CheckRow } from "./CheckRow";

// 질문 1개 렌더 (ASS-212) — kind 별 위젯 + "알아서 정해줘"(AI 위임) 토글. 답은 (question, answer, onChange)로 제어.
// decided 시 입력은 dim + pointerEvents none(상호배타) — AI가 정한다는 신호를 명확히.

interface ClarifyFieldProps {
  question: ClarifyQuestion;
  answer: ClarifyAnswer | undefined;
  onChange: (answer: ClarifyAnswer | undefined) => void;
}

export const ClarifyField: FC<ClarifyFieldProps> = ({ question, answer, onChange }) => {
  const decided = answer != null && "decided" in answer;
  const toggleDecide = () => onChange(decided ? undefined : { decided: true });

  return (
    <div style={FIELD}>
      <div>
        <p style={{ ...TYPOGRAPHY.STYLE.TITLE_2, color: COLOR.TEXT_PRIMARY, margin: 0 }}>
          {question.title}
        </p>
        {question.hint ? (
          <p style={{ ...TYPOGRAPHY.STYLE.BODY_2, color: COLOR.TEXT_SECONDARY, margin: `${SPACING["1"]} 0 0` }}>
            {question.hint}
          </p>
        ) : null}
      </div>

      <div style={{ ...INPUT_WRAP, opacity: decided ? 0.4 : 1, pointerEvents: decided ? "none" : "auto" }}>
        <FieldInput question={question} answer={answer} onChange={onChange} />
      </div>

      {question.allowDecideForMe ? (
        <div>
          <SelectChip label="AI에게 맡기기" selected={decided} onClick={toggleDecide} />
        </div>
      ) : null}
    </div>
  );
};

// kind 별 입력 위젯. answer 가 decided 면 호출부에서 dim 처리 — 여기선 concrete 값만 다룬다.
const FieldInput: FC<ClarifyFieldProps> = ({ question, answer, onChange }) => {
  switch (question.kind) {
    case "single":
      return <SingleInput question={question} answer={answer} onChange={onChange} />;
    case "multi":
      return <MultiInput question={question} answer={answer} onChange={onChange} />;
    case "slider":
      return <SliderInput question={question} answer={answer} onChange={onChange} />;
    case "text":
      return (
        <TextInput
          size="md"
          ariaLabel={question.title}
          placeholder="직접 입력해 주세요"
          value={answer && "kind" in answer && answer.kind === "text" ? answer.value : ""}
          onChange={(v) => onChange(v.trim() ? { kind: "text", value: v } : undefined)}
        />
      );
  }
};

const SingleInput: FC<ClarifyFieldProps> = ({ question, answer, onChange }) => {
  const value = answer && "kind" in answer && answer.kind === "single" ? answer.value : undefined;
  const isOther = value != null && !question.options?.some((o) => o.value === value);
  return (
    <>
      <div style={CHIP_WRAP}>
        {question.options?.map((o) => (
          <SelectChip
            key={o.value}
            label={o.label}
            selected={value === o.value}
            onClick={() => onChange({ kind: "single", value: o.value })}
          />
        ))}
      </div>
      {question.allowOther ? (
        <TextInput
          size="md"
          ariaLabel={`${question.title} 직접 입력`}
          placeholder="직접 입력"
          value={isOther ? value : ""}
          onChange={(v) => onChange(v.trim() ? { kind: "single", value: v } : undefined)}
        />
      ) : null}
    </>
  );
};

const MultiInput: FC<ClarifyFieldProps> = ({ question, answer, onChange }) => {
  const values = answer && "kind" in answer && answer.kind === "multi" ? answer.values : [];
  const isOpt = (v: string) => question.options?.some((o) => o.value === v) ?? false;
  const custom = values.find((v) => !isOpt(v)) ?? "";

  const toggle = (val: string) => {
    const next = values.includes(val) ? values.filter((v) => v !== val) : [...values, val];
    onChange(next.length ? { kind: "multi", values: next } : undefined);
  };
  const setCustom = (text: string) => {
    const base = values.filter(isOpt);
    const next = text.trim() ? [...base, text] : base;
    onChange(next.length ? { kind: "multi", values: next } : undefined);
  };

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: SPACING["2"] }}>
        {question.options?.map((o) => (
          <CheckRow
            key={o.value}
            label={o.label}
            description={o.description}
            checked={values.includes(o.value)}
            onChange={() => toggle(o.value)}
          />
        ))}
      </div>
      {question.allowOther ? (
        <TextInput
          size="md"
          ariaLabel={`${question.title} 직접 입력`}
          placeholder="직접 입력"
          value={custom}
          onChange={setCustom}
        />
      ) : null}
    </>
  );
};

const SliderInput: FC<ClarifyFieldProps> = ({ question, answer, onChange }) => {
  const range = question.range;
  if (!range) return null;
  const value = answer && "kind" in answer && answer.kind === "slider" ? answer.value : range.default;
  return (
    <Slider
      min={range.min}
      max={range.max}
      step={range.step}
      value={value}
      ariaLabel={question.title}
      onChange={(v) => onChange({ kind: "slider", value: v })}
    />
  );
};

const FIELD: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: SPACING["3"],
};

const INPUT_WRAP: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: SPACING["2"],
};

const CHIP_WRAP: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: SPACING["2"],
};
