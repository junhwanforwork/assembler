"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/Button"
import { Modal } from "@/components/ui/Modal"
import { api, ApiError } from "@/lib/api/client"
import { errorMessage } from "@/lib/api/messages"
import { MAX_SYNC_BYTES } from "@/lib/api/validate-sync"
import { parseSyncPaste, type RowIssue } from "./code-connect"
import s from "./CodeConnectModal.module.css"

// 수동 싱크-인(ASM-026) — 코드에서 뽑은 API·DB 테이블 JSON을 붙여넣거나 파일로 올려
// 프로젝트의 코드-진실로 연결한다. MCP 자동화는 범위 밖(수동 최소 버전).
// 성공 시 부모(onSynced)가 후속(메인 스펙 자동 생성·카피 재판정·토스트)을 맡는다.

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

function issueLabel(issue: RowIssue): string {
  return `${issue.section === "apis" ? "API" : "테이블"} ${issue.index + 1}번 항목`
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
  const [text, setText] = useState("")
  const [syncing, setSyncing] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [issues, setIssues] = useState<RowIssue[]>([])
  // 부분 실패(API만 성공) 후 재시도에서 성공분 POST를 스킵 — apis_synced activity 중복 기록 방지.
  // 내용이 바뀌면 다른 페이로드라 리셋한다(스킵이 새 API를 조용히 누락시키지 않게).
  const [apisSynced, setApisSynced] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const clearFeedback = () => {
    setMessage(null)
    setIssues([])
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
  const submit = async () => {
    const parsed = parseSyncPaste(text)
    if (!parsed.ok) {
      setMessage(parsed.message)
      setIssues(parsed.issues)
      return
    }
    clearFeedback()
    setSyncing(true)
    let isApisSynced = apisSynced
    try {
      // 데이터는 업서트(멱등)라 재시도가 안전하지만, activity는 POST마다 기록된다 —
      // 부분 실패 후 재시도에선 이미 성공한 apis POST를 스킵해 apis_synced 중복 기록을 막는다.
      if (parsed.payload.apis.length > 0 && !isApisSynced) {
        await api.post(`/api/products/${productId}/apis`, { apis: parsed.payload.apis })
        isApisSynced = true
        setApisSynced(true)
      }
      if (parsed.payload.tables.length > 0) {
        await api.post(`/api/products/${productId}/db-tables`, { tables: parsed.payload.tables })
      }
      onSynced({ apis: parsed.payload.apis.length, tables: parsed.payload.tables.length })
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

  return (
    <Modal labelledBy="code-connect-title" onClose={onClose} closeDisabled={syncing}>
      <div className={s.title} id="code-connect-title">
        이미 코드가 있어요
      </div>
      <p className={s.sub}>
        코드에서 뽑은 API·DB 테이블(JSON)을 붙여넣으면 {projectName}의 코드로 연결해 드려요.
      </p>
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
          className={s.fileInput}
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
      {message && (
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
      )}
      <div className={s.actions}>
        <Button variant="ghost" onClick={onClose} disabled={syncing}>
          닫기
        </Button>
        <Button variant="filled" loading={syncing} disabled={text.trim().length === 0 || syncing} onClick={submit}>
          연결하기
        </Button>
      </div>
    </Modal>
  )
}
