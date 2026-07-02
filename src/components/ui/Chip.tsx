import { type ButtonHTMLAttributes } from "react"
import { clsx } from "clsx"
import styles from "./Chip.module.css"

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  // 칩이 가리키는 객체 타입 라벨 (예: "API", "DB") — 모노 마커로 앞에 붙는다.
  marker?: string
  markerTone?: "brand" | "positive"
}

// 참조 칩 — 클릭하면 대상 객체로 이동하는 인터랙티브 칩. 읽기 전용 표식은 Badge를 쓴다.
export function Chip({ marker, markerTone = "brand", children, className, type = "button", ...props }: ChipProps) {
  return (
    <button type={type} className={clsx(styles.chip, className)} {...props}>
      {marker && (
        <span className={clsx(styles.marker, markerTone === "positive" && styles.markerPositive)}>{marker}</span>
      )}
      {children}
    </button>
  )
}
