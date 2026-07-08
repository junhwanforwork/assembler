import { describe, it, expect } from "vitest"
import { parseRepoUrl } from "./url"

// ASM-061 — SSRF·인젝션 방어의 1차 관문. 화이트리스트(github.com·gitlab.com의
// https owner/repo)만 통과하고 나머지는 전부 거부해야 한다.

const VALID = [
  ["https://github.com/vercel/next.js", "https://github.com/vercel/next.js"],
  ["https://github.com/junhwanforwork/assembler", "https://github.com/junhwanforwork/assembler"],
  ["https://github.com/vercel/next.js.git", "https://github.com/vercel/next.js.git"],
  ["https://gitlab.com/gitlab-org/gitlab", "https://gitlab.com/gitlab-org/gitlab"],
  ["https://github.com/org/.github", "https://github.com/org/.github"],
  [`https://github.com/${"a".repeat(100)}/repo`, `https://github.com/${"a".repeat(100)}/repo`],
] as const

const INVALID: Array<[label: string, input: string]> = [
  ["http 스킴", "http://github.com/a/b"],
  ["file 스킴", "file:///etc/passwd"],
  ["ssh 스킴", "ssh://git@github.com/a/b"],
  ["git 스킴", "git://github.com/a/b"],
  ["ftp 스킴", "ftp://github.com/a/b"],
  ["화이트리스트 밖 호스트", "https://evil.com/a/b"],
  ["서브도메인 우회", "https://github.com.evil.com/a/b"],
  ["유사 서브도메인", "https://api.github.com/a/b"],
  ["IPv4 호스트", "https://127.0.0.1/a/b"],
  ["IPv4 사설망", "https://192.168.0.1/a/b"],
  ["localhost", "https://localhost/a/b"],
  ["IPv6 호스트", "https://[::1]/a/b"],
  ["포트 지정", "https://github.com:8443/a/b"],
  ["크레덴셜 포함", "https://user:pass@github.com/a/b"],
  ["유저인포만 포함", "https://user@github.com/a/b"],
  ["쿼리스트링", "https://github.com/a/b?x=1"],
  ["프래그먼트", "https://github.com/a/b#x"],
  ["owner 누락", "https://github.com/onlyowner"],
  ["repo 뒤 추가 경로", "https://github.com/a/b/c"],
  ["루트만", "https://github.com/"],
  ["빈 세그먼트", "https://github.com//b"],
  ["-- 시작 인자", "--upload-pack=/bin/sh"],
  ["- 시작 owner", "https://github.com/-owner/repo"],
  ["-- 시작 repo", "https://github.com/owner/--repo"],
  ["점 세그먼트", "https://github.com/./b"],
  ["점점 세그먼트", "https://github.com/../b"],
  ["공백 포함", "https://github.com/a/b c"],
  ["앞 공백", " https://github.com/a/b"],
  ["탭 포함", "https://github.com/a/\tb"],
  ["개행 포함", "https://github.com/a/b\n"],
  ["URL 아님", "not a url"],
  ["빈 문자열", ""],
  ["owner 100자 초과", `https://github.com/${"a".repeat(101)}/repo`],
  ["repo 100자 초과", `https://github.com/owner/${"b".repeat(101)}`],
  ["세그먼트 특수문자", "https://github.com/a/b$(rm)"],
  ["인코딩된 슬래시", "https://github.com/a%2Fb/c"],
]

describe("parseRepoUrl", () => {
  it.each(VALID)("허용: %s", (input, canonical) => {
    const parsed = parseRepoUrl(input)
    expect(parsed.ok).toBe(true)
    if (parsed.ok) expect(parsed.url).toBe(canonical)
  })

  it.each(INVALID)("거부(%s): %s", (_label, input) => {
    expect(parseRepoUrl(input).ok).toBe(false)
  })

  it("문자열이 아닌 입력을 거부한다", () => {
    expect(parseRepoUrl(42 as unknown as string).ok).toBe(false)
    expect(parseRepoUrl(null as unknown as string).ok).toBe(false)
    expect(parseRepoUrl(undefined as unknown as string).ok).toBe(false)
  })
})
