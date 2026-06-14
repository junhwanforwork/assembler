세션 시작 루틴을 실행한다. 툴 연결 확인 → 지난 세션 목록 제시 → 선택한 작업 이어받기. (/checkout의 짝.)

세션 로그: `/Users/junhwanlim/.claude/projects/-Users-junhwanlim-Projects-assembler/memory/sessions.md`
티켓 파일: `/Users/junhwanlim/.claude/projects/-Users-junhwanlim-Projects-assembler/memory/tickets.md`
실수 노트: `/Users/junhwanlim/.claude/projects/-Users-junhwanlim-Projects-assembler/memory/mistakes.md`

## Step 1 — 툴 연결 확인

```bash
claude mcp list 2>&1
```

(타임아웃 90초.) 결과를 상태별 표로 보고한다:

```markdown
| 서버 | 상태 |
| ---- | ---- |
| supabase | ✔ 연결됨 |
| claude.ai Figma | ⚠ 인증 필요 |
| figma (로컬) | ✘ 실패 |
```

이 프로젝트 핵심 도구를 우선 표기한다:

- `supabase` — DB 작업 필수
- `TalkToFigma` / `claude.ai Figma` — 디자인 작업 시

⚠(인증 필요)·✘(실패) 서버는 **보고만 한다** — 자동 재연결·재설치 시도 금지. claude.ai 커넥터 인증은 사용자가 `/mcp`로 직접 한다. 오늘 이어받을 작업에 필요한 서버가 죽어 있으면 "이 작업 전에 인증/재연결 필요"를 명시한다.

## Step 2 — 이어할 작업 목록 제시

저장된 세션이 여러 개일 수 있다. **먼저 전체 목록을 텍스트로 출력**하고, 그다음 선택지를 묻는다.

### 2-1. 전체 목록 출력

sessions.md의 세션을 번호 매겨 전부 보여준다 (진행 중 먼저, 그 안에서 최신순 → 완료 세션 최신순):

```markdown
### 이어할 수 있는 작업

**진행 중**
1. S-009 · 와이어프레임-에디터 — Step 3에서 멈춤 / 다음: 드롭 핸들러 구현
2. S-007 · 생성-API-프롬프트 — 리뷰 반영 중 / 다음: few-shot 예시 교체

**완료 (참고)**
3. S-008 · 타입-정의 — ASS-011 Done
```

### 2-2. 선택지 질문

AskUserQuestion으로 묻는다 (옵션 최대 4개 — 목록이 더 길면 "번호로 직접 입력"을 안내):

- "진행 중" 세션 최신순 **최대 3개**:
  - 라벨: `S-007 · 작업-슬러그`
  - 설명: 상태(어디서 멈췄는지) + "다음" 첫 액션
- 마지막 옵션: `백로그 다음 티켓 (ASS-0XX)` — tickets.md의 재개 지점 (Epic 헤딩 `### 🎯 EPIC`은 그룹 레이블 — 그 아래 하위 `ASS-NNN` 티켓을 제시)
- 목록의 다른 번호나 새 작업은 사용자가 Other로 입력한다 (질문 문구에 "다른 세션은 번호로 입력"을 명시)

sessions.md에 세션이 하나도 없으면 목록을 생략하고 백로그 재개 지점만 안내한다.

## Step 3 — 선택한 작업 이어받기

**세션 선택 시:**

1. sessions.md 해당 엔트리의 "다음" 첫 액션 확인
2. 관련 티켓이 있으면 tickets.md의 맥락 블록(완료/남음/결정/함정) 로드
3. Ticket Auto-Claim: 해당 티켓이 In Progress인지 확인, 아니면 이동
4. mistakes.md의 "재발 방지" 규칙 중 이 작업과 관련된 것만 1~3줄로 리마인드
5. 멈춘 지점부터 작업 시작

**백로그 티켓 선택 시:** 해당 티켓 In Progress 이동 → 표준 워크플로우(`/pre-check` → 구현) 진입.

**Other(새 작업) 시:** 사용자 지시를 기다린다.

## 출력 — 세션 시작 보고

```markdown
## 세션 시작 — YYYY-MM-DD

[툴 상태 표]

이어받은 작업: S-### · 작업-슬러그 (또는 ASS-0XX / 새 작업)
첫 액션: 한 줄 요약
```
