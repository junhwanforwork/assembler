"use client"

import type { DesignPatchFailure } from "@/lib/api/design-patch"
import s from "./PatchErrorNote.module.css"

// 스코프드 PATCH 실패 표시(편집 인터랙션 공용) — 도크 ChangePlanCard와 같은 실패 분기를
// 해요체 카피로 보여준다. stale(대상 소실)은 표면마다 상황이 달라 카피를 주입받는다.
export function PatchErrorNote({ failure, staleText }: { failure: DesignPatchFailure; staleText: string }) {
  return (
    <div className={s.note} role="alert">
      {failure.kind === "stale" && staleText}
      {failure.kind === "conflict" && "다른 저장과 겹쳤어요. 잠시 후 다시 시도해 주세요."}
      {failure.kind === "generic" && "일시적인 오류가 생겼어요. 잠시 후 다시 시도해 주세요."}
      {failure.kind === "dangling" && (
        <>
          끊어진 연결이 있어 저장할 수 없어요.
          <ul className={s.refs}>
            {failure.refs.map((ref, i) => (
              <li key={`${ref.from}-${ref.missingId}-${i}`}>
                <code>{ref.from}</code>의 <code>{ref.field}</code>가 없는 <code>{ref.missingId}</code>를 가리켜요
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
