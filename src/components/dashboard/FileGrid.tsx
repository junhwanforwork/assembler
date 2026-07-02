import type { FileSummary } from "@/lib/api/client"
import type { DesignCounts } from "@/lib/types/design"
import { Button } from "@/components/ui/Button"
import { FileTextIcon } from "@/components/ui/icons"
import { AssemblyLoader } from "@/components/ui/motion/AssemblyLoader"
import { EmptyStateArt } from "@/components/ui/motion/EmptyStateArt"
import s from "./dashboard.module.css"

// "화면 N · 플로우 N" — 없으면 요소 수로 폴백.
function fileMeta(counts: DesignCounts): string {
  const parts: string[] = []
  if (counts.pages) parts.push(`화면 ${counts.pages}`)
  if (counts.flows) parts.push(`플로우 ${counts.flows}`)
  if (counts.features) parts.push(`기능 ${counts.features}`)
  return parts.length > 0 ? parts.join(" · ") : counts.elements > 0 ? `요소 ${counts.elements}` : "빈 스펙"
}

// 스펙 목록. 생성 진입로는 두지 않는다 — 생성은 컴포저 단일 관문.
// 로드 실패는 빈 상태와 구분해 보여준다("스펙이 사라졌다" 오해 방지).
export function FileGrid({
  files,
  loading,
  error,
  onRetry,
  onOpenFile,
}: {
  files: FileSummary[]
  loading: boolean
  error: boolean
  onRetry: () => void
  onOpenFile: (file: FileSummary) => void
}) {
  return (
    <section className={s.section}>
      <div className={s.sectionHead}>
        <div className={s.sectionTitle}>스펙</div>
      </div>

      {loading ? (
        <div className={s.state}>
          <AssemblyLoader size={72} label="불러오는 중이에요…" />
        </div>
      ) : error ? (
        <div className={s.state}>
          {/* 훅이 에러 원인을 boolean으로 붕괴시켜 원인 단정 불가 — 중립 카피(사용자 환경 탓 금지). */}
          <div className={s.stateTitle}>스펙을 불러오지 못했어요</div>
          <div className={s.stateSub}>일시적인 오류가 생겼어요. 잠시 후 다시 시도해 주세요.</div>
          <div className={s.stateAction}>
            <Button variant="filled" onClick={onRetry}>
              다시 시도하기
            </Button>
          </div>
        </div>
      ) : files.length === 0 ? (
        <div className={s.state}>
          <EmptyStateArt size={160} />
          <div className={s.stateTitle}>아직 만든 스펙이 없어요</div>
          <div className={s.stateSub}>위에 아이디어를 적으면 첫 스펙을 만들어 드려요.</div>
        </div>
      ) : (
        <div className={s.grid}>
          {files.map((file) => (
            <button key={file.id} className={s.fcard} onClick={() => onOpenFile(file)}>
              <span className={s.ficon}>
                <FileTextIcon size={20} />
              </span>
              <div className={s.ftitle}>{file.name}</div>
              <div className={s.fmeta}>{fileMeta(file.counts)}</div>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
