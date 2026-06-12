"use client";

import { type FC, type ReactNode, useState, useMemo, useCallback } from "react";
import {
  Toggle,
  NumberStepper,
  Button,
  Dropdown,
  DropdownTrigger,
  DropdownItem,
} from "@/components/ui";
import { COLOR, SPACING, TYPOGRAPHY } from "@/lib/design-tokens";
import type { Block, BlockType } from "@/lib/types/builder";
import { useBuilderStore } from "@/lib/store/builder";
import { CommittingTextInput, CommittingTextArea } from "./CommittingField";

// 우측 인스펙터. 선택된 블록을 찾아 타입별 속성 필드를 렌더한다.
// 텍스트 입력은 CommittingField로 로컬 버퍼링해 키 입력마다 store를 건드리지 않고,
// 멈춤(debounce)·blur·블록 전환 시에만 updateBlockProps로 커밋한다.

const BUTTON_VARIANT_OPTIONS = [
  { value: "solid", label: "솔리드" },
  { value: "primary", label: "프라이머리" },
  { value: "neutral", label: "뉴트럴" },
  { value: "danger", label: "위험" },
  { value: "ghost", label: "고스트" },
];

const BADGE_STATUS_OPTIONS = [
  { value: "neutral", label: "기본" },
  { value: "positive", label: "긍정" },
  { value: "warning", label: "주의" },
  { value: "negative", label: "위험" },
];

function asString(v: unknown, fallback: string): string {
  return typeof v === "string" ? v : fallback;
}

export const Inspector: FC = () => {
  const screens = useBuilderStore((s) => s.screens);
  const activeScreenId = useBuilderStore((s) => s.activeScreenId);
  const selectedBlockId = useBuilderStore((s) => s.selectedBlockId);
  const updateBlockProps = useBuilderStore((s) => s.updateBlockProps);

  // 선택 블록 조회를 메모 — 입력 커밋마다 두 번의 .find()를 다시 돌리지 않는다.
  const activeScreen = useMemo(
    () => screens.find((s) => s.id === activeScreenId) ?? null,
    [screens, activeScreenId]
  );
  const block = useMemo(
    () => activeScreen?.blocks.find((b) => b.id === selectedBlockId) ?? null,
    [activeScreen, selectedBlockId]
  );

  // 안정적인 커밋 함수(early return 위에서 선언해 hooks 순서 보존).
  const screenId = activeScreen?.id ?? null;
  const blockId = block?.id ?? null;
  const update = useCallback(
    (props: Record<string, unknown>) => {
      if (screenId === null || blockId === null) return;
      updateBlockProps(screenId, blockId, props);
    },
    [screenId, blockId, updateBlockProps]
  );

  if (!activeScreen || !block) {
    return (
      <div className="inspector_wrap" style={WRAP_STYLE}>
        <SectionLabel>속성</SectionLabel>
        <p style={{ ...TYPOGRAPHY.STYLE.BODY_2, color: COLOR.TEXT_MUTED, margin: 0 }}>
          블록을 선택하면 속성을 편집할 수 있어요
        </p>
      </div>
    );
  }

  return (
    <div className="inspector_wrap" style={WRAP_STYLE}>
      <SectionLabel>속성</SectionLabel>
      {/* block.id를 key로 — 다른 블록 선택 시 입력 버퍼를 새 값으로 리마운트한다. */}
      <BlockFields key={block.id} block={block} update={update} />
    </div>
  );
};

// ── 타입별 필드 ───────────────────────────────────────────────────────────────

interface FieldsProps {
  block: Block;
  update: (props: Record<string, unknown>) => void;
}

