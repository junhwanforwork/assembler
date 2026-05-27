interface ChipProps {
  children: React.ReactNode
  active?: boolean
  onClick?: () => void
}
export default function Chip({ children, active, onClick }: ChipProps) {
  return <button type="button" onClick={onClick}>{children}</button>
}
