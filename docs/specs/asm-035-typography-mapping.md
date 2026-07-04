# ASM-035 · 타이포그래피 하드코딩 → 토큰 매핑 표

> 목적: font-size 하드코딩 156건(CSS) + 2건(TSX 인라인)을 토큰으로 치환하기 전,
> 실측 px → 토큰 매핑과 근거를 고정한다. **±1px 이내 스냅만 치환**, 초과는 보류(통합 때 시각 판단).
> 토큰 정본 = `src/app/globals.css` CSS 변수, TS 미러 = `src/lib/design-tokens.ts` TYPOGRAPHY.

## 실측 분포 (2026-07-05, grep 기준)

| px | 건수 | px | 건수 |
|---|---|---|---|
| 12.5 | 35 | 14 | 6 |
| 13 | 25 | 10.5 | 5 |
| 11 | 17 | 17 | 4 |
| 12 | 16 | 14.5 | 4 |
| 13.5 | 14 | 10 | 3 |
| 11.5 | 13 | 9.5 · 19 | 각 2 |
| 15 · 14 | 각 6 | 8.5 · 26 · 20 · 15.5 | 각 1 |

- TSX 인라인 2건: `Avatar.tsx:14`(13) · `DataView.tsx:24`(12).
- ⚠ 일부 건은 **죽은 CSS 블록**(editor.module.css 346–520 챗 잔재 · 199–231 leftSwitch/seg) 안에 있어
  치환이 아니라 **삭제**로 소멸한다(.seg·.recT·.chip 12.5 / .qaQ·.qaA·.aiLine 13 / .useTag 10 / .modelChip 11.5 등).

## 매핑 규칙

1. **최근접 토큰 스냅, ±1px 이내만.** 동률(±0.5 양쪽)은 용처 의미로 판정하고 아래에 근거를 남긴다.
2. 초과 항목은 치환하지 않고 **보류 목록**으로 보고 — 시각 판단은 통합 때 사용자.
3. 스케일에 없는 단은 신설을 제안한다 (아래 `caption`).

## 매핑 표

| 실측 px | 토큰 | 변수 | Δ(시각) | 근거 |
|---|---|---|---|---|
| 26 | HERO | `--font-size-hero` | 0 | 정확 일치 |
| 17 | SECTION | `--font-size-section` | 0 | 정확 일치 |
| 15.5 | INPUT | `--font-size-input` | 0 | 정확 일치 |
| 15 | TITLE | `--font-size-title` | 0 | 정확 일치 |
| 14.5 | BODY | `--font-size-body` | 0 | 정확 일치 |
| 14 | BODY | `--font-size-body` | +0.5 | 최근접 body(Δ0.5) < title(Δ1) |
| 13.5 | LABEL | `--font-size-label` | −0.5 | 최근접 label(Δ0.5) < body(Δ1) |
| 13 | LABEL | `--font-size-label` | 0 | 정확 일치 |
| **12.5** | **LABEL** | `--font-size-label` | **+0.5** | **동률 판정**(label Δ0.5 = meta Δ0.5). 용처 다수가 컨트롤·라벨 텍스트(.seg류·chip·ftab·pillSelect·Select trigger/option·tbl·SpecBulkBar action) → 의미상 LABEL. meta(12) 수렴 시 뮤트 힌트(12px 기존군)와 위계 붕괴 + "컨트롤 텍스트=meta" 오염. 소수 힌트류(composerHint·inspEmpty 등)도 +0.5 이동하지만 색(muted)으로 위계 유지. ⚠ 최대 버킷(35건) — 통합 때 시각 확인 1순위 |
| 12 | META | `--font-size-meta` | 0 | 정확 일치 |
| 11.5 | CAPTION(신설) | `--font-size-caption` | −0.5 | 아래 신설 근거 |
| 11 | CAPTION(신설) | `--font-size-caption` | 0 | 정확 일치 |
| 10.5 | CAPTION(신설) | `--font-size-caption` | +0.5 | |
| TSX `Avatar.tsx:14` 13 | LABEL | (인라인 style var) | 0 | |
| TSX `DataView.tsx:24` 12 | META | (인라인 style var) | 0 | |

