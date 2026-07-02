# Assembler 디자인 시스템 구축 플랜

> 에디터(Builder) HTML 프로토타입(`design-prototypes/02-editor.html`)을 코드 DS로 옮기는 플랜.
> **정본 = 코드**(`globals.css` + `design-tokens.ts`). claude.ai/design은 다운스트림 미러(코드→design 단방향 push). HTML은 버리는 레퍼런스.
> 핵심 원칙: **밑에서 위로(토큰→프리미티브→셸→도메인).** 에디터 화면부터 짜면 하드코딩·중복 발생.

---

## 현황 (이미 있는 것 — 새로 짓지 말 것)

- **토큰:** `globals.css`(CSS 변수 정본) + `design-tokens.ts`(TS 미러 1:1). 색·radius·spacing·typography·interaction 완비.
- **프리미티브:** `Button`/`IconButton`(`Button.tsx`), `Avatar`, `icons.tsx`.
- **DB 학습 기능 일부:** 데이터 뷰의 테이블 카드 + 역할 팝오버 = `asm_db_table_notes` + `DbTableNoteCard`(인스펙터 'AI 추정' 배지) 이미 구현됨(`db-learning-feature` 메모 참고).

---

## Layer 0 — 토큰 정합 (먼저, 의존성 없음)

프로토타입이 토큰 값은 거의 지켰으나 **샌 것**을 막고, **누락 토큰을 추가**한다. ⚠️ 기존 값 변경 금지 — **추가/통일만**(v1: "색 변경 금지").

### 0-1. Radius — 작은 값 누락
프로토타입 잔값: `5px`(6)·`6px`(4)·`4px`·`3px`·`14px`. 토큰 최소가 SM=8이라 8px↓ 라운드(배지·칩)가 하드코딩됨.
- **신설:** `--radius-xs: 6px` (가장 빈번). 3/4/5px → xs로 통일. `14px` → CARD(16) 흡수. `50%`(원형)는 패턴, 토큰 불필요.

### 0-2. 선 굵기 — 토큰 아예 없음
`--border`/`--border-strong`은 *색*이지 굵기가 아님. 굵기는 전부 하드코딩(`1px` 61회, `1.5px` 11회 — 이 둘만 의미를 가짐).
- **신설(색 토큰과 1:1 짝):**
  ```css
  --border-width: 1px;          /* 기본 (색 --border 와 짝) */
  --border-width-strong: 1.5px; /* 강조·선택·active (색 --border-strong 와 짝) */
  ```
  `design-tokens.ts`에 `BORDER_WIDTH` 미러. `2px`는 빈도 낮아 토큰 안 만듦.

### 0-3. 색 — 하드코딩 회색 제거
`#222 #999 #aaa #ddd #eee` 등 → 기존 `--text-muted`/`--border`/`--bg-elevated`로 매핑. 안 맞으면 `--bg-muted` 1개 신설.
`--positive-soft`(프로토타입에 있음) → globals.css에 정식 추가, 대칭으로 `--negative-soft`/`--warning-soft`.

### 0-4. 아이콘 stroke — 드리프트 (별개 책임)
SVG stroke-width가 `1.4`/`1.7`/`1.8`/`2.2`로 제각각 → **하나로 통일**(1.5 또는 1.75). 보더 토큰 아니라 **`icons.tsx` 책임.** 체감 개선 효과 제일 큼.

### 0-5. 게이트
- ds-tokens.md의 하드코딩 hex 0건 grep 통과.
- `tsc`/`lint`/`build` 통과.

---

## Layer 1 — 앱 전역 프리미티브 (atoms)
에디터 전용 아님. 프로토타입에서 **반복되는 것만** 추출(1회성 금지).

| 컴포넌트 | 프로토타입 근거 | 상태 |
|---|---|---|
| Button / IconButton | `btn` `btn-ghost` `icon-btn` | ✅ 재사용 |
| Avatar | — | ✅ |
| **Badge** | `status` `method`(GET/POST) `pk` `usetag` | 신규 (variant: status·method·pk) |
| **Tag / Chip** | `tag` `tagc` `refchip` | 신규 |
| **Select (pill)** | `pill-select` `opt` | 신규 |
| **Popover / Tooltip** | `er-tip`(DB 역할 설명) `floatpanel` | 신규 |

---

## Layer 2 — 에디터 셸 (레이아웃)
`file-structure.md` 따라 오케스트레이터 + 영역 분리. 빈 프레임 먼저(콘텐츠 placeholder).
- `TopBar`(프로젝트 메뉴·공유·내보내기)
- `LeftRail` — 파일트리 ⇄ AI챗 토글 + 작업 스코프 칩
- `CenterView` — 뷰 헤더/탭(`view-head`·`view-title`) + 본문 슬롯
- `RightPanel` — 인스펙터 컨테이너(`insp-sec`)
- 플로우/ER 캔버스 = **flow-view-pattern.md 그대로**(라이브러리 X, SVG+absolute).

---

## Layer 3 — 도메인 컴포넌트 (뷰별, Layer 0~2 위에 조립)
프로토타입 중앙 5뷰: ① 문서 ② 기능명세서 ③ 유저플로우 ④ 와이어프레임 ⑤ 데이터(ER + 테이블).
- 데이터 뷰: ER 노드 + 테이블 카드 + 역할 팝오버(`db-learning-feature` 규칙: 사실/추론 분리, AI 추정 배지) — **일부 구현됨.**
- 기능명세 디렉토리/트리/도큐먼트(`mrow`·`prow`·`di-map`)
- 와이어프레임 카드(`wf-card`) — 기존 BlockRenderer 재사용
- Recent Activity(`rec-item`) — BE 있음

**⚠️ 스코프 컷:** "내보내기(export) 모달" = Developer Mode → v1 제외(assembler-v1-scope). DS·셸까지만, 기능 보류. 5뷰 한 번에 금지 — **첫 뷰 하나 수직 완성.**

---

## 실행 순서
1. Layer 0 (토큰) — 먼저.
2. Layer 1 (Badge·Tag·Select·Popover) — 독립, 병렬 가능.
3. Layer 2 (빈 3-pane 셸).
4. Layer 3 — 첫 뷰 하나만 끝까지.
5. 채택 후 `/design-sync`로 claude.ai/design에 컴포넌트 단위 push(빅뱅 금지, 매번 승인).
