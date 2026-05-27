'use client'
import { UIDecision } from '@/types'

interface ImplDecisionItemProps {
  decision: UIDecision
  isOpen: boolean
  onToggle: () => void
}

export default function ImplDecisionItem({ decision, isOpen, onToggle }: ImplDecisionItemProps) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)' }}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-start justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="flex-1">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{decision.element}</span>
          <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--text-primary)' }}>
            {decision.chosen}
          </p>
        </div>
        <span
          className="mt-1 transition-transform text-xs flex-shrink-0"
          style={{
            color: 'var(--text-muted)',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        >
          ▾
        </span>
      </button>

      {isOpen && (
        <div className="px-4 pb-4 flex flex-col gap-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="pt-3">
            <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>왜 이 방식인가요?</p>
            <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{decision.why}</p>
          </div>
          <div>
            <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>장점</p>
            <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{decision.advantage}</p>
          </div>
          {decision.company_context && (
            <div className="rounded-lg px-3 py-2" style={{ background: 'var(--bg-elevated)' }}>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                💡 {decision.company_context}
              </p>
            </div>
          )}
          {decision.screenshot_url && (
            <img
              src={decision.screenshot_url}
              alt="스크린샷"
              className="w-full rounded-lg object-cover"
              style={{ maxHeight: 240 }}
            />
          )}
        </div>
      )}
    </div>
  )
}
