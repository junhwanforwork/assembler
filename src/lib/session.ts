const SESSION_KEY = 'assembler_session_id'
// 리네임(howcloud→assembler) 전 키. 비로그인 사용자의 기존 프로젝트는
// wf_projects.session_id RLS로 묶여 있어, 구 키 값을 승계해야 접근이 유지된다.
const LEGACY_SESSION_KEY = 'howcloud_session_id'

export function getSessionId(): string {
  if (typeof window === 'undefined') return ''
  let id = localStorage.getItem(SESSION_KEY)
  if (!id) {
    id = localStorage.getItem(LEGACY_SESSION_KEY) ?? crypto.randomUUID()
    localStorage.setItem(SESSION_KEY, id)
  }
  return id
}
