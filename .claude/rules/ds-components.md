---
paths:
  - "src/components/ui/**"
  - "src/components/impl/**"
  - "src/components/admin/**"
---

# UI Components — howcloud

`src/components/ui/` 의 공용 컴포넌트와 도메인 컴포넌트 규칙. 새 컴포넌트 만들기 전 이 파일에서 비슷한 게 있는지 먼저 확인한다.

## 공용 컴포넌트 (`src/components/ui/`)

### Button (`Button.tsx`)

```tsx
import { Button } from "@/components/ui"

<Button variant="solid" size="md" loading={saving} onClick={handleSubmit}>
  저장하기
</Button>
```

| Variant | 용도 | 한 화면 최대 | 금지 |
|--------|------|-----------|------|
| `solid` | 화면 최상위 단일 CTA (구현 추가하기·바꾸기·퍼블리시하기) | **1개** | 섹션 반복 |
| `primary` | 기본 확인·저장 | 2–3개 | 위험 액션 |
| `neutral` | 닫기·취소·뒤로가기 | 제한 없음 | 단독 메인 CTA |
| `danger` | 삭제·초기화 (되돌릴 수 없음) | **1개** | 확인 모달 없이 단독 |
| `ghost` | 카드 내 인라인 | 제한 없음 | 페이지 수준 CTA |

| Size | 높이 | 용도 |
|------|------|------|
| `lg` | 48px | 페이지 메인 CTA, 모바일 하단 고정 |
| `md` | 40px | 폼·모달 기본 |
| `sm` | 32px | 테이블 행·인라인 (모바일 단독 사용 금지) |

표준 페어링: `solid + neutral` (CTA + 닫기), `danger + neutral` (삭제 확인 모달).

자세한 텍스트 규칙은 `button.md` 참조.

### Input / TextArea (`TextField.tsx`)

label·hint·error 통합 컨테이너.

```tsx
import { Input, TextArea } from "@/components/ui"

<Input
  label="이름"
  required
  hint="2-20자"
  error={errors.name}
  value={form.name}
  onChange={(e) => set("name", e.target.value)}
/>

<TextArea
  label="features (JSON)"
  hint="배열 형식"
  monospace          // 코드/JSON 입력 시
  value={form.features}
  onChange={(e) => set("features", e.target.value)}
  style={{ minHeight: 180 }}
/>
```

- focus 시 자동으로 accent 보더 + 글로우 ring (INPUT 토큰)
- `error` prop 주면 빨강 보더 + 메시지 (색상만으로 에러 표현 금지)

### Select (`Select.tsx`)

**커스텀 드롭다운 — native `<select>` 금지** (OS 룩 통일을 위해).

```tsx
import { Select, type SelectOption } from "@/components/ui"

const options: SelectOption[] = [
  { value: "", label: "선택 안 함" },
  { value: "cafe", label: "☕ 카페" },
]

<Select
  label="업종"
  value={form.industry_id}
  onChange={(v) => set("industry_id", v)}
  options={options}
  size="md"  // 폼: md (40px) / 헤더 인라인: sm (32px)
/>
```

- 키보드: Enter/Space 열기, Esc 닫기, ↑↓ 이동, Enter 선택
- 라벨 없는 인라인 사용 시 `aria-label` 필수
- 메뉴 최대 높이 280px 기본 (옵션 많을 때 스크롤)

### Modal (`Modal.tsx`)

```tsx
import { Modal, Button } from "@/components/ui"

<Modal
  open={!!conflict}
  onClose={() => !loading && setConflict(null)}
  dismissible={!loading}
  title="이미 비슷한 기능이 있어요"
  description="‘예약’ 기능은 이미 저장했어요. 새로 고른 걸로 바꿀까요?"
  footer={
    <>
      <Button variant="neutral" disabled={loading} onClick={onClose}>닫기</Button>
      <Button variant="solid" loading={loading} onClick={handleSwap}>바꾸기</Button>
    </>
  }
/>
```

