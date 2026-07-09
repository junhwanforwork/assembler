# git 쓰기 인증 설계 — 정책 문서를 사용자 GitHub 레포에 PR로 올리기

> 확정: 2026-07-09 조사. **접근법(설계) 문서** — 구현은 별도 웨이브(창업자가 git-write 착수 결정 시).
> 아크 2 v2 기능(product-definition.md F7·roadmap 아크2). 이 문서는 그때의 착수 명세다.

---

## 0. 용어 정리 (혼동 방지)

- **오케스트레이터 git**(내가 우리 Assembler 코드를 커밋·머지·push) — 이 문서와 **무관**. 잘 됨.
- **git 쓰기 기능**(앱이 **사용자를 대신해 그 사용자의 GitHub 레포에** 정책·기획 md를 PR로 올림) —
  이 문서의 주제. 앱이 사용자 GitHub에 로그인(인증)해야 하므로 인증 설계가 선행 블로커였다.

## 1. 사용자 아이디어 = GitHub 표준 OAuth (정합 확인)

창업자 아이디어(2026-07-09): "우리가 인증 링크를 주고, 레포 링크를 받으면 되지 않나."
→ 이게 정확히 GitHub OAuth 승인 흐름이다. 링크 클릭 → GitHub에서 권한 승인 → 앱이 그 사용자로서
레포에 쓴다. 아래 설계가 이걸 최소 비용으로 구현한다.

## 2. 핵심 발견 (실측, 2026-07-09)

- **Supabase Auth를 이미 쓴다**(NextAuth 아님). `src/lib/auth/oauth.ts:6` `OAuthProvider`에
  **`"github"`가 이미 타입으로 존재**. OAuth 콜백 라우트도 있다(`src/app/auth/callback/route.ts:16-31`
  `exchangeCodeForSession`). → **GitHub 로그인 배선의 90%가 이미 있다.**
- 현재 repo 인프라는 **전면 읽기 전용**: `src/lib/repo-clone/clone.ts:20-41`(공개 얕은 클론,
  `GIT_TERMINAL_PROMPT=0`), `url.ts:25`가 토큰 URL을 오히려 거부 → **읽기 경로는 건드리지 않는다.**
- 외부 HTTP 표준 = `src/lib/anthropic.ts:142-171`(SDK 무의존 fetch + AbortController + 상태 보존
  에러 클래스). GitHub API 래퍼가 이걸 본뜬다.
- 사용자별 외부 토큰 저장 테이블·at-rest 암호화 유틸 **없음**(신설 필요).

## 3. 권장 접근

### 3-1. 인증 = Supabase GitHub OAuth + scope 추가
- `signInWithOAuth({ provider: 'github', options: { scopes: 'public_repo' } })` (`oauth.ts:15` 확장).
  이 리다이렉트 URL이 곧 "인증 링크"다.
- **Supabase 대시보드에 GitHub OAuth 앱 등록**(client id/secret) — 1회, 코드 밖 설정. 콜백은 로컬
  개발 땐 `localhost`, 배포 후 배포 URL(배포는 유보 상태라 로컬 콜백으로 먼저 검증 가능).
- 공개 레포만이면 `public_repo`, 비공개도 지원하려면 `repo`. **v1 = public_repo 권장**(안전·범위 최소).

### 3-2. 토큰 확보·저장
- 콜백에서 세션의 `provider_token`(GitHub access token)을 신규 테이블에 저장:
  `user_github_tokens(user_id uuid pk references auth.users, access_token, refresh_token?, scope,
  expires_at, updated_at)`. RLS = `user_id = auth.uid()` **단일키**(dual-key 불필요 — 로그인 전용).
- 삽입 지점 = `auth/callback/route.ts:19-24` 근처(exchangeCodeForSession 직후 provider_token 추출).
- at-rest 암호화 유틸 신설(현재 없음) 또는 서버 전용(service_role) 접근으로 보호. 토큰은 서버에서만
  읽고 클라이언트로 절대 내보내지 않는다.

### 3-3. 레포 링크 = 기존 repo-scan UX 재사용
- 사용자가 `github.com/owner/repo` 입력(`CodeConnectModal` 패턴). 쓰기 대상 레포로.

### 3-4. PR 생성 = GitHub REST API (git push 아님)
- 신규 `src/lib/github/pr.ts`(anthropic.ts fetch 패턴): `create branch ref → put contents(md)
  → create pull`. GraphQL 아닌 REST(fine-grained 토큰 호환).
- 신규 서버 라우트 `src/app/api/github/pr/route.ts` — **로그인 필수 가드**(`getAuthedUserId`,
  `src/lib/supabase/assembler.ts:110`) + rate limit(신규 스코프 or "sync" 재사용 판단).
- **읽기 전용 clone.ts/url.ts 무접촉** — PR은 API로만 처리(로컬 push 아님).

## 4. 산출물 (구현 웨이브에서)

| 산출물 | 파일 | 참고 |
|---|---|---|
| 토큰 테이블 마이그레이션 | `supabase/migrations/…_github_tokens.sql` | RLS 단일키, `wf_projects_user.sql` 패턴 |
| 토큰 repo | `src/lib/supabase/github-token-repo.ts` | 자식 repo 전형 |
| GitHub API 래퍼 | `src/lib/github/pr.ts` | anthropic.ts:142-171 패턴 |
| PR 라우트 | `src/app/api/github/pr/route.ts` | repo-scan/route.ts:15-49 골격 + 로그인 가드 |
| OAuth scope + 콜백 저장 | `oauth.ts:15` · `auth/callback/route.ts:19-24` | provider_token 추출·저장 |
| 로그인/연결 UI | 대시보드 or 정책 문서 뷰 | "GitHub 연결하기" + PR 만들기 버튼 |

## 5. 착수 시 결정 대기 (구현 웨이브 시작에서)

1. **scope**: public_repo(공개만·안전) vs repo(비공개 포함). → v1 public_repo 권장.
2. **토큰 저장**: 영구 저장(암호화) vs 매번 재인증(저장 안 함, 세션 provider_token만). → 영구 저장이
   UX 좋으나 암호화 유틸 필요. v1은 재인증도 허용 가능(간단).
3. **앱 종류**: GitHub App(장기 권장 — fine-grained·짧은 토큰·확장성) vs OAuth App(간단, MVP). Supabase
   GitHub provider는 OAuth App 기반이라 **MVP는 OAuth App로 시작**, 장기엔 GitHub App 검토.
4. **PR 대상 경로**: 레포 루트의 어느 폴더에 md를 넣을지(예: `docs/`), 브랜치 네이밍 규칙, PR 본문 템플릿.
5. **인증 실패·토큰 만료 UX**: 재인증 유도 카피(ux-writing).

## 6. 보안 체크리스트 (구현 시)

- 토큰은 서버 전용 — 클라이언트 응답·로그·커밋에 절대 노출 금지(크레덴셜 규율).
- PR 라우트는 로그인 필수(getAuthedUserId) + 소유 토큰만 사용(RLS user_id=auth.uid()).
- 레포 URL 화이트리스트(11차 repo-scan url.ts 패턴 재사용 — github/gitlab owner/repo만).
- rate limit(PR 생성 남용 방어).
- 커밋 내용(md)은 사용자 저작물 — 시크릿 주입 여지 없음(평문 md).
