import { describe, expect, it } from "vitest"
import { createElement as h } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { FloatBar, FloatBarCount, FloatBarLabel, FloatBarNotice } from "./FloatBar"

// FloatBar(P-D) — 하단 도킹 플로팅 칩 바. 씨앗=SpecBulkBar 문법(pill·elevated·shadow-pop).
// vitest css:false — CSS Module은 키 이름을 그대로 돌려주는 프록시라 클래스명으로 단언한다.

describe("FloatBar 도킹", () => {
  it("기본은 bottom-center — 콘텐츠 폭 중앙 도킹", () => {
    const html = renderToStaticMarkup(h(FloatBar, null, "내용"))
    expect(html).toContain("bottomCenter")
    expect(html).not.toContain("bottomFull")
  })

  it("bottom-full — 좌우로 긴 행(git 상태 바 형태)", () => {
    const html = renderToStaticMarkup(h(FloatBar, { dock: "bottom-full" }, "내용"))
    expect(html).toContain("bottomFull")
    expect(html).not.toContain("bottomCenter")
  })
})

describe("FloatBar 슬롯", () => {
  it("children은 bar 안에 렌더된다", () => {
    const html = renderToStaticMarkup(h(FloatBar, null, h("button", null, "액션")))
    expect(html).toContain("<button>액션</button>")
    expect(html).toContain("bar")
  })

  it("info는 좌측, actions는 우측 — info 마크업이 actions보다 먼저", () => {
    const html = renderToStaticMarkup(
      h(FloatBar, {
        dock: "bottom-full",
        info: h("span", null, "레포·브랜치"),
        actions: h("button", null, "PR 생성"),
      })
    )
    const infoAt = html.indexOf("레포·브랜치")
    const actionsAt = html.indexOf("PR 생성")
    expect(infoAt).toBeGreaterThan(-1)
    expect(actionsAt).toBeGreaterThan(infoAt)
    expect(html).toContain("info")
    expect(html).toContain("actions")
  })

  it("note는 bar 위(마크업상 먼저) — 에러 노트 자리", () => {
    const html = renderToStaticMarkup(
      h(FloatBar, { note: h("p", null, "저장에 실패했어요") }, "내용")
    )
    const noteAt = html.indexOf("저장에 실패했어요")
    const barAt = html.indexOf("내용")
    expect(noteAt).toBeGreaterThan(-1)
    expect(noteAt).toBeLessThan(barAt)
  })
})

describe("FloatBarCount — 수치 칩 (Badge tone 재사용)", () => {
  it("+N은 positive tone, '+' 접두", () => {
    const html = renderToStaticMarkup(h(FloatBarCount, { value: 3 }))
    expect(html).toContain("+3")
    expect(html).toContain("positive")
  })

  it("−N은 negative tone", () => {
    const html = renderToStaticMarkup(h(FloatBarCount, { value: -2 }))
    expect(html).toContain("-2")
    expect(html).toContain("negative")
  })

  it("0은 neutral tone, 접두 없음", () => {
    const html = renderToStaticMarkup(h(FloatBarCount, { value: 0 }))
    expect(html).toContain(">0<")
    expect(html).toContain("neutral")
    expect(html).not.toContain("+0")
  })

  it("Badge pill 형태를 재사용한다", () => {
    const html = renderToStaticMarkup(h(FloatBarCount, { value: 5 }))
    expect(html).toContain("badge")
    expect(html).toContain("pill")
  })
})

describe("FloatBarLabel / FloatBarNotice", () => {
  it("라벨 텍스트 칩", () => {
    const html = renderToStaticMarkup(h(FloatBarLabel, null, "assembler/main"))
    expect(html).toContain("assembler/main")
    expect(html).toContain("label")
  })

  it("노티스 — 같은 도킹 자리의 단독 pill, role=status", () => {
    const html = renderToStaticMarkup(h(FloatBarNotice, null, "적용했어요"))
    expect(html).toContain('role="status"')
    expect(html).toContain("적용했어요")
    expect(html).toContain("notice")
    expect(html).toContain("bottomCenter")
  })
})
