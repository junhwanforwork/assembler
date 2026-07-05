"use client"

import type { Api, DbTable, UIElement } from "@/lib/types/assembler"
import {
  type ElementLinkResolution,
  resolveElementApis,
  resolveElementDbTables,
} from "./views/wireframeUtils"
import s from "./editor.module.css"

// 요소 인스펙터(#46·ASM-034) — 선택된 UIElement의 매핑(동작·상태·결과·API·DB)을 공용 인스펙터에 렌더.
// TableInspector와 같은 insp 클래스 계열. dangling 연결은 raw id 대신 개수로만 정직 표시.
export function ElementInspector({ element, apis, dbTables }: { element: UIElement; apis: Api[]; dbTables: DbTable[] }) {
  const apiLinks = resolveElementApis(element, apis)
  const dbLinks = resolveElementDbTables(element, dbTables)

  return (
    <div className={s.insp}>
      <div className={s.inspTitle}>{element.label || "이름 없는 요소"}</div>
      <div className={s.inspSub}>화면 요소 · {element.type}</div>

      <div className={s.inspSec}>
        <div className={s.inspH}>동작</div>
        <div className={s.inspV}>{element.action || "동작이 아직 없어요."}</div>
      </div>

      <div className={s.inspSec}>
        <div className={s.inspH}>상태</div>
        {element.states.length === 0 ? (
          <div className={s.inspV}>정의된 상태가 아직 없어요.</div>
        ) : (
          element.states.map((state, i) => (
            <div className={s.inspV} key={`${element.id}-state-${i}`}>
              <b>{state.name}</b>
              {state.description && ` — ${state.description}`}
            </div>
          ))
        )}
      </div>

      <div className={s.inspSec}>
        <div className={s.inspH}>결과</div>
        <div className={s.inspV}>{element.result || "결과가 아직 없어요."}</div>
      </div>

      <div className={s.inspSec}>
        <div className={s.inspH}>호출 API</div>
        <LinkList resolution={apiLinks} noun="API" />
      </div>

      <div className={s.inspSec}>
        <div className={s.inspH}>연결된 DB 테이블</div>
        <LinkList resolution={dbLinks} noun="테이블" />
      </div>
    </div>
  )
}

function LinkList({ resolution, noun }: { resolution: ElementLinkResolution; noun: string }) {
  return (
    <div className={s.inspV}>
      {resolution.names.length === 0 && resolution.missingCount === 0 && "—"}
      {resolution.names.map((name) => (
        <span key={name} className={s.reltag}>
          {name}
        </span>
      ))}
      {resolution.missingCount > 0 && (
        <div className={s.wireMissing}>찾을 수 없는 {noun} 연결 {resolution.missingCount}개가 있어요.</div>
      )}
    </div>
  )
}
