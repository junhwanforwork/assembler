---
paths:
  - "src/**/*.{ts,tsx}"
---

# File Structure Rules — assembler

## Origin

큰 파일이 한 번에 여러 책임(레이아웃·상태·핸들러·서브뷰)을 떠안으면 한 줄 수정에도 리스크가 누적된다.
헤더·패널·모달·캔버스를 분리하고 오케스트레이터 컴포넌트는 ~300줄 이하로 유지하는 게 기본 원칙.
FlowView.tsx(2,938줄) → FlowView 478줄 + FlowViewEdge / NodeCard / Canvas / Toolbar / SectionLabel / Types 분리 완료.

---

## 1. 파일 크기 한도

| 구분                    | 한도      | 초과 시 대응       |
| ----------------------- | --------- | ------------------ |
| 컴포넌트 파일 (`*.tsx`) | **350줄** | 즉시 분리          |
| 훅 파일 (`use*.ts`)     | **150줄** | 즉시 분리          |
| API 라우트 (`route.ts`) | **250줄** | 즉시 분리          |
| 타입 정의 (`*.ts`)      | **400줄** | 도메인별 파일 분리 |

350줄은 절대 기준이 아닌 **신호등**이다.
350줄 미만이라도 역할이 2개 이상이면 분리한다.
350줄 이상이라도 반복 패턴(에디터 컴포넌트 등)은 예외 가능 — 단, PR에 이유 명시.

---

## 2. 단일 책임 원칙 (SRP)

파일 하나에 **역할이 2개 이상이면 분리**한다.

### 역할 구분 기준

```
데이터 패칭 / 상태 관리 / UI 렌더링 / 레이아웃 / 모달 / 핸들러
```

```
❌ SurveyBuilder.tsx — 패널 리사이즈 + 헤더 JSX + 모달 JSX + 캔버스 조합 + API 핸들러
✅ useBuilderPanels.ts — 패널 리사이즈 state/핸들러만
✅ BuilderHeader.tsx — 헤더 JSX만
✅ BuilderModals.tsx — 모달 JSX만
✅ BuilderCanvas.tsx — 캔버스 영역 JSX만
✅ SurveyBuilder.tsx — 오케스트레이터 (조립 + API 핸들러)
```

---

## 3. 분리 패턴

### 3-1. 페이지급 컴포넌트 (`*Client.tsx`, `page.tsx`)

```
PageClient.tsx (오케스트레이터, ~200줄)
├── usePageData.ts          — 데이터 패칭
├── PageHeader.tsx          — 상단 영역
├── PageContent.tsx         — 본문 영역
├── PageModals.tsx          — 모달 묶음
└── PageSidebar.tsx         — 사이드 패널
```

### 3-2. 복합 뷰 (`*View.tsx`, `*Canvas.tsx`)

```
ComplexView.tsx (~200줄)
├── useComplexState.ts      — 로컬 상태 + 계산 로직
├── ComplexHeader.tsx       — 뷰 상단 툴바
├── ComplexItem.tsx         — 반복 단위
└── ComplexPanel.tsx        — 사이드 패널
```

### 3-3. 훅 분리 기준

```
useXxx.ts 안에 3개 이상의 독립적인 concern → 분리
useBuilderPanels + useBuilderKeyboard + useAutoSave ← 각자 별도 파일 ✅
```

---

## 4. 현재 분리가 필요한 파일 (우선순위순)

아래 파일들은 다음 기능 개발 시 건드릴 때 **먼저 분리하고 작업**한다.
기존 동작을 깨지 않는 순수 분리 PR은 코드 리뷰 없이 머지 가능.

| 파일                                          | 현재 줄 수 | 분리 방향                                                    |
| --------------------------------------------- | ---------- | ------------------------------------------------------------ |
| `survey/[id]/respond/SurveyRespondClient.tsx` | 1,684      | useRespondState / RespondQuestionRenderer / RespondSubmitBar |
| `(main)/SurveyListClient.tsx`                 | 1,385      | useSurveyList / SurveyListFilters / SurveyListModals         |
| `builder/list/QuestionList.tsx`               | 1,397      | SectionBlock / useQuestionDnD (QuestionCard는 이미 분리됨)   |
| `builder/ai/StartSelectionOverlay.tsx`        | 1,321      | ManualStartPanel / AIStartPanel                              |
| `builder/panels/AnalysisView.tsx`             | 978        | AnalysisPanel / AnalysisHistoryList / useAnalysisState       |
| `builder/list/ListViewCanvas.tsx`             | 878        | ListViewItem / useListScroll                                 |
| `builder/panels/BuilderResultView.tsx`        | 837        | ResultSummaryCard / ResultChartSection                       |
| `builder/panels/ResponsesView.tsx`            | 816        | ResponseTable / ResponseFilter / ResponseDetailPanel         |

---

## 5. 금지 패턴

```tsx
// ❌ 모달 JSX를 페이지 컴포넌트 중간에 인라인으로
function MyPage() {
  return (
    <div>
      <MainContent />
      {isOpen && (
        <div className="fixed inset-0 ...">
          {/* 100줄짜리 모달 JSX */}
        </div>
      )}
    </div>
  );
}

// ✅ 모달은 별도 컴포넌트로
function MyPage() {
  return (
    <div>
      <MainContent />
      <MyModal isOpen={isOpen} onClose={...} />
    </div>
  );
}
```

```tsx
// ❌ state와 핸들러와 JSX가 모두 한 컴포넌트에
function BigComponent() {
  const [a] = useState();
  const [b] = useState();
  const [c] = useState();
  const handleA = () => {};
  const handleB = () => {};
  // ... 300줄의 JSX
}

// ✅ state/핸들러를 훅으로 분리
function SmartComponent() {
  const { a, b, handleA, handleB } = useBigComponentState();
  return <BigComponentView a={a} b={b} onA={handleA} onB={handleB} />;
}
```

---

## 6. 새 파일 생성 시 체크리스트

- [ ] 이 파일의 단일 책임이 명확한가?
- [ ] 기존 파일에 추가할 수 있는가? (새 파일 최소화)
- [ ] 350줄 이내로 구현 가능한가? 아니라면 분리 계획이 있는가?
- [ ] 훅으로 추출할 수 있는 state/로직이 있는가?
