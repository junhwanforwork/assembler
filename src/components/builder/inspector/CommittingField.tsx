"use client";

import { useCallback, useEffect, useRef, useState, type FC } from "react";
import { TextInput, type TextInputProps, TextArea, type TextAreaProps } from "@/components/ui";
import { perfMark, perfMeasure, perfEnabled } from "@/lib/perf/marks";

// 입력값을 로컬 state로 버퍼링해 키 입력마다 글로벌 store를 건드리지 않는다.
// store 커밋은 입력이 멈춘 뒤(debounce)·blur·언마운트 시 한 번만 일어난다.
// 호출부는 편집 대상이 바뀔 때 key={block.id}로 리마운트해 새 값을 시드한다.
const COMMIT_DELAY_MS = 200;

function useCommitBuffer(committed: string, onCommit: (value: string) => void) {
  const [local, setLocal] = useState(committed);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<string | null>(null);
  // 언마운트 flush가 항상 최신 커밋 클로저를 쓰도록 ref로 추적(렌더 중 쓰기 금지 → effect에서).
  const onCommitRef = useRef(onCommit);
  useEffect(() => {
    onCommitRef.current = onCommit;
  });

  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (pendingRef.current !== null) {
      const value = pendingRef.current;
      pendingRef.current = null;
      // perf: 커밋→다음 프레임 지연 측정. perfMark는 off시 no-op, rAF는 on일 때만 스케줄(prod 경로 불변).
      perfMark("inspector-commit-start");
      onCommitRef.current(value);
      if (perfEnabled()) {
        requestAnimationFrame(() => perfMeasure("inspector-commit", "inspector-commit-start"));
      }
    }
  }, []);

  const change = useCallback(
    (value: string) => {
      setLocal(value);
      pendingRef.current = value;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(flush, COMMIT_DELAY_MS);
    },
    [flush]
  );

  useEffect(() => flush, [flush]); // 언마운트 시 펜딩 커밋 보존

  return { local, change, flush };
}

type CommittingTextInputProps = Omit<TextInputProps, "value" | "onChange"> & {
  value: string;
  onCommit: (value: string) => void;
};

export const CommittingTextInput: FC<CommittingTextInputProps> = ({
  value,
  onCommit,
  onBlur,
  ...rest
}) => {
  const { local, change, flush } = useCommitBuffer(value, onCommit);
  return (
    <TextInput
      {...rest}
      value={local}
      onChange={change}
      onBlur={() => {
        flush();
        onBlur?.();
      }}
    />
  );
};

type CommittingTextAreaProps = Omit<TextAreaProps, "value" | "onChange"> & {
  value: string;
  onCommit: (value: string) => void;
};

export const CommittingTextArea: FC<CommittingTextAreaProps> = ({ value, onCommit, ...rest }) => {
  const { local, change } = useCommitBuffer(value, onCommit);
  return <TextArea {...rest} value={local} onChange={change} />;
};
