// "안전하게"의 경계 — env·시크릿·크레덴셜·바이너리·잠금파일은 내용을 아예 읽지 않는다.
// 호출자가 읽기 전 필터로 쓰고, extractRepo 내부에서도 재확인한다(이중 방어).
// 오탐(secret-santa 같은 무해한 이름)은 감수한다 — 안전 우선, blockedPaths로 정직 보고.

const BLOCKED_DIR_SEGMENTS = new Set([
  ".git",
  "node_modules",
  ".next",
  // 크레덴셜이 관례적으로 사는 홈 디렉토리 계열 (크로스체크 정정 2026-07-08)
  ".ssh",
  ".aws",
  ".kube",
  ".docker",
  ".gnupg",
])

// 확장자와 무관하게 이름 자체가 크레덴셜 캐리어인 파일들
const BLOCKED_FILE_NAMES = new Set([
  ".npmrc",
  ".yarnrc",
  ".yarnrc.yml",
  ".netrc",
  "_netrc",
  ".pgpass",
  ".pypirc",
  ".boto",
  ".htpasswd",
  ".git-credentials",
])

// ssh 개인키 계열 — id_rsa.bak처럼 접미가 붙어도 잡는다
const BLOCKED_NAME_PREFIXES = ["id_rsa", "id_ed25519", "id_ecdsa"]

const BLOCKED_EXTENSIONS = new Set([
  // 시크릿 캐리어
  "pem",
  "key",
  "p12",
  "pfx",
  "jks",
  "keystore",
  "p8",
  "ppk",
  "gpg",
  "asc",
  // dev.env 같은 접미형 env
  "env",
  "tfstate",
  // 이미지
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "avif",
  "ico",
  "bmp",
  "tiff",
  "svg",
  // 폰트
  "woff",
  "woff2",
  "ttf",
  "otf",
  "eot",
  // 압축·아카이브
  "zip",
  "gz",
  "tgz",
  "tar",
  "bz2",
  "7z",
  "rar",
  // 미디어·문서 바이너리
  "pdf",
  "mp3",
  "mp4",
  "mov",
  "avi",
  "webm",
  // 실행·컴파일 산출물
  "exe",
  "dll",
  "so",
  "dylib",
  "bin",
  "wasm",
  "jar",
  "class",
  "db",
  "sqlite",
  "sqlite3",
])

// 내용이 추출에 불필요한 잠금파일 — 크기만 크고 신호가 없다.
const LOCKFILE_NAMES = new Set([
  "package-lock.json",
  "npm-shrinkwrap.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "bun.lockb",
  "bun.lock",
  "composer.lock",
  "gemfile.lock",
  "cargo.lock",
  "poetry.lock",
  "uv.lock",
  "go.sum",
])

export function isBlockedPath(path: string): boolean {
  const normalized = path.replace(/\\/g, "/").toLowerCase()
  const segments = normalized.split("/").filter((s) => s.length > 0 && s !== ".")
  if (segments.length === 0) return true

  if (segments.some((s) => BLOCKED_DIR_SEGMENTS.has(s))) return true
  // 디렉토리명에 섞인 시크릿 신호도 잡는다 (예: ops/Credential-Store/token.txt)
  if (segments.some((s) => s.includes("credential") || s.includes("secret"))) return true

  const name = segments[segments.length - 1]
  if (name.startsWith(".env")) return true
  if (BLOCKED_FILE_NAMES.has(name)) return true
  if (BLOCKED_NAME_PREFIXES.some((prefix) => name.startsWith(prefix))) return true
  if (LOCKFILE_NAMES.has(name)) return true

  const dot = name.lastIndexOf(".")
  if (dot > 0 && BLOCKED_EXTENSIONS.has(name.slice(dot + 1))) return true

  return false
}