const BlockFields: FC<FieldsProps> = ({ block, update }) => {
  const t: BlockType = block.type;

  if (t === "heading" || t === "text") {
    const text = asString(block.props.text, "");
    return t === "heading" ? (
      <CommittingTextInput label="텍스트" value={text} onCommit={(v) => update({ text: v })} />
    ) : (
      <CommittingTextArea label="텍스트" value={text} onCommit={(v) => update({ text: v })} rows={3} />
    );
  }

  if (t === "button") {
    return (
      <>
        <CommittingTextInput
          label="라벨"
          value={asString(block.props.label, "")}
          onCommit={(v) => update({ label: v })}
        />
        <SelectField
          label="스타일"
          value={asString(block.props.variant, "solid")}
          options={BUTTON_VARIANT_OPTIONS}
          onChange={(v) => update({ variant: v })}
        />
      </>
    );
  }

  if (t === "text-input" || t === "textarea") {
    return (
      <>
        <CommittingTextInput
          label="라벨"
          value={asString(block.props.label, "")}
          onCommit={(v) => update({ label: v })}
        />
        <CommittingTextInput
          label="플레이스홀더"
          value={asString(block.props.placeholder, "")}
          onCommit={(v) => update({ placeholder: v })}
        />
      </>
    );
  }

  if (t === "dropdown") {
    const options = Array.isArray(block.props.options)
      ? block.props.options.filter((o): o is string => typeof o === "string")
      : [];
    return (
      <>
        <CommittingTextInput
          label="라벨"
          value={asString(block.props.label, "")}
          onCommit={(v) => update({ label: v })}
        />
        <OptionsEditor options={options} onChange={(next) => update({ options: next })} />
      </>
    );
  }

  if (t === "toggle") {
    const on = block.props.on === true;
    return (
      <>
        <CommittingTextInput
          label="라벨"
          value={asString(block.props.label, "")}
          onCommit={(v) => update({ label: v })}
        />
        <FieldRow label="기본 상태">
          <Toggle checked={on} onChange={(next) => update({ on: next })} label={on ? "켜짐" : "꺼짐"} />
        </FieldRow>
      </>
    );
  }

  if (t === "badge") {
    return (
      <>
        <CommittingTextInput
          label="텍스트"
          value={asString(block.props.text, "")}
          onCommit={(v) => update({ text: v })}
        />
        <SelectField
          label="상태"
          value={asString(block.props.status, "neutral")}
          options={BADGE_STATUS_OPTIONS}
          onChange={(v) => update({ status: v })}
        />
      </>
    );
  }

  if (t === "number-stepper") {
    const value = typeof block.props.value === "number" ? block.props.value : 0;
    return (
      <FieldRow label="값">
        <NumberStepper value={value} onChange={(next) => update({ value: next ?? 0 })} />
      </FieldRow>
    );
  }

  // divider
  return (
    <p style={{ ...TYPOGRAPHY.STYLE.BODY_2, color: COLOR.TEXT_MUTED, margin: 0 }}>
      구분선은 속성이 없어요
    </p>
  );
};

// ── 옵션 편집기 ───────────────────────────────────────────────────────────────

interface OptionsEditorProps {
  options: string[];
  onChange: (options: string[]) => void;
}

const OptionsEditor: FC<OptionsEditorProps> = ({ options, onChange }) => {
  const editAt = (i: number, value: string) => {
    const next = [...options];
    next[i] = value;
    onChange(next);
  };
  const removeAt = (i: number) => onChange(options.filter((_, idx) => idx !== i));
  const add = () => onChange([...options, `옵션 ${options.length + 1}`]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: SPACING["2"] }}>
      <FieldLabel>옵션</FieldLabel>
      {options.map((opt, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: SPACING["2"] }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <CommittingTextInput value={opt} size="sm" onCommit={(v) => editAt(i, v)} />
          </div>
          <button
            type="button"
            aria-label="옵션 삭제"
            onClick={() => removeAt(i)}
            style={{
              flexShrink: 0,
              width: "28px",
              height: "28px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: COLOR.TEXT_MUTED,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M3 3L11 11M11 3L3 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      ))}
      <Button variant="ghost" size="sm" onClick={add}>
        옵션 추가하기
      </Button>
    </div>
  );
};

// ── 셀렉트 (Dropdown + DropdownItem 조립) ─────────────────────────────────────

interface SelectFieldProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}

const SelectField: FC<SelectFieldProps> = ({ label, value, options, onChange }) => {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value) ?? options[0];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <FieldLabel>{label}</FieldLabel>
      <Dropdown
        open={open}
        onOpenChange={setOpen}
        trigger={<DropdownTrigger label={current?.label ?? "선택"} open={open} variant="text" />}
      >
        {options.map((o) => (
          <DropdownItem
            key={o.value}
            label={o.label}
            selected={o.value === value}
            onClick={() => {
              onChange(o.value);
              setOpen(false);
            }}
          />
        ))}
      </Dropdown>
    </div>
  );
};

// ── 공용 스타일 헬퍼 ──────────────────────────────────────────────────────────

const WRAP_STYLE: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: SPACING["4"],
  height: "100%",
  overflowY: "auto",
};

const SectionLabel: FC<{ children: ReactNode }> = ({ children }) => (
  <p
    style={{
      ...TYPOGRAPHY.STYLE.LABEL_2,
      fontWeight: TYPOGRAPHY.WEIGHT.SEMIBOLD,
      color: COLOR.TEXT_MUTED,
      margin: 0,
    }}
  >
    {children}
  </p>
);

const FieldLabel: FC<{ children: ReactNode }> = ({ children }) => (
  <span
    style={{
      ...TYPOGRAPHY.STYLE.LABEL_1,
      fontWeight: TYPOGRAPHY.WEIGHT.SEMIBOLD,
      color: COLOR.TEXT_SECONDARY,
    }}
  >
    {children}
  </span>
);

const FieldRow: FC<{ label: string; children: ReactNode }> = ({ label, children }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
    <FieldLabel>{label}</FieldLabel>
    {children}
  </div>
);
