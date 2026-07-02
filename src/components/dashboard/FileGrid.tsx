import type { FileSummary } from "@/lib/api/client"
import type { DesignCounts } from "@/lib/types/design"
import { FileTextIcon, MoreVerticalIcon, PlusIcon } from "@/components/ui/icons"
import { AssemblyLoader } from "@/components/ui/motion/AssemblyLoader"
import { EmptyStateArt } from "@/components/ui/motion/EmptyStateArt"
import s from "./dashboard.module.css"

// "화면 N · 플로우 N" — 없으면 요소 수로 폴백.
function fileMeta(counts: DesignCounts): string {
  const parts: string[] = []
  if (counts.pages) parts.push(`화면 ${counts.pages}`)
  if (counts.flows) parts.push(`플로우 ${counts.flows}`)
  if (counts.features) parts.push(`기능 ${counts.features}`)
  return parts.length > 0 ? parts.join(" · ") : counts.elements > 0 ? `요소 ${counts.elements}` : "빈 파일"
}

export function FileGrid({
  files,
  loading,
  canCreate,
  onNewFile,
  onOpenFile,
}: {
  files: FileSummary[]
  loading: boolean
  canCreate: boolean
  onNewFile: () => void
  onOpenFile: (file: FileSummary) => void
}) {
  return (
    <section className={s.section}>
      <div className={s.sectionHead}>
        <div className={s.sectionTitle}>파일</div>
      </div>

      {loading ? (
        <div className={s.state}>
          <AssemblyLoader size={72} label="불러오는 중이에요…" />
        </div>
      ) : (
        <>
          {files.length === 0 && (
            <div className={s.state}>
              <EmptyStateArt size={160} />
              <div className={s.stateTitle}>아직 만든 파일이 없어요</div>
              <div className={s.stateSub}>위에 아이디어를 적으면 첫 파일을 만들어 드려요.</div>
            </div>
          )}
          <div className={s.grid}>
            {canCreate && (
              <button className={s.newCard} onClick={onNewFile}>
                <span className={s.plus}>
                  <PlusIcon size={22} />
                </span>
                <span>빈 파일로 시작</span>
              </button>
            )}
            {files.map((file) => (
              <button key={file.id} className={s.fcard} onClick={() => onOpenFile(file)}>
                <span className={s.ficon}>
                  <FileTextIcon size={20} />
                </span>
                <span className={s.more}>
                  <MoreVerticalIcon size={18} />
                </span>
                <div className={s.ftitle}>{file.name}</div>
                <div className={s.fmeta}>{fileMeta(file.counts)}</div>
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
