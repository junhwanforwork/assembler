# Assembler Design System

코드가 디자인의 단일 출처(source of truth)다. 이 문서는 Claude Design(claude.ai/design)과
**코드 → 디자인 단방향 동기화**로 연결해 쓰기 위한 디자인 스펙 미러다.
토큰·컴포넌트는 프로토타입 컨펌이 끝나는 대로 아래에 채운다. 지금은 **아이콘 세트**부터.

> 출처 프로토타입: `design-prototypes/01-product-main-dashboard.html`
> 색 방향: 중성 블랙(`#1e1e1e`/`#2b2b2b`) + 블루 브랜드(`#4d94ff`), 그라데이션 금지.

---

## 1. 아이콘

### 컨벤션
- **viewBox:** 항상 `0 0 24 24`.
- **라인 아이콘:** `fill="none"` + `stroke="currentColor"`, `stroke-width` 1.7~2, `stroke-linecap/linejoin="round"`.
- **솔리드 아이콘:** `fill="currentColor"` (예: 앱 그리드·더보기 점).
- **색·크기:** `currentColor` + `width/height`로 상속 — 버튼 텍스트 색을 따라가므로 hover 시 브랜드색으로 자동 전환된다. 별도 색 지정 금지.
- **렌더 크기:** 컨트롤 18px · 카드 20px · 로고 22px.
- 스타일은 **Lucide 계열**(stroke 기반)에 맞춰 정돈. 정식 단계에서 Lucide로 교체해도 메타포 동일.

### 카탈로그

#### `spark` — 브랜드 마크 (로고)
용도: 로고 좌측 심볼. 브랜드 블루.
```svg
<svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M12 2c.3 3.4 1.5 5.9 3.6 8C13.4 12 12.2 14.6 12 18c-.2-3.4-1.4-5.9-3.6-8C10.5 7.9 11.7 5.4 12 2Z"/><path d="M12 2c.3 3.4 1.5 5.9 3.6 8C13.4 12 12.2 14.6 12 18c-.2-3.4-1.4-5.9-3.6-8C10.5 7.9 11.7 5.4 12 2Z" transform="rotate(90 12 12)"/></svg>
```

#### `search` — 검색
```svg
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
```

#### `settings` — 설정 (톱니바퀴)
```svg
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/></svg>
```

#### `apps` — 앱 그리드 (솔리드)
```svg
<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><circle cx="5" cy="5" r="1.6"/><circle cx="12" cy="5" r="1.6"/><circle cx="19" cy="5" r="1.6"/><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/><circle cx="5" cy="19" r="1.6"/><circle cx="12" cy="19" r="1.6"/><circle cx="19" cy="19" r="1.6"/></svg>
```

#### `plus` — 추가 (새 메인·첨부·새 파일)
```svg
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M12 5v14M5 12h14"/></svg>
```

#### `arrow-right` — 보내기/진행 (send)
```svg
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
```

#### `file-text` — 파일 (생성물)
용도: 파일 카드. 모든 파일 카드는 이 아이콘 하나로 통일한다.
```svg
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/></svg>
```

#### `more-vertical` — 더보기 (솔리드)
```svg
<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/></svg>
```

#### `chevron-down` — 펼침 (드롭다운·정렬) — 추가 권장
프로토타입 01엔 없지만 드롭다운/정렬에 곧 필요.
```svg
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><path d="M6 9l6 6 6-6"/></svg>
```

---

## 2. 색 토큰 (다크)

정본 `src/app/globals.css`, TS 미러 `src/lib/design-tokens.ts`. 그라데이션 금지.

| 역할 | 토큰 | 값 |
|------|------|----|
| 배경 | `--bg-base` / `--bg-card` / `--bg-elevated` | `#1e1e1e` / `#2b2b2b` / `#333333` |
| 텍스트 | `--text-primary` / `--text-secondary` / `--text-muted` | `#f4f4f4` / `#b0b0b0` / `#7a7a7a` |
| 보더 | `--border` / `--border-strong` | `rgba(255,255,255,.08)` / `.20` |
| 브랜드 | `--brand` / `--brand-hover` / `--brand-soft` | `#4d94ff` / `#6ba6ff` / `rgba(77,148,255,.14)` |
| 표면 | `--surface-tint` / `--shadow-pop` | `rgba(255,255,255,.06)` / `0 8px 24px rgba(0,0,0,.4)` |

브랜드(블루)는 **filled 버튼 + 인터랙션(hover/active/focus/선택)에만.**

## 3. 타이포그래피

폰트: Poppins(라틴·숫자) + Wanted Sans(한글). letter-spacing -0.01em 기본.
크기: HERO 26 · SECTION 17 · TITLE 15 · BODY 14.5 · INPUT 15.5 · LABEL 13 · META 12.
무게: 400 본문 · 500 컨트롤 · 600 헤딩/타이틀 · 700 강조.

## 4. 컴포넌트

radius: CONTROL 10 · CARD 16 · LG 18 · PILL 999.

- **Button** (`src/components/ui/Button.tsx`) — `filled`(브랜드, 주요 액션) / `ghost`(중성, hover 시 브랜드) / `IconButton`(아이콘 전용, `aria-label` 필수). loading 스피너 내장.
- **Composer** — 아이디어 입력 카드(`--bg-card`, radius LG). 좌하단 첨부(ghost), 우하단 send(filled 원형). focus 시 보더 브랜드.
- **Card(File)** — 156h, `--bg-card`, hover `--bg-elevated`. 좌상단 파일 아이콘 칩(`--surface-tint`), 본문 하단 제목 + 메타("화면 N · 플로우 N").
- **Tab** — pill. 선택=흰 아웃라인(`--border-strong`, 중성), hover=브랜드 텍스트.
- **Modal** — 백드롭 `--bg-overlay`, 카드 420px. **Toast** — 하단 중앙 pill(`--bg-elevated` + `--shadow-pop`).
