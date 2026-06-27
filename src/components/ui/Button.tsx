import { type ButtonHTMLAttributes, type ReactNode } from "react"
import { clsx } from "clsx"
import styles from "./Button.module.css"

type ButtonVariant = "filled" | "ghost"
type ButtonSize = "sm" | "md" | "lg"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

// filled = 화면의 주요 액션(브랜드). ghost = 보조(중성, hover 시 브랜드).
export function Button({
  variant = "ghost",
  size = "md",
  loading = false,
  leftIcon,
  rightIcon,
  disabled,
  children,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(styles.btn, styles[variant], styles[size], className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <span className={styles.spinner} aria-hidden /> : leftIcon}
      {children}
      {rightIcon}
    </button>
  )
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  // 아이콘 전용 버튼은 접근성을 위해 라벨 필수.
  label: string
}

export function IconButton({ label, children, className, ...props }: IconButtonProps) {
  return (
    <button className={clsx(styles.btn, styles.icon, className)} aria-label={label} {...props}>
      {children}
    </button>
  )
}
