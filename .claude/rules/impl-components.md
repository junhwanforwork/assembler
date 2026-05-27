---
paths:
  - "src/components/impl/**"
  - "src/app/(main)/impl/**"
---

# 구현 상세 컴포넌트 규칙

`/impl/[id]` 페이지와 그 하위 컴포넌트에 적용한다.

---

## ImplDecisionItem — 다크 패널 스타일

아코디언 확장 시 나타나는 UIDecision 상세 패널.

**디자인 원칙:**
- 배경: 다크 (#111115 수준), 주변 배경보다 어둡게
- 타이포: bold label + 일반 설명 텍스트 쌍
- 구분선: 섹션 간 얇은 선 (border-b)

**표시 구조 (순서 엄수):**
```
[element]: [chosen]        ← bold, 첫 줄
why: [why 내용]            ← 일반 텍스트
advantage: [advantage]     ← 약한 강조 (text-sm)
[company_context]          ← 있을 때만, 이탤릭 or 구분색
[screenshot_url]           ← 있을 때만, 설명 아래 이미지
```

**company_context 표시:**
- 없으면 렌더링하지 않는다 (빈 div 금지)
- 있으면 시각적으로 구분 (인용 스타일 또는 배경색 다르게)

**스크린샷:**
- `screenshot_url` null이면 컴포넌트 자체를 렌더링하지 않는다
- 있으면 `next/image` 사용, alt는 `element` 값

## ImplDecisionList — 아코디언 규칙

**기본 상태:**
- 첫 번째 UIDecision만 펼침 (`open` 상태)
- 나머지는 접힌 상태

**토글:**
- 클릭 시 해당 항목만 토글 (다른 항목 닫지 않음)
- 여러 항목 동시에 열릴 수 있음

**feature_area 헤더:**
- 항상 열린 섹션 제목으로 표시 (접을 수 없음)
- area.name을 그대로 표시

## ImplAreaSidebar — feature_areas 체크박스 네비

**역할:** 사용자가 보고 싶은 feature_area만 필터

**동작:**
- 기본: 전체 체크
- 체크 해제 시 해당 area 섹션 숨김 (DOM에서 제거 아닌 hidden)
- 체크박스 라벨 = area.name

**위치:** 상세 페이지 좌측 고정 사이드바 (sticky)

## ImplHeader — 헤더 영역

**표시 요소 (순서):**
1. product.logo_url 있으면 이미지, 없으면 이니셜 원형
2. product.name (프로덕트명)
3. feature_type.name (기능 유형)
4. industry.icon + industry.name 칩
5. device_type 칩
6. headline (큰 타이포)
7. [★ 저장하기] 버튼 — 우측 정렬

**brand_color 활용:**
- product.brand_color 있으면 헤더 배경 또는 로고 bg에 사용
- 없으면 기본 bg

## SimilarImpls — 유사 구현

**쿼리 기준 (우선순위):**
1. 같은 feature_type_id + 다른 product
2. 최대 3개

**카드 형식:** ImplementationCard와 동일한 컴포넌트 재사용

## 저장 버튼 상태

```typescript
// 저장 여부는 savedStore에서 확인
const isSaved = savedStore.items.some(i => i.implementation_id === impl.id)
```

- 저장됨: "★ 저장됨" (filled)
- 미저장: "☆ 저장하기" (outline)
- 클릭 시 토스트: "저장했어요. 워크스페이스에서 확인해요 →"
