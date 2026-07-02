"use client"

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react"
import { clsx } from "clsx"
import { ChevronDownIcon } from "./icons"
import styles from "./Select.module.css"

export interface SelectOption<T extends string = string> {
  value: T
  label: string
}

interface SelectProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options: SelectOption<T>[]
  // 라벨 없는 인라인 사용이 기본이므로 접근성 라벨 필수.
  "aria-label": string
  // value가 옵션에 없을 때(예: 역할 필터의 대상 역할이 사라진 뒤) 트리거가 빈 pill로 남지 않게.
  placeholder?: string
  disabled?: boolean
  className?: string
}

// 커스텀 pill 드롭다운 — native <select> 금지(OS 룩 통일). value 타입은 옵션에서 추론(호출부 단언 불필요).
// 키보드: Enter/Space/↓ 열기, Esc 닫기, ↑↓ 이동, Enter 선택.
export function Select<T extends string = string>({
  value,
  onChange,
  options,
  placeholder = "선택",
  disabled,
  className,
  "aria-label": ariaLabel,
}: SelectProps<T>) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const rootRef = useRef<HTMLDivElement>(null)
  const listId = useId()
  const selected = options.find((o) => o.value === value)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [open])

  // 활성 옵션이 바뀔 때마다 ref가 새 노드에 붙으므로, 붙는 시점에 스크롤 추적.
  const scrollActiveIntoView = (node: HTMLLIElement | null) => {
    node?.scrollIntoView({ block: "nearest" })
  }

  const openMenu = () => {
    setActiveIndex(Math.max(0, options.findIndex((o) => o.value === value)))
    setOpen(true)
  }
  const commit = (index: number) => {
    const opt = options[index]
    if (opt) onChange(opt.value)
    setOpen(false)
  }
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault()
        openMenu()
      }
      return
    }
    if (e.key === "Escape") {
      e.preventDefault()
      setOpen(false)
    } else if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIndex((i) => Math.min(options.length - 1, i + 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIndex((i) => Math.max(0, i - 1))
    } else if (e.key === "Enter") {
      e.preventDefault()
      commit(activeIndex)
    } else if (e.key === "Tab") {
      setOpen(false)
    }
  }

  return (
    <div ref={rootRef} className={clsx(styles.root, className)}>
      <button
        type="button"
        className={styles.trigger}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onKeyDown}
      >
        {selected ? selected.label : <span className={styles.placeholder}>{placeholder}</span>}
        <ChevronDownIcon size={12} aria-hidden />
      </button>
      {open && (
        <ul id={listId} role="listbox" aria-label={ariaLabel} className={styles.menu}>
          {options.map((opt, i) => (
            <li
              key={opt.value}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={opt.value === value}
              className={clsx(styles.option, i === activeIndex && styles.active, opt.value === value && styles.selected)}
              ref={i === activeIndex ? scrollActiveIntoView : undefined}
              onPointerEnter={() => setActiveIndex(i)}
              onClick={() => commit(i)}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