- `dismissible={false}` 면 저장 중 Esc/오버레이로 닫히지 않음
- body 스크롤 자동 잠금
- 푸터 페어링: `neutral + solid/danger` (왼쪽 닫기, 오른쪽 액션)

## 도메인 컴포넌트

### `impl/FeatureSpec*` — 기능 명세 표

`/impl/[id]` 헤더 아래 별도 섹션.

| 컴포넌트 | 용도 |
|---------|------|
| `FeatureSpecSection` | wrapper (제목 + 데스크탑/모바일 분기 + 빈 상태/로딩) |
| `FeatureSpecTable` | 데스크탑 4열 `<table>` (≥768px) |
| `FeatureSpecCardList` | 모바일 카드 리스트 (<768px, `role="list"`) |
| `FeatureSpecStateChip` | 상태 칩 단위 — soft elevation + 내부 dot |

**규칙:**
- 상태 칩은 **색상 강조 X** (success/error 의미적 색 금지) — 내부 dot은 칩끼리 시각 구분용
- 데스크탑 thead는 sticky (긴 표 스크롤 시 헤더 유지)
- 행 hover는 `INTERACTION.HOVER_BG` 배경 전환만 (transform/shadow X)
- 빈 배열 → "아직 등록된 기능이 없어요" 카드

### `impl/SaveButton` — 워크스페이스 저장

- 저장됨/미저장 토글
- 같은 `feature_type` 다른 구현이 이미 저장돼 있으면 `Modal` 충돌 경고 ("이미 비슷한 기능이 있어요")
- 저장 후 항상 `/api/saved` 재요청해 store 권위 유지

### `admin/ImplForm` · `admin/ProductForm`

- 모든 입력은 `Input`/`TextArea`/`Select` 사용 — raw `<input>/<select>` 금지
- JSON 필드(`features`·`feature_areas`·`setup_guide`)는 `<TextArea monospace />` + 클라이언트 JSON.parse 사전 검증
- 서버 검증: 배열 타입 가드 → 400 `invalid_features` 등 snake_case 에러

## Elevation (Shadow) 매트릭스

| 레이어 | 토큰 | 컴포넌트 |
|--------|------|----------|
| 카드 기본 | `SHADOW.CARD` | feed/Card, workspace/SavedItemCard |
| 카드 hover | `SHADOW.CARD_HOVER` | hover 상태만 |
| 드롭다운 | `SHADOW.DROPDOWN` | Select 메뉴 |
| 모달 | `SHADOW.MODAL` | Modal |
| 토스트·플로팅 | `SHADOW.AMBIENT` | SaveButton 토스트, ShareButton 토스트 |

같은 레이어에 두 가지 shadow 공존 금지.

## 모션

| 상황 | Duration |
|------|----------|
| 버튼 press | `DURATION.PRESS` (80ms) |
| 입력 focus | `DURATION.FAST` (120ms) |
| hover 색 전환 | `DURATION.BASE` (200ms) |
| 모달 진입 | `DURATION.SLOW` (320ms) |
| 토스트 | 150ms ease-out |

500ms 이상 transition 금지.

## 신규 컴포넌트 만들기 전 체크리스트

- [ ] `ui/`에 이미 비슷한 게 있나? (Button·Input·Select·Modal로 조립 가능한가)
- [ ] 색·radius·shadow를 토큰으로만 썼나? (`COLOR.*`, `RADIUS.*`, `SHADOW.*`)
- [ ] 350줄 한도 안인가? 넘으면 sub-component로 쪼개기
- [ ] aria-*·role·키보드 접근 처리했나?

## 참조

- 토큰 의미·값: `ds-tokens.md`
- 버튼 텍스트·variant: `button.md`
- impl 페이지 구조: `impl-components.md`
- 피드 카드: `feed-components.md`
