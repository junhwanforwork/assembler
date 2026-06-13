---
paths:
  - "src/**/*.{ts,tsx}"
---

# Design Tokens — howcloud

모든 색·간격·radius·shadow는 토큰으로만 쓴다. 예외 없음.

## Origin

이전 라운드에 `style={{ color: '#fff', background: 'rgba(0,0,0,0.2)' }}` 같은 인라인 하드코딩이 9곳에 누적되면서, 다크 톤을 한 번 바꿀 때마다 토큰 1곳 + 컴포넌트 9곳을 같이 손봐야 하는 사고가 났음. 토큰 import를 강제하면 `globals.css` 한 곳만 수정해도 화면 전체가 따라온다.

**제거 조건:** 토큰 외 하드코딩 hex가 30일간 git log에 0건이면 검토.

## 색 하드코딩 절대 금지

```tsx
// ❌
style={{ color: "#fff", backgroundColor: "rgba(0,0,0,0.2)" }}

// ✅
import { COLOR } from "@/lib/design-tokens"
style={{ color: COLOR.TEXT_INVERSE, backgroundColor: COLOR.OVERLAY_DARK }}

// ✅ (CSS 변수 직접 참조도 OK — howcloud의 일관된 패턴)
style={{ color: "var(--text-primary)", background: "var(--bg-card)" }}
```

**예외:** `products.brand_color` 같은 콘텐츠 색(사용자가 입력한 hex)은 토큰 아님 — 그대로 사용 가능.

## 색 토큰 — howcloud 다크(중성)

`globals.css` `:root` 가 authoritative. `src/lib/design-tokens.ts`는 TS mirror.

> ⚠️ **TS 코드에서 토큰명 정본은 `design-tokens.ts`의 실제 export다** — 아래 색 표는 lag 가능
> (예: `BG_ELEVATED`·`BORDER_SUBTLE`는 코드에 없음 → `BG_SECTION`·`BORDER_DEFAULT` 사용).
> 쓰기 전 `grep -oE "(BG_|BORDER_)[A-Z_]+:" src/lib/design-tokens.ts` 로 키 확인.

### Background (5단계 위계)

| 토큰 | CSS var | 값 | 용도 |
|------|---------|----|----|
| `COLOR.BG_BASE` | `--bg-base` | `#181818` | 페이지 최외곽 |
| `COLOR.BG_SURFACE` | `--bg-surface` | `#1e1e1e` | 메인 작업 영역, 사이드바 |
| `COLOR.BG_CARD` | `--bg-card` | `#2c2c2c` | 카드·input·dropdown 트리거 |
| `COLOR.BG_ELEVATED` | `--bg-elevated` | `#353535` | hover·dropdown 메뉴·상태 칩 |
| `COLOR.BG_PANEL` | `--bg-panel` | `#1e1e1e` | 패널 (surface와 같은 톤) |
| `COLOR.BG_OVERLAY` | `--bg-overlay` | `rgba(0,0,0,0.65)` | 모달 백드롭 |

### Text (위계 5단계 + inverse)

| 토큰 | CSS var | 값 | 의미 |
|------|---------|----|----|
| `COLOR.TEXT_PRIMARY` | `--text-primary` | `#ffffff` | 본문, 헤딩, 주요 콘텐츠 |
| `COLOR.TEXT_LABEL` | `--text-label` | `#d4d4d4` | 폼 라벨, 강조 보조 |
| `COLOR.TEXT_SECONDARY` | `--text-secondary` | `#b3b3b3` | 부가 설명, 칩 텍스트 |
| `COLOR.TEXT_MUTED` | `--text-muted` | `#7a7a7a` | 메타·placeholder·번호 |
| `COLOR.TEXT_DISABLED` | `--text-disabled` | `#4a4a4a` | 비활성 |
| `COLOR.TEXT_INVERSE` | `--text-inverse` | `#ffffff` | 브랜드 색 위 글자, accent 위 글자 |

### Border (3단계 + 입력 전용)

| 토큰 | CSS var | 값 | 용도 |
|------|---------|----|----|
| `COLOR.BORDER_SUBTLE` | `--border-subtle` | `rgba(255,255,255,0.04)` | 행 구분선, 카드 미세 윤곽 |
| `COLOR.BORDER_DEFAULT` | `--border-default` | `rgba(255,255,255,0.08)` | 일반 카드·input 기본 |
| `COLOR.BORDER_STRONG` | `--border-strong` | `rgba(255,255,255,0.18)` | 강조 윤곽, 모달 |

### Accent — 쿨 블루 (인터랙티브)

| 토큰 | CSS var | 값 | 의미 |
|------|---------|----|----|
| `COLOR.ACCENT` | `--accent` | `#4d94ff` | solid 버튼·focus ring·필수 마커·탭 active |
| `COLOR.ACCENT_HOVER` | `--accent-hover` | `#6ba6ff` | solid 버튼 hover |
| `COLOR.ACCENT_LIGHT` | `--accent-light` | `rgba(77,148,255,0.18)` | 연한 강조 배경 |
| `COLOR.ACCENT_BG` | `--accent-bg` | `rgba(77,148,255,0.06)` | 매우 연한 강조 배경 |

