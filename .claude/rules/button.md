---
paths:
  - "src/**/*.{ts,tsx}"
---

# Button Rules — assembler

`<Button>` 컴포넌트 사용 전 이 파일을 반드시 확인한다.
버튼이 아닌 네비게이션은 `<Link>` 사용. raw `<button>` + 인라인 style 금지 — `Button` 컴포넌트의 variant 사용.

> ⚠️ **현행(2026-06 리셋 후) variant = `filled` · `ghost` · `IconButton`** (`src/components/ui/Button.tsx`).
> - `filled` = 화면 주요 액션(브랜드 블루). 한 영역 1개 권장.
> - `ghost` = 그 외 모든 보조 버튼(중성 흑백, **hover/active 인터랙션 시에만** 브랜드).
> - `IconButton` = 아이콘 전용(`label` 필수 → `aria-label`).
> 아래 옛 표(solid/primary/neutral/danger)는 **카피·페어링·접근성 규칙만** 유효, **variant 이름은 위 3종으로 대체**.

---

## 1. Variant 선택 기준

| Variant   | 언제 사용                                                                | 한 화면 최대 | 절대 금지                 |
| --------- | ------------------------------------------------------------------------ | ------------ | ------------------------- |
| `solid`   | 화면 최상위 단일 CTA (구현 추가하기·바꾸기·퍼블리시하기·공유 링크 만들기) | **1개**      | 섹션 반복, 보조 액션      |
| `primary` | 확인·저장 (기본 긍정 액션)                                               | 2–3개        | 위험·삭제 액션            |
| `neutral` | 닫기·뒤로가기 (다이얼로그 왼쪽 페어링)                                   | 제한 없음    | 단독 메인 CTA             |
| `danger`  | 삭제·초기화 (되돌릴 수 없음)                                             | **1개**      | 확인 다이얼로그 없이 단독 |
| `ghost`   | 카드 내 인라인, 컨텍스트 메뉴                                            | 제한 없음    | 페이지 수준 CTA           |

### 판단 순서

```
이 화면에서 가장 중요한 단 하나의 액션인가?
  → YES → solid

되돌릴 수 없는 파괴적 액션인가?
  → YES → danger (반드시 확인 모달과 쌍으로)

취소·닫기·뒤로가기인가?
  → YES → neutral

카드/목록 내 인라인 액션인가?
  → YES → ghost

그 외 기본 긍정 액션 → primary
```

---

## 2. Size 선택 기준

| Size | 높이 | PaddingH | FontSize | Radius | 용도                                   | Touch target             |
| ---- | ---- | -------- | -------- | ------ | -------------------------------------- | ------------------------ |
| `lg` | 48px | 24px     | 16px     | 8px    | 페이지 메인 CTA, 모바일 하단 고정 버튼 | ✅ WCAG 2.5.5            |
| `md` | 40px | 16px     | 14px     | 8px    | 모달·폼 기본, 인라인 확인              | ⚠️ 터치 영역 보완 필요   |
| `sm` | 32px | 12px     | 14px     | 8px    | Builder 인라인, 테이블 행 액션         | ❌ 모바일 단독 사용 금지 |

- 주 사용자 플로우의 CTA는 항상 `lg`
- 모바일 단독 `sm` 금지 — `md` 이상 사용
- `full-width` 버튼: `className="w-full"` 추가

---

## 3. 표준 페어링 패턴

### 페이지 메인 CTA + 취소

```tsx
// ✅ 표준: solid + neutral
<Button variant="solid" size="lg">구현 추가하기</Button>
<Button variant="neutral" size="lg">닫기</Button>
```

### 모달 확인 + 닫기

```tsx
// ✅ primary/danger + neutral
<Button variant="neutral" size="md">닫기</Button>
<Button variant="danger" size="md">삭제하기</Button>
```

### 금지 패턴

```tsx
// ❌ solid 두 개
<Button variant="solid">저장하기</Button>
<Button variant="solid">공유하기</Button>

// ❌ 다이얼로그에 "취소" 텍스트
<Button variant="neutral">취소</Button>  // → "닫기"로

// ❌ danger 단독 (확인 없이)
<Button variant="danger" onClick={deleteDirectly}>삭제하기</Button>
```

---

## 4. 버튼 텍스트 규칙

### 기본: `동사 + 하기`

```
✅ 저장하기   삭제하기   공유하기   바꾸기   추가하기
   퍼블리시하기   둘러보기   다시 시도하기   로그인하기   확인하기
   구현 추가하기   상품 추가하기   공유 링크 만들기
```

### 예외

