"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/Button"
import { Modal } from "@/components/ui/Modal"
import { api, ApiError } from "@/lib/api/client"
import { errorMessage } from "@/lib/api/messages"
import { MAX_SYNC_BYTES } from "@/lib/api/validate-sync"
import { parseSyncPaste, type RowIssue, type SyncPayload } from "./code-connect"
import { readFolderFiles } from "./folder-connect"
import { extractRepo, isBlockedPath, type ExtractReport, type ExtractResult } from "./repo-extract-bridge"
import s from "./CodeConnectModal.module.css"

// 코드 연결(ASM-062, F1-C) — "JSON을 몰라도 된다". 비개발자 우선 3경로:
// ① 내 폴더 선택(기본) ② 깃 주소 ③ JSON 직접 넣기(고급, 개발자용).
// 폴더·깃은 추출 미리보기를 거쳐 연결하고, JSON은 기존대로 붙여넣기 즉시 연결한다.
// 성공 시 부모(onSynced)가 후속(메인 스펙 자동 생성·카피 재판정·토스트)을 맡는다.

declare module "react" {
  // 비표준 디렉토리 선택 속성 — @types/react 미포함이라 여기서만 보강한다.
  interface InputHTMLAttributes<T> extends HTMLAttributes<T> {
    webkitdirectory?: string
  }
}

const PLACEHOLDER = `{
  "apis": [
    { "method": "GET", "endpoint": "/walks", "summary": "산책 목록", "status": "active", "source": "code" }
  ],
  "tables": [
    { "name": "walks", "description": "산책 기록", "columns": [
      { "name": "id", "type": "uuid", "nullable": false, "isPrimaryKey": true }
    ], "source": "code" }
  ]
}`

// 레포 스캔(레인 2 계약) 에러 → 사용자 카피. 그 외 코드는 공용 errorMessage로.
const REPO_SCAN_MESSAGES: Record<string, string> = {
  invalid_repo_url: "주소를 확인해 주세요. 공개 GitHub/GitLab 주소만 돼요.",
  clone_failed: "레포를 가져오지 못했어요. 공개 레포인지 확인해 주세요.",
}

function repoScanMessage(error: unknown): string {
  if (error instanceof ApiError && REPO_SCAN_MESSAGES[error.code]) return REPO_SCAN_MESSAGES[error.code]
  return errorMessage(error)
}

function issueLabel(issue: RowIssue): string {
  return `${issue.section === "apis" ? "API" : "테이블"} ${issue.index + 1}번 항목`
}

type ConnectPreview = { payload: SyncPayload; report: ExtractReport; source: "folder" | "git" }

function PathReportNote({ label, paths }: { label: string; paths: string[] }) {
  if (paths.length === 0) return null
  return (
    <details className={s.reportNote}>
      <summary className={s.reportSummary}>{label}</summary>
      <ul className={s.reportList}>
        {paths.map((path) => (
          <li key={path}>{path}</li>
        ))}
      </ul>
    </details>
  )
}

