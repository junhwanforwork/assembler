interface BadgeProps {
  children: React.ReactNode
  variant?: 'new' | 'default'
}
export default function Badge({ children, variant = 'default' }: BadgeProps) {
  return <span>{children}</span>
}