| 상황                  | 텍스트                | 이유                         |
| --------------------- | --------------------- | ---------------------------- |
| 다이얼로그 왼쪽(취소) | `닫기`                | "취소"는 작업 취소 오해 유발 |
| 단독 확인 버튼        | `확인`                | 단순 dismiss                 |
| 네비게이션 링크형     | `~보기`, `~으로 가기` | 이동 의미 명확히             |

### 금지 표현

```
❌ "발행"(명사 단독)  "삭제"(명사 단독)  "OK"  "Submit"  "Yes" / "No"
❌ "진행하기" (무엇을 진행하는지 불명확)
❌ "계속하기" (CTA가 뚜렷하지 않을 때)
```

---

## 5. 상태 처리

### Loading

```tsx
// ✅ 비동기 액션 중 반드시 loading 상태 표시
<Button variant="solid" loading={isSubmitting} onClick={handleSubmit}>
  구현 추가하기
</Button>
// children은 DOM에 유지 (레이아웃 시프트 방지) — Button 컴포넌트 내부 처리
```

### Disabled

```tsx
// ✅ 왜 비활성인지 사용자가 알 수 있는 경우에만
<Button disabled={!isValid}>제출하기</Button>
// + helper text: "제목을 입력해야 발행할 수 있어요"

// ❌ 이유 없는 disabled — 사용자가 뭘 해야 할지 모름
<Button disabled>저장하기</Button>
```

- `disabled` + `loading` 동시 가능 (저장 중 다른 액션 차단)
- `aria-busy={loading}` 자동 처리됨 (Button 컴포넌트 내부)

---

## 6. 접근성 필수 사항

```tsx
// 아이콘 전용 버튼 — aria-label 필수
<button aria-label="질문 삭제">
  <TrashIcon />
</button>

// 로딩 중 — aria-busy (Button 컴포넌트가 처리)
// disabled — disabled attr (Button 컴포넌트가 처리)

// 최소 터치 영역 44×44px — lg 사이즈 사용 or padding 보완
```

---

## 7. 아이콘 버튼

아이콘과 텍스트 조합 시 반드시 `leftIcon` / `rightIcon` prop을 사용한다.
`children` 안에 직접 SVG + 텍스트를 넣으면 gap이 적용되지 않는다.

```tsx
// ✅ leftIcon/rightIcon prop 사용
<Button leftIcon={<EyeIcon />}>미리보기</Button>
<Button rightIcon={<ArrowIcon />}>다음으로</Button>

// ❌ children 안에 직접 SVG 삽입 — gap 미적용
<Button><EyeIcon />미리보기</Button>
```

- icon gap: 8px (Figma 명세) — Button 컴포넌트 내부에서 자동 처리
- 아이콘 권장 size: 16×16px (sm/md), 18×18px (lg)
- `stroke="currentColor"` 사용 — 버튼 텍스트 색상 자동 상속
- 아이콘 전용 버튼(텍스트 없음) — `aria-label` 필수 (Button 컴포넌트 아닌 `<button>` 직접 사용)

---

## 9. 반드시 피해야 할 패턴

```tsx
// ❌ 인라인 style로 버튼 커스텀 — Button 컴포넌트 variants 사용
<button style={{ backgroundColor: "#3182f6" }}>...</button>

// ❌ div/span을 버튼으로 — 접근성 파괴
<div onClick={handleClick}>저장하기</div>

// ❌ solid를 여러 개
<Button variant="solid">저장</Button>
<Button variant="solid">발행</Button>

// ❌ danger without confirmation
onClick={() => deleteQuestion(id)}  // 확인 없이 바로 삭제

// ❌ 페이지 CTA에 sm 사이즈 (터치 영역 부족)
<Button variant="solid" size="sm">시작하기</Button>
```

---

## 10. 실제 사용 예시

### 어드민 구현 추가 폼 (제출 + 닫기)

```tsx
<Button variant="solid" size="md" type="submit" loading={saving}>
  구현 추가하기
</Button>
<Button variant="neutral" size="md" onClick={() => router.push("/admin")}>
  닫기
</Button>
```

### SaveButton — 충돌 모달 (바꾸기 + 닫기)

같은 `feature_type`의 다른 구현이 이미 저장돼 있을 때 띄우는 confirm 모달.

```tsx
<Modal
  open={!!conflict}
  title="이미 비슷한 기능이 있어요"
  footer={
    <>
      <Button variant="neutral" size="md" disabled={loading} onClick={onClose}>
        닫기
      </Button>
      <Button variant="solid" size="md" loading={loading} onClick={handleSwap}>
        바꾸기
      </Button>
    </>
  }
/>
```

### 빈 상태 CTA — 워크스페이스

```tsx
<Button variant="solid" size="lg" onClick={() => router.push("/")}>
  구현 둘러보기
</Button>
```
