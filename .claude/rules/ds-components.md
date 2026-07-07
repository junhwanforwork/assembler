---
paths:
  - "src/components/**"
---

# UI Components — assembler

`src/components/ui/` 공용 컴포넌트 규칙 (2026-07-07 현행화 — 리셋 전 옛 표 제거).
새 컴포넌트 만들기 전 여기서 비슷한 게 있는지 먼저 확인한다. import는 배럴 없이 직접 경로(`@/components/ui/Badge`).

## 인벤토리 (`src/components/ui/`)

| 컴포넌트 | 역할 |
|---|---|
| `Button` / `IconButton` | filled(주요 액션)·ghost(보조)·icon(`label`→`aria-label` 필수) — 상세 `button.md` |
| `Badge` | 읽기 전용 표식 — variant(status=dot pill·method=HTTP 모노·tag=초소형·pill=범용) × tone(brand/positive/warning/negative/neutral) |
| `Chip` | 참조 칩 — 클릭=대상 객체로 이동(marker 라벨). 읽기 전용 표식은 Badge |
| `Select` | 커스텀 pill 드롭다운 — native `<select>` 금지, 인라인 사용 시 `aria-label` 필수 |
| `Segmented` | 세그먼트 컨트롤(`role="group"`) — SegmentedButton(상호작용)·SegmentedLabel(정적) 조합 |
| `Modal` | 포털·백드롭·Esc·포커스 트랩·z 토큰 — 마운트=열림(부모 조건부 렌더), 클라이언트 전용 |
| `Popover` / `Tooltip` | 플로팅 서피스 — 위치 계산은 `floating.ts`(뷰포트 클램프·플립) 공유 |
| `Avatar` | 사용자 이니셜/이미지 |
| `icons` | 공용 아이콘 — stroke는 `ICON_STROKE` 단일값(임의 굵기 금지) |

### 신설 3종 (10차 디자인 패턴층 — design-system-plan.md Layer 1.5)

| 컴포넌트 | 역할 한 줄 |
|---|---|
| `OverlayPanel` (P-B) | 비차단 참조 창 — 포털·백드롭·Esc·포커스 트랩·slide-in, side/window 변형 |
| `InsightCard` (P-C) | 구조화 해석 카드 — 제목·AI 추정 배지·요약 + 좋은 점(positive)/주의할 점(negative) 불릿 |
| `FloatBar` (P-D) | 플로팅 칩 바 — bottom-center/bottom-full 도킹, 칩 문법=라벨·수치 칩(`FloatBarCount`, Badge tone)·상태 dot(Badge status) |

### motion 3종 (`ui/motion/`)

- `AssemblyLoader` — 생성·로딩 조립 루프. 의미는 label 텍스트가 전달(reduced-motion에서도 유지).
- `BrandSpark` — pulse(생성 중)·spin-in(등장). 기본 정적.
- `EmptyStateArt` — 빈 상태 장식(aria-hidden). 의미는 곁의 카피가 전달.

## 규칙

- **Elevation** = `ds-tokens.md` 그림자 4단(raised/panel/pop/overlay) — 같은 레이어에 두 그림자 공존 금지, 임의 box-shadow 금지.
- **모션**: 500ms 이상 transition 금지 · `prefers-reduced-motion` 존중 · 의미는 모션이 아니라 텍스트가 전달.
- **다이얼로그 페어링**: 왼쪽 닫기(ghost) + 오른쪽 액션(filled/위험) — 카피는 `button.md`·`ux-writing.md`.

## 신규 컴포넌트 만들기 전 체크리스트

- [ ] 위 인벤토리로 조립 가능한가? (신설은 반복 2회+ 확인 후)
- [ ] 색·radius·그림자를 토큰으로만 썼나? (`ds-tokens.md`)
- [ ] 단일 책임인가? (`file-structure.md`)
- [ ] aria-*·role·키보드 접근을 처리했나?

## 참조

- 토큰 의미·elevation: `ds-tokens.md` · 버튼 텍스트·variant: `button.md` · 패턴층 이력: `docs/specs/design-system-plan.md`
