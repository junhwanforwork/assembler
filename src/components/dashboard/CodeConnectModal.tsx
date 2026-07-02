"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/Button"
import { Modal } from "@/components/ui/Modal"
import { api } from "@/lib/api/client"
import { errorMessage } from "@/lib/api/messages"
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
  const fileInputRef = useRef<HTMLInputElement>(null)

  const clearFeedback = () => {
    setMessage(null)
    setIssues([])
  }

  const handleFile = async (file: File) => {
    try {
      setText(await file.text())
      clearFeedback()
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
    try {
      // 업서트(멱등)라 부분 실패 후 재시도해도 중복이 안 생긴다 — 두 요청을 단순 직렬로.
      if (parsed.payload.apis.length > 0) {
        await api.post(`/api/products/${productId}/apis`, { apis: parsed.payload.apis })
      }
      if (parsed.payload.tables.length > 0) {
        await api.post(`/api/products/${productId}/db-tables`, { tables: parsed.payload.tables })
      }
      onSynced({ apis: parsed.payload.apis.length, tables: parsed.payload.tables.length })
    } catch (error) {
      setMessage(errorMessage(error))
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
        onChange={(e) => {
          setText(e.target.value)
          clearFeedback()
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
        <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()}>
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
