---
paths:
  - "src/components/feed/**"
  - "src/components/layout/FeatureSidebar.tsx"
  - "src/components/layout/GNB.tsx"
  - "src/app/(main)/page.tsx"
  - "src/app/(main)/layout.tsx"
---

# 피드 & 레이아웃 컴포넌트 규칙

메인 피드(`/`) 페이지와 레이아웃 컴포넌트에 적용한다.

---

## ImplementationCard

**표시 데이터 (ImplWithProduct 타입 사용):**
```
impl.product.brand_color  → 카드 상단 배경색
impl.product.logo_url     → 로고 이미지 (없으면 이니셜)
impl.product.name         → 서비스명 (작게)
impl.headline             → 기능 설명 (굵게, 주요 텍스트)
impl.industry.icon        → 업종 이모지 칩
impl.device_type          → 기기 칩
impl.created_at           → 7일 이내면 NEW 배지
```

**brand_color 처리:**
- 있으면 카드 상단 bg에 적용 (linear-gradient로 살짝 변형 가능)
- 없으면 기본 dark bg (`#17171c`)
- 절대 하드코딩 hex 사용 금지 — brand_color 값 그대로 사용

**로고 표시:**
- logo_url 있으면 `<Image>` (next/image), rounded
- 없으면 name 첫 글자 이니셜 원형 (배경: brand_color 또는 기본)

**NEW 배지:**
```typescript
const isNew = differenceInDays(new Date(), new Date(impl.created_at)) < 7
```

**카드 클릭:** `href="/impl/${impl.id}"` — `<Link>` 사용

**금지:**
- 썸네일 스크린샷 사용 금지 (텍스트+로고로만)
- company_name 인라인 필드 참조 금지 (→ impl.product.name 사용)

---

## FeatureSidebar — 기능 필터 + 검색

**구조:**
```
[검색 input]          ← placeholder: "기능·서비스 검색"
────────────
기능
전체        · {total}
포인트 적립 · {count}
예약        · {count}
결제        · {count}
...
```

**검색 동작:**
- 입력 시 300ms 디바운스 → URL `?q=` 파라미터 업데이트
- 검색어는 headline, product.name, tags 대상 (서버 사이드 필터)
- 검색 중엔 기능 필터 카운트 업데이트

**기능 필터:**
- 클릭 시 URL `?feature_type=loyalty` 파라미터 업데이트
- 선택된 항목: 강조 스타일 (active 클래스)
- 카운트: 해당 기능 타입의 발행된 구현 수

**URL 파라미터 동기화:** `useFilters` 훅 사용, router.push 대신 router.replace

---

## FilterBar — 업종·기기 드롭다운

**표시 요소 (왼쪽→오른쪽):**
```
[업종▾ 전체]  [기기▾ 전체]  [최신순▾]  총 {N}개  [⊞ ≡]
```

**드롭다운 항목:**
- 업종: industries 테이블 전체 (icon + name)
- 기기: mobile_app / web / kiosk / tablet_pos / dashboard (고정)

**뷰 토글 (⊞ ≡):**
- ⊞ grid: 3열 카드 (기본)
- ≡ list: 가로형 카드 (프로덕트명 좌측, 타이틀+태그 우측)
- 상태: localStorage 저장

**URL 파라미터:**
- `?industry=cafe`
- `?device=mobile_app`
- 복수 필터 AND 조건

---

## GNB

**표시 요소:**
```
[HowCloud 로고]          [★ {N} 저장]
```

- 검색창은 GNB에 없음 — FeatureSidebar 상단에 있음
- 저장 배지: savedStore.items.length, 0이면 숨김
- 저장 배지 클릭 → `/workspace`

---

## 카드 그리드 레이아웃

```css
/* 데스크톱: 3열 */
grid-template-columns: repeat(3, 1fr)

/* 태블릿: 2열 */
@media (max-width: 1024px) { repeat(2, 1fr) }

/* 모바일: 1열 */
@media (max-width: 640px) { repeat(1, 1fr) }
```

**device_type별 카드 비율:**
| device_type | 카드 aspect-ratio |
|---|---|
| mobile_app | 3/4 |
| kiosk | 3/4 |
| web | 16/9 (grid-column: span 2) |
| tablet_pos | 16/9 (grid-column: span 2) |
| dashboard | 16/9 (grid-column: span 2) |

**빈 상태:**
- 필터 결과 없음: "아직 이 조건에 맞는 구현이 없어요. 다른 기능을 찾아볼까요?" + 필터 초기화 버튼
