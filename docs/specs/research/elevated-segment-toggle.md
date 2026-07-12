> 반영: 18차 (T1 — Segmented elevated active에 shadow-raised 보강, 입체 사다리 정합 / T2 컨테이너 알약·T3 구분선 = P8 정의 밖 "더 예쁘게" → 사용자 시각 반려 시에만)

# 레퍼런스 해석 — 다크 세그먼트 컨트롤 "떠 있는 알약" (모드 A)

> 입력: 사용자 제공 스크린샷 2026-07-12(일/주/월/년 세그, 선택 "월"이 밝은 알약으로 떠 있음). "이 UI 예쁘다."
> 대조 정본: `src/components/ui/Segmented.{tsx,module.css}` · `.claude/rules/ds-tokens.md`(입체 사다리) · `globals.css`

## Summary

레퍼런스의 **"떠 있는 알약"** 문법은 우리가 2026-07-11 확정한 **입체 사다리**의 `선택 = 살짝 뜸 = --bg-elevated + --shadow-raised` 행과 정확히 같은 개념인데, 우리 실물 `Segmented`의 `elevated` active는 `--bg-elevated`만 적용하고 **`--shadow-raised`를 빠뜨려** 확정 토큰 규칙과 불일치한다(기계적 정합 결함, `Segmented.module.css:45-49`). 컨테이너 서피스·세그 구분선은 우리에게 없는 요소지만 "더 예쁘게" 영역(P8 정의 밖)이라 별도 취급.

## 관찰
- 바깥에 하나의 알약(pill) 컨테이너가 4세그를 감싼다(페이지보다 약간 밝은 배경).
- 선택된 "월"만 더 밝은 회색 알약으로 컨테이너 위에 떠 있다(명도 상승 + 미세 그림자).
- 비선택 세그 사이 얇은 세로 구분선 1개. 선택 칩 양옆엔 구분선 없음.
- 선택=진한 글자, 비선택=옅은 글자. 컨테이너·칩 모두 pill 라운드.

## 차용 (실존 파일:라인)
- 실물 = `src/components/ui/Segmented.tsx` + `Segmented.module.css`. 소비처 = `views/DataView.tsx:41,61`·`views/DocView.tsx:73`(뷰 스위처).
- 현행 선택 표현 `Segmented.module.css:45-49` `.elevated .btn.active { background: var(--bg-elevated); color: var(--text-primary); border-color: var(--border); }` → **box-shadow 없음.** `.group`(:5-11)은 감싸는 서피스 없음(flex+gap만).
- 입체 사다리(ds-tokens.md, 2026-07-11): `선택=살짝 뜸=--bg-elevated + --shadow-raised`, "border 단독으로 뜸 금지·라운드≠입체". → active에 `box-shadow: var(--shadow-raised)` 추가 = 곧 확정 규칙 준수. 현행 `border-color: var(--border)`는 사다리가 금지한 "border로 뜸"에 가까워 재검토.
- 접근성: `SegmentedButton`(tsx:29-38) `aria-pressed`로 상태 시맨틱 노출 — 색·그림자 단독 아님(사다리 정합). 그대로 유지.

## 차별
- 레퍼런스 세그 = 콘텐츠(기간) 필터. 우리 elevated 세그 = 같은 구조를 다른 각도로 투사하는 **뷰 스위처**(구조가 원본, 뷰는 도구 — 북극성 "스펙은 한 곳" 정합). tone 3종(elevated/card/outline)은 맥락 보존 변형이라 단일 스타일 전면 복제 안 함.

## 출처
- 사용자 스크린샷 2026-07-12. 원 제품명 미표기 → 미확인(iOS/macOS 세그먼트와 유사하나 확인 불가).

## 제안 티켓
- **T1 — `elevated` active에 `--shadow-raised` 보강** (입체 사다리 정합). `Segmented.module.css:45-49`에 `box-shadow: var(--shadow-raised)` 추가 + `border-color` 재검토. **P8 · 디자인 ①(기계적 정합)** — 미학이 아니라 확정 규칙 미준수 수정. → **18차 편입(오케스트레이터 판정).**
- **T2 — `elevated` 컨테이너 알약 신설** (조건부). `.group .elevated` 배경(bg-card)+pill+패딩. T1 명도 2단 대비의 짝. **P8 정의 밖(더 예쁘게)** — T1 종속이거나 시각 반려 시에만.
- **T3 — 세그 구분선** (보류). 비선택 인접 세그 사이 세로선. **P8 밖** — 탈출조건 미기여 → 시각 반려 시에만.

> 우선순위: T1(규칙 정합·실질 결함) ≫ T2(T1 종속) ≫ T3(정의 밖).

## 미확인
- 정확 hex·radius px·그림자 세기·구분선 색/두께 = 스크린샷 측정 불가 → 우리 토큰 대체.
- 전환 애니메이션·hover/press·구분선 소멸 방식 = 스크린샷 밖.
- 사용자 "예쁘다"가 개선 요청(T2·T3 트리거)인지 단순 감상인지 = 오케스트레이터가 확인 필요.
- `card`/`outline` active도 다른 맥락서 사다리와 어긋날 소지 — 이 레퍼런스(elevated) 스코프 밖, 별도 진단 시 ui-ux-designer 몫.