### caption 신설 근거

meta(12) 미만 실사용이 41건(11.5×13 · 11×17 · 10.5×5 · 10×3 · 9.5×2 · 8.5×1)인데 스케일에 단이 없다.
최빈값 **11px**을 `--font-size-caption`으로 신설(트리 공통 메타 `.tcommon`, 배지·캡션급).
11.5/10.5는 ±0.5 스냅. 스케일: hero 26 · section 17 · input 15.5 · title 15 · body 14.5 · label 13 · meta 12 · **caption 11**.

## 보류 목록 (치환 금지 — 통합 때 시각 판단, 8건)

| 파일:행 | 셀렉터 | 실측 | 최근접 토큰 | 보류 사유 |
|---|---|---|---|---|
| `editor.module.css:848` | `.detailTitle` | 20 | section 17 (Δ3) | 스케일 갭(hero 26↔section 17 사이) |
| `editor.module.css:946` | `.specdoc h2` | 19 | section 17 (Δ2) | 〃 |
| `dashboard.module.css:23` | `.logoWord` | 19 | section 17 (Δ2) | 로고 워드마크 — 스케일 대상 아닐 수도 |
| `editor.module.css:1774` | `.impactChip b, .impactChipStatic b` (공유 선언) | 10 | caption 11 (Δ1) | 10px대는 1px=10% 확대 — 시각 판단 필요 |
| `Badge.module.css:32` | `.pill` | 10 | caption 11 (Δ1) | 〃 |
| `editor.module.css:1127` | `.erHname` | 9.5 | caption 11 (Δ1.5) | 초과 |
| `Chip.module.css:31` | `.marker` | 9.5 | caption 11 (Δ1.5) | 초과 |
| `Badge.module.css:26` | `.tag` | 8.5 | caption 11 (Δ2.5) | 초과 |

> 행 번호는 측정 시점(치환 전) 기준 — 죽은 블록 삭제로 시프트됨. 정본은 셀렉터 + `font-size grep` 결과 8건.
> Δ1 정확 경계인 10px 2건은 규칙상 치환 가능하지만, 극소 텍스트라 보수적으로 보류에 넣었다.
> 19~20px 3건은 hero↔section 갭 — 통합 때 단 신설(예: subtitle 19~20) 또는 개별 판단.

## font-weight 변수 (① 동반 신설)

`--font-weight-regular/medium/semibold/bold` = 400/500/600/700 (TYPOGRAPHY 미러 1:1).
CSS 내 `font-weight` 숫자 하드코딩 치환은 이번 범위 밖(티켓 원문에 없음) — TS 미러 var() 전환용.

## 스냅 외 의도 편차 (통합 때 시각 확인 — Segmented·④ 정리분)

| 항목 | 변화 | 근거 |
|---|---|---|
| DataView 세그(elevated) hover | 없음 → 브랜드색 (rseg·대시보드 탭과 동일) | 세그 1벌 통합 시 인터랙션 일관 — 구 floatTabs만 hover 규칙이 누락돼 있었음 |
| RightPanel 세그 gap | 2px → 4px | Segmented sm 공통 gap. 투명 버튼 사이 간격이라 체감 미미 |
| Composer 전송 스피너 | 16px → 15px | Button 프리미티브 스피너 공용화(±1px) |
| ER 노드 클릭 후 툴팁 | 클릭 즉시 닫힘 → 마우스 이탈 시 닫힘 | ui/Tooltip 표준 hover 소유권(RightPanel 코멘트와 동일 패턴) |
| ER 노드 툴팁 배치 | 노드 우측(y=노드 상단) → 노드 하단(좌측 정렬, 부족 시 위 플립) | ui/Tooltip 표준 배치 채택 — 대신 스크롤 추적 재배치·키보드 포커스 표시·뷰포트 클램프를 얻음. **통합 시각 승인 1순위** |

## 검증 기준 (회귀 게이트)

- 치환 후 `font-size: \d+(\.\d+)?px` grep 결과 = **보류 8건과 정확히 일치**.
- 하드코딩 hex 0 유지(ds-tokens.md grep).
- 시각 회귀 = ±0.5px 스냅 외 없음(스크린샷 첨부).
