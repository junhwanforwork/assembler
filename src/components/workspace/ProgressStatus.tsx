interface ProgressStatusProps {
  count: number
}

function getMessage(count: number): string {
  if (count === 0) return '아직 비어있어요. 기능을 골라볼까요?'
  if (count <= 3) return '시작이 좋아요. 더 추가해보세요'
  if (count <= 6) return '핵심 기능이 갖춰지고 있어요'
  return '개발자에게 공유할 수 있을 것 같아요'
}

export default function ProgressStatus({ count }: ProgressStatusProps) {
  return (
    <div
      className="rounded-xl px-5 py-4 mb-6 flex items-center gap-4"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
    >
      <div>
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          기능 {count}개 선택됨
        </p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          {getMessage(count)}
        </p>
      </div>
    </div>
  )
}
