// ASM-061 — 깃 레포 URL 화이트리스트(SSRF·인젝션 1차 방어).
// https://github.com/{owner}/{repo} · https://gitlab.com/{owner}/{repo}만 허용.
// 통과한 URL도 셸을 거치지 않고 execFile 인자 배열로만 전달된다(clone.ts).

const ALLOWED_HOSTS = new Set(["github.com", "gitlab.com"])

// owner/repo 세그먼트: 영숫자·-·_·. 만, 100자 이하. `-` 시작 금지(git 인자 위장 차단), `.`·`..` 금지.
const SEGMENT_PATTERN = /^(?!-)(?!\.{1,2}$)[A-Za-z0-9_.-]{1,100}$/

export type ParsedRepoUrl = { ok: true; url: string } | { ok: false }

export function parseRepoUrl(raw: unknown): ParsedRepoUrl {
  if (typeof raw !== "string" || raw.length === 0 || /\s/.test(raw)) return { ok: false }

  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return { ok: false }
  }

  if (url.protocol !== "https:") return { ok: false }
  if (!ALLOWED_HOSTS.has(url.hostname)) return { ok: false }
  // URL 파서가 흡수하는 우회 통로를 전부 닫는다 — 포트·크레덴셜·쿼리·프래그먼트.
  if (url.port !== "" || url.username !== "" || url.password !== "") return { ok: false }
  if (url.search !== "" || url.hash !== "") return { ok: false }

  // 인코딩된 슬래시(%2F) 등이 세그먼트로 위장하지 못하게 raw pathname 기준으로 자른다.
  const segments = url.pathname.split("/").slice(1)
  if (segments.length !== 2) return { ok: false }
  if (!segments.every((s) => SEGMENT_PATTERN.test(s))) return { ok: false }

  return { ok: true, url: `https://${url.hostname}/${segments[0]}/${segments[1]}` }
}