export function CodeConnectModal({
  productId,
  projectName,
  onClose,
  onSynced,
}: {
  productId: string
  projectName: string
  onClose: () => void
  onSynced: (summary: { apis: number; tables: number }) => void
}) {
  const [preview, setPreview] = useState<ConnectPreview | null>(null)
  const [gitUrl, setGitUrl] = useState("")
  const [scanning, setScanning] = useState<"folder" | "git" | null>(null)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [text, setText] = useState("")
  const [syncing, setSyncing] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [issues, setIssues] = useState<RowIssue[]>([])
  // 부분 실패(API만 성공) 후 재시도에서 성공분 POST를 스킵 — apis_synced activity 중복 기록 방지.
  // 페이로드가 바뀌면(붙여넣기 수정·새 추출) 다른 페이로드라 리셋한다(스킵이 새 API를 조용히 누락시키지 않게).
  const [apisSynced, setApisSynced] = useState(false)
  const folderInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const clearFeedback = () => {
    setMessage(null)
    setIssues([])
  }

  const isPreviewEmpty = preview !== null && preview.payload.apis.length === 0 && preview.payload.tables.length === 0

  const handleFolder = async (fileList: FileList) => {
    clearFeedback()
    setScanning("folder")
    try {
      // webkitRelativePath는 폴더 루트 기준 상대 경로 — 차단·후보 판정 전부 이 경로로 한다.
      const entries = Array.from(fileList).map((file) => ({
        path: file.webkitRelativePath || file.name,
        size: file.size,
        text: () => file.text(),
      }))
      const read = await readFolderFiles(entries, isBlockedPath)
      const result = extractRepo(read.files)
      setPreview({
        payload: result.payload,
        report: {
          // capNotes·docs(ASM-070) 등 optional 필드는 스프레드로 보존 — 재조립에서 유실 방지.
          ...result.report,
          scannedCount: read.scannedCount,
          blockedPaths: [...read.blockedPaths, ...result.report.blockedPaths],
          skippedPaths: [...read.skippedPaths, ...result.report.skippedPaths],
        },
        source: "folder",
      })
      setApisSynced(false)
    } catch {
      setMessage("폴더를 읽지 못했어요. 다시 시도해 주세요.")
    } finally {
      setScanning(null)
    }
  }

  const scanRepo = async () => {
    const trimmed = gitUrl.trim()
    if (trimmed.length === 0 || scanning !== null) return
    clearFeedback()
    setScanning("git")
    try {
      const { result } = await api.post<{ result: ExtractResult }>("/api/repo-scan", { gitUrl: trimmed })
      setPreview({ ...result, source: "git" })
      setApisSynced(false)
    } catch (error) {
      setMessage(repoScanMessage(error))
    } finally {
      setScanning(null)
    }
  }

  const handleFile = async (file: File) => {
    // 서버 바이트 캡 초과 파일은 읽기 전에 컷 — 거대 문자열이 state·JSON.parse로 흘러 탭이 얼지 않게.
    if (file.size > MAX_SYNC_BYTES) {
      setMessage("파일이 너무 커요. 나눠서 보내 주세요.")
      setIssues([])
      return
    }
    try {
      setText(await file.text())
      clearFeedback()
      setApisSynced(false)
    } catch {
      setMessage("파일을 읽지 못했어요. 다시 시도해 주세요.")
      setIssues([])
    }
  }

  // 성공 시 syncing을 풀지 않는 건 의도 — 부모가 모달을 닫을 때까지 중복 제출을 막는다.
  const submitPayload = async (payload: SyncPayload) => {
    clearFeedback()
    setSyncing(true)
    let isApisSynced = apisSynced
    try {
      // 데이터는 업서트(멱등)라 재시도가 안전하지만, activity는 POST마다 기록된다 —
      // 부분 실패 후 재시도에선 이미 성공한 apis POST를 스킵해 apis_synced 중복 기록을 막는다.
      if (payload.apis.length > 0 && !isApisSynced) {
        await api.post(`/api/products/${productId}/apis`, { apis: payload.apis })
        isApisSynced = true
        setApisSynced(true)
      }
      if (payload.tables.length > 0) {
        await api.post(`/api/products/${productId}/db-tables`, { tables: payload.tables })
      }
      onSynced({ apis: payload.apis.length, tables: payload.tables.length })
    } catch (error) {
      // 부분 실패는 이미 연결된 사실을 숨기지 않는다. 429는 즉시 재시도 유도가 거짓 안내라 rate_limited 카피로.
      const tableFailCopy =
        error instanceof ApiError && error.code === "rate_limited"
          ? errorMessage(error)
          : "테이블 연결에서 오류가 났어요 — 다시 시도해 주세요."
      setMessage(isApisSynced ? `API는 연결했어요. ${tableFailCopy}` : errorMessage(error))
      setSyncing(false)
    }
  }

  const submitPaste = async () => {
    const parsed = parseSyncPaste(text)
    if (!parsed.ok) {
      setMessage(parsed.message)
      setIssues(parsed.issues)
      return
    }
    await submitPayload(parsed.payload)
  }

  const feedback = message && (
    <div className={s.feedback} role="alert">
      <p className={s.feedbackMessage}>{message}</p>
      {issues.length > 0 && (
        <ul className={s.issueList}>
          {issues.map((issue) => (
            <li key={`${issue.section}-${issue.index}`}>
              {issueLabel(issue)}: {issue.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  )

  return (
    <Modal labelledBy="code-connect-title" onClose={onClose} closeDisabled={syncing}>
      <div className={s.title} id="code-connect-title">
        이미 코드가 있어요
      </div>

      {preview === null ? (
        <>
          <p className={s.sub}>
            폴더나 깃 주소를 알려 주면 코드에서 API·DB를 찾아 {projectName}에 연결해 드려요.
          </p>

          <div className={s.pathSection}>
            <input
              ref={folderInputRef}
              type="file"
              webkitdirectory=""
              multiple
              className={s.hiddenInput}
              aria-label="프로젝트 폴더"
              onChange={(e) => {
                const files = e.target.files
                if (files && files.length > 0) void handleFolder(files)
                e.target.value = ""
              }}
            />
            <Button
              variant="filled"
              disabled={scanning !== null || syncing}
              loading={scanning === "folder"}
              onClick={() => folderInputRef.current?.click()}
            >
              내 폴더 선택하기
            </Button>
            <p className={s.pathNote}>
              폴더는 이 컴퓨터에서만 읽어요. .env 같은 민감한 파일은 열지 않아요.
            </p>
            {scanning === "folder" && (
              <p className={s.scanNote} role="status">
                폴더를 읽고 있어요…
              </p>
            )}
          </div>

          <div className={s.pathSection}>
            <p className={s.pathLabel}>또는 깃 주소로 가져와요</p>
            <div className={s.gitRow}>
              <input
                type="url"
                className={s.gitInput}
                value={gitUrl}
                placeholder="https://github.com/owner/repo"
                aria-label="깃 주소"
                disabled={scanning !== null || syncing}
                onChange={(e) => setGitUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void scanRepo()
                }}
              />
              <Button
                variant="ghost"
                disabled={gitUrl.trim().length === 0 || scanning !== null || syncing}
                loading={scanning === "git"}
                onClick={() => void scanRepo()}
              >
                가져오기
              </Button>
            </div>
            {scanning === "git" && (
              <p className={s.scanNote} role="status">
                레포를 읽고 있어요…
              </p>
            )}
          </div>

          <details
            className={s.advanced}
            open={advancedOpen}
            onToggle={(e) => setAdvancedOpen((e.target as HTMLDetailsElement).open)}
          >
            <summary className={s.advancedSummary}>JSON 직접 넣기 — 개발자용</summary>
            <p className={s.pathNote}>코드에서 뽑은 API·DB 테이블 JSON을 그대로 붙여넣는 개발자용 경로예요.</p>
            <textarea
              className={s.paste}
              value={text}
              placeholder={PLACEHOLDER}
              aria-label="코드 정보 JSON"
              spellCheck={false}
              // 싱크 중 편집 잠금 — apis POST in-flight 중 수정되면 apisSynced 리셋이 성공 마킹에 덮여
              // 재시도 스킵이 수정분을 무음 누락시킨다(크로스체크 MEDIUM-1).
              disabled={syncing}
              onChange={(e) => {
                setText(e.target.value)
                clearFeedback()
                setApisSynced(false)
              }}
            />
            <div className={s.fileRow}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className={s.hiddenInput}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) void handleFile(file)
                  e.target.value = ""
                }}
              />
              <Button variant="ghost" size="sm" disabled={syncing} onClick={() => fileInputRef.current?.click()}>
                파일에서 불러오기
              </Button>
            </div>
          </details>

          {feedback}

          <div className={s.actions}>
            <Button variant="ghost" onClick={onClose} disabled={syncing}>
              닫기
            </Button>
            {advancedOpen && (
              <Button
                variant="filled"
                loading={syncing}
                disabled={text.trim().length === 0 || syncing}
                onClick={() => void submitPaste()}
              >
                연결하기
              </Button>
            )}
          </div>
        </>
      ) : (
        <>
          {isPreviewEmpty ? (
            <p className={s.previewEmpty}>
              이 {preview.source === "folder" ? "폴더" : "레포"}에서 API·테이블을 찾지 못했어요 — Next.js·Supabase
              프로젝트를 지원해요.
            </p>
          ) : (
            <p className={s.previewTitle}>
              API {preview.payload.apis.length}개 · 테이블 {preview.payload.tables.length}개를 찾았어요.
            </p>
          )}
          {preview.report.docs && preview.report.docs.length > 0 && (
            <>
              <p className={s.previewDocs}>기획 문서 {preview.report.docs.length}개를 함께 읽었어요.</p>
              <PathReportNote label="문서 경로 보기" paths={preview.report.docs.map((doc) => doc.path)} />
            </>
          )}
          <PathReportNote
            label={`${preview.report.blockedPaths.length}개 파일은 안전을 위해 읽지 않았어요`}
            paths={preview.report.blockedPaths}
          />
          <PathReportNote
            label={`${preview.report.skippedPaths.length}개 파일은 읽지 않고 건너뛰었어요`}
            paths={preview.report.skippedPaths}
          />
          {(preview.report.capNotes ?? []).map((note) => (
            <p key={note} className={s.reportNote}>
              {note}
            </p>
          ))}

          {feedback}

          <div className={s.actions}>
            <Button variant="ghost" onClick={onClose} disabled={syncing}>
              닫기
            </Button>
            <Button
              variant="ghost"
              disabled={syncing}
              onClick={() => {
                setPreview(null)
                setApisSynced(false)
                clearFeedback()
              }}
            >
              다시 고르기
            </Button>
            {!isPreviewEmpty && (
              <Button variant="filled" loading={syncing} disabled={syncing} onClick={() => void submitPayload(preview.payload)}>
                연결하기
              </Button>
            )}
          </div>
        </>
      )}
    </Modal>
  )
}
