---
paths:
  - "src/**/*.{ts,tsx}"
  - "src/**/*.module.css"
---

# Design Tokens — assembler

모든 색·간격·radius는 토큰으로만. 정본 = `src/app/globals.css`의 CSS 변수, TS 미러 = `src/lib/design-tokens.ts`(1:1).
2026-06 리셋 후 새 방향: **중성 블랙 + 블루 브랜드, 다크 우선.** (옛 POI 네이비/테라코타 폐기.)

## 원칙
- **하드코딩 hex 금지.** 토큰(`var(--x)` 또는 `COLOR.X`)만. 인라인 hex는 globals.css/design-tokens.ts에서만.
- **그라데이션 금지** — 깊이감은 명도 차이·보더·그림자로. (단색만.)
- **브랜드(블루)는 절제** — filled 버튼 + 인터랙션(hover/active/focus/선택)에만. 장식적 반복 강조 금지.
- 컴포넌트 :hover는 CSS Module로(토큰 참조), 색 하드코딩 금지.

## 색 (다크)
| 토큰 | CSS var | 값 | 용도 |
|------|---------|----|----|
| `COLOR.BG_BASE` | `--bg-base` | `#1e1e1e` | 페이지 최외곽 |
| `COLOR.BG_CARD` | `--bg-card` | `#2b2b2b` | 카드·입력 |
| `COLOR.BG_ELEVATED` | `--bg-elevated` | `#333333` | hover·떠있는 표면 |
| `COLOR.BG_OVERLAY` | `--bg-overlay` | `rgba(0,0,0,.6)` | 모달 백드롭 |
| `COLOR.TEXT_PRIMARY` | `--text-primary` | `#f4f4f4` | 본문·헤딩 |
| `COLOR.TEXT_SECONDARY` | `--text-secondary` | `#b0b0b0` | 보조 |
| `COLOR.TEXT_MUTED` | `--text-muted` | `#7a7a7a` | 메타·placeholder |
| `COLOR.TEXT_INVERSE` | `--text-inverse` | `#ffffff` | 브랜드 위 글자 |
| `COLOR.BORDER` | `--border` | `rgba(255,255,255,.08)` | 일반 보더 |
| `COLOR.BORDER_STRONG` | `--border-strong` | `rgba(255,255,255,.20)` | 강조·선택·모달 |
| `COLOR.BRAND` | `--brand` | `#4d94ff` | filled·focus·선택 |
| `COLOR.BRAND_HOVER` | `--brand-hover` | `#6ba6ff` | filled hover |
| `COLOR.BRAND_SOFT` | `--brand-soft` | `rgba(77,148,255,.14)` | 연한 강조 배경 |
| `COLOR.POSITIVE/NEGATIVE/WARNING` | `--positive/--negative/--warning` | `#4ade80`/`#f87171`/`#fbbf24` | 성공/오류/주의(텍스트·아이콘 병행) |

## Radius / Spacing / Typography
- `RADIUS`: SM 8 · CONTROL 10 · CARD 16 · LG 18 · PILL 999.
- `SPACING`: 8px 그리드(XS4 SM8 MD12 LG16 XL24 XXL32).
- `TYPOGRAPHY`: 크기 HERO 26 · SECTION 17 · TITLE 15 · BODY 14.5 · INPUT 15.5 · LABEL 13 · META 12. 무게 400/500/600/700. 폰트 Poppins(라틴)+Wanted Sans(한글).

## 버튼 (`button.md` 참조)
- **filled** = 화면 주요 액션(브랜드 블루 + `TEXT_INVERSE`). hover=`BRAND_HOVER`.
- **ghost** = 보조(투명+`BORDER`+`TEXT_SECONDARY`). hover 시에만 브랜드(보더·텍스트).
- **icon** = 아이콘 전용 ghost(`aria-label` 필수).
- 아이콘은 `currentColor` 상속 → 버튼 색을 따라가 hover 자동 브랜드 전환.

## 검증
```bash
# 토큰 외 하드코딩 hex 0건(globals.css·design-tokens.ts 제외)
grep -rn "#[0-9a-fA-F]\{3,6\}" src/ --include="*.tsx" --include="*.module.css" \
  | grep -v design-tokens.ts | grep -v globals.css
```
