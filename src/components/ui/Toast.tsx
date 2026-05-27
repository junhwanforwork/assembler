'use client'
interface ToastProps {
  message: string
  visible: boolean
  action?: { label: string; href: string }
}
export default function Toast({ message, visible, action }: ToastProps) {
  if (!visible) return null
  return <div>{message}</div>
}