**금지:** ACCENT를 단순 장식·반복 강조에 쓰지 말 것. 인터랙티브하거나 "현재 선택됨" 상태에만.

### Status (의미가 색에 묶여 있음)

| 토큰 | 값 | 의미 | 금지 |
|------|----|----|----|
| `COLOR.POSITIVE` / `--positive` | `#4ade80` | 성공·NEW·완료 | 단순 강조 |
| `COLOR.NEGATIVE` / `--negative` | `#f87171` | 오류·삭제·위험 | 일반 빨강 강조 |
| `COLOR.WARNING` / `--warning` | `#fbbf24` | 주의·만료 예정 | 에러 대체 |

색만으로 의미 전달 금지 — 항상 텍스트 또는 아이콘과 병행.

### Overlay

| 토큰 | CSS var | 값 | 용도 |
|------|---------|----|----|
| `COLOR.OVERLAY_DARK` | `--overlay-dark-alpha` | `rgba(0,0,0,0.25)` | 브랜드 색 위 이니셜 백 등 dark veil |

## Radius

| 토큰 | 값 | 용도 |
|------|----|----|
| `RADIUS.XS` | `4px` | 미세 (skeleton block) |
| `RADIUS.SM` | `8px` | 칩 내부, 로고 박스 |
| `RADIUS.MD` | `12px` | 버튼·input·일반 카드 |
| `RADIUS.LG` | `14px` | 큰 카드·모달 |
| `RADIUS.XL` | `20px` | 대형 패널 |
| `RADIUS.PILL` | `100px` | 상태 칩 (pill 형태) |

## Shadow (Elevation)

| 토큰 | 용도 |
|------|------|
| `SHADOW.CARD` | 일반 카드 |
| `SHADOW.CARD_HOVER` | hover 상태 (border 변경 대신) |
| `SHADOW.DROPDOWN` | 드롭다운·툴팁 |
| `SHADOW.MODAL` | 모달 |
| `SHADOW.AMBIENT` | 토스트·플로팅 |

같은 레이어에 두 가지 shadow 공존 금지.

## Interaction (Toss 원칙)

**border 변경으로 hover 표현 금지.** 배경색 전환 또는 scale 사용.

```tsx
// ✅ 배경색 전환
style={{
  backgroundColor: hovered ? INTERACTION.HOVER_BG : COLOR.BG_BASE,
  transition: INTERACTION.TRANSITION_BG,
}}

// ❌ border-color로 hover 표현
style={{ border: `1px solid ${hovered ? COLOR.BORDER_STRONG : COLOR.BORDER_DEFAULT}` }}
```

| 토큰 | 값 | 용도 |
|------|----|----|
| `INTERACTION.HOVER_BG` | `rgba(255,255,255,0.04)` | 행·아이템 hover (base 위) |
| `INTERACTION.HOVER_BG_SURFACE` | `rgba(255,255,255,0.06)` | surface 위 hover |
| `INTERACTION.ACTIVE_BG` | `rgba(255,255,255,0.08)` | press·active |
| `INTERACTION.TRANSITION_BG` | `150ms cubic-bezier(0.4,0,0.2,1)` | 배경색 전환 |

## Duration / Ease

| 토큰 | 값 | 용도 |
|------|----|----|
| `DURATION.PRESS` | `80ms` | 버튼 press (즉각 피드백) |
| `DURATION.FAST` | `120ms` | 입력 focus/border 전환 |
| `DURATION.BASE` | `200ms` | 일반 색·opacity 전환 |
| `DURATION.SLOW` | `320ms` | 모달 진입 |
| `EASE.DEFAULT` | `cubic-bezier(0.4,0,0.2,1)` | 거의 모든 전환 |

500ms 이상 transition 금지. scroll-triggered animation 금지.

## Weight 결정 트리

```
화면의 단 하나 최상위 숫자·히어로인가?
  → 700 (BOLD)

구조를 만드는 레이블인가? (안 읽어도 섹션이 구분돼야 함)
  → 600 (SEMIBOLD)

배경(색)이 있는 UI 컨트롤인가?
  → 500 (MEDIUM) — 버튼·뱃지·탭 라벨

위 모두 아니면 → 400 (REGULAR) — 본문·입력값·메타
```

추가 제약:
- 한 화면에 700 요소 3개 이상이면 1~2개로 줄임
- 11px 이하에서 700 금지 (가독성 손상)

## 버튼 텍스트 — "~하기"

모든 액션 버튼은 **"동사 + 하기"** 형태. 예외: 다이얼로그 닫기 버튼 "닫기".

```
✅ 저장하기·공유하기·구현 추가하기·바꾸기·로그인하기·퍼블리시하기
❌ 저장·공유·OK·Submit
```

자세한 variant/size/페어링 규칙은 `button.md` 참조.

## 검증

코드 작성 후 즉시 확인:

```bash
# 토큰 외 하드코딩 hex 0건이어야 함 (brand_color placeholder 등 콘텐츠 제외)
grep -rn "#[0-9a-fA-F]\{3,6\}" src/ --include="*.tsx" \
  | grep -v design-tokens.ts | grep -v globals.css \
  | grep -v "brand_color\|#00704A\|RRGGBB"
```
