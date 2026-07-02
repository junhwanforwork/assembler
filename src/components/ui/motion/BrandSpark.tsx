import { clsx } from "clsx"
import { SparkIcon } from "@/components/ui/icons"
import s from "./BrandSpark.module.css"

// 브랜드 스파크 모션 — pulse(생성 중 호흡)·spin-in(등장 틱). 기본은 정적(none).
export function BrandSpark({
  size = 22,
  motion = "none",
  className,
}: {
  size?: number
  motion?: "none" | "pulse" | "spin-in"
  className?: string
}) {
  return (
    <SparkIcon
      size={size}
      className={clsx(s.spark, motion === "pulse" && s.pulse, motion === "spin-in" && s.spinIn, className)}
    />
  )
}
