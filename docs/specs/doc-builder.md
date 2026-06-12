# DOC 빌더 (PRD 생성) — 풀 스펙

> 원본: 사용자가 HC-002로 전달한 명세. 번호 충돌(기존 HC-002는 GET /api/implementations/[id]) 때문에 **HC-069~HC-077로 분할 티켓화**됨.
> 이 문서는 통합 스펙 보존용. 구현 시 각 티켓의 dep 순서를 따른다.

⭐ HowCloud의 핵심 가치 검증 영역. 이게 작동해야 새 비전이 의미 있음.

---

## 목적

워크스페이스의 부품(saved_items → implementations)을 AI가 합쳐서 **하나의 PRD 마크다운 문서**를 만든다.

```
입력: 부품 N개 + 프로젝트 이름 + 한 줄 설명
출력: 마크다운 PRD
```

---

## 위치

`/workspace/doc/[doc_id]`

워크스페이스(`/workspace`)에서 [DOC 만들기] 클릭 → `POST /api/docs`(즉시 doc_id 반환) → 이 페이지로 이동 → 폴링으로 상태 확인.

---

## 페이지 구조

### 생성 중
```
┌─────────────────────────────────────────────┐
│ ← 워크스페이스로                              │
├─────────────────────────────────────────────┤
│              🔮                                │
│         부품을 합치고 있어요                   │
│   3개의 부품을 PRD로 만들고 있어요             │
│   보통 10~20초 걸려요                          │
│         [████████░░░░░] 50%                    │
└─────────────────────────────────────────────┘
```

### 완료
- 프로젝트 이름 + 한 줄 설명 헤더
- sticky 액션 바: `[📋 마크다운 복사]` `[💾 .md 다운로드]`
- 마크다운 본문 렌더링 (개요·사용자 시나리오·기능 명세·화면 흐름·데이터 모델·빠뜨리기 쉬운 케이스·참고)

### 실패
- ⚠️ "DOC을 만들지 못했어요" + "AI 서버에 일시적 문제가 있어요. 잠시 후 다시 시도해 주세요"
- `[다시 시도하기]` `[워크스페이스로]`

### 한도 도달
- "오늘 DOC 생성 한도에 도달했어요" + "내일 다시 시도해 주세요 (Pro 출시되면 무제한)"

---

## API

### `POST /api/docs`
```ts
// 요청
{
  project_name: string,
  one_line_description?: string,
  implementation_ids: string[]   // saved_items의 implementation_id들
}

// 응답 (즉시 — 동기)
{
  doc_id: string,
  status: 'generating'
}
```

서버 동작:
1. `docs` 테이블에 row 생성 (`generation_status: 'generating'`)
2. doc_id 응답 (즉시)
3. 백그라운드에서 AI 호출 시작 (비동기)

### `GET /api/docs/[doc_id]`
```ts
// 생성 중
{ doc_id, status: 'generating', progress_estimate, project_name, source_count }

// 완료
{
  doc_id, status: 'done',
  project_name, one_line_description,
  content,                       // 마크다운 본문
  source_implementations: [{ id, product_name, headline }],
  generation_time_ms, completed_at
}

// 실패
{ doc_id, status: 'failed', error_message }
```

### `POST /api/docs/[doc_id]/retry`
생성 실패 시 재시도. 같은 doc_id로 다시 실행.

---

## AI 프롬프트

### 위치
`src/lib/doc-builder/prompts/generate-doc-prompt.ts`

별도 파일로 관리 → `improve-prompt` 워크플로로 튜닝 가능.

### 구조
```xml
<role>
한국 모바일/웹 서비스 PRD 작성 전문가 (10년차).
바이브코더가 AI에게 던질 명세를 만든다.
</role>

<iron_law>
[ABSOLUTE] 출력은 한국어 마크다운만.
[ABSOLUTE] 부품에 없는 정보는 만들지 않는다. (환각 금지)
[ABSOLUTE] "~할 수 있다"로 끝나는 기능 명세 형식을 유지한다.
[ABSOLUTE] 부품의 회사명(product.name)을 PRD 본문에 그대로 노출하지 않는다.
        (참고 섹션에만 표기. 본문에는 일반 명칭 사용)
</iron_law>

<output_structure>
# {프로젝트 이름}
> {한 줄 설명}

## 개요
[3~5줄, 부품들에서 추출]

## 사용자 시나리오
[주요 흐름 3~5개]

## 기능 명세
### {기능 영역명}
| # | 기능 | UI | 상태 |
| - | - | - | - |
[부품의 features 표를 통합]

## 화면 흐름
[부품들의 feature_areas(의사결정 카드)를 보고 추론]

## 데이터 모델
[부품들에서 필요한 엔티티 추론]

## 빠뜨리기 쉬운 케이스
[부품의 edge_cases 통합]

## 참고
- {product.name} — {headline} (HowCloud)
- ...
</output_structure>

<rules>
- 같은 기능 영역인 부품은 통합 (예: 적립 부품 여러 개 → "적립 시스템" 하나로)
- 부품 간 모순 시: 보수적 선택 + "참고 부품마다 다름" 표기
- 실사용 노트(plain_notes)는 구현 시 주의사항으로 재구성
- 엣지 케이스는 모두 통합해서 마지막 섹션에
- 회사명은 본문에 직접 노출 금지 (참고 섹션에만)
</rules>
```

### 모델 · Temperature
- 기본: Claude Sonnet 4.7 (`claude-sonnet-4-7`)
- 부품 1~2개일 때: Haiku 4.5 폴백 (비용 절감)
- Temperature: `0.3`

---

## 비용 통제

### Free 플랜 제한
- 비로그인: **DOC 생성 1회/일** (session_id 기준)
- (Phase 2에서 로그인 도입 시 3회/일)

### 제한 도달 메시지
```
오늘 DOC 생성 한도에 도달했어요
내일 다시 시도해 주세요
(Pro 출시되면 무제한)
```

DB의 `docs` 테이블 + session_id로 일일 카운트.

---

## 폴링

```ts
useEffect(() => {
  if (status === 'done' || status === 'failed') return;
  const interval = setInterval(async () => {
    const res = await fetch(`/api/docs/${docId}`);
    const data = await res.json();
    setStatus(data.status);
    if (data.status === 'done' || data.status === 'failed') {
      setDoc(data);
      clearInterval(interval);
    }
  }, 1500);
  return () => clearInterval(interval);
}, [docId, status]);
```

- 30초 초과: "조금 더 걸리고 있어요"로 메시지 변경
- 60초 초과: 실패 간주 + 재시도 안내

---

## 액션 바 (완료 시)

| 버튼 | 동작 |
|---|---|
| `📋 마크다운 복사` | `navigator.clipboard.writeText(doc.content)` |
| `💾 .md 다운로드` | Blob 다운로드 (`{project_name}.md`) |

> Cursor / v0 변환은 후속 티켓에서 추가. 우선 마크다운 복사 + 다운로드만.

---

## UX Writing

| 상황 | 텍스트 |
|---|---|
| 생성 중 제목 | `부품을 합치고 있어요` |
| 생성 중 설명 | `{n}개의 부품을 PRD로 만들고 있어요` |
| 시간 안내 | `보통 10~20초 걸려요` |
| 지연 안내 | `조금 더 걸리고 있어요` |
| 실패 제목 | `DOC을 만들지 못했어요` |
| 실패 설명 | `AI 서버에 일시적 문제가 있어요. 잠시 후 다시 시도해 주세요` |
| 다시 시도 | `다시 시도하기` |
| 워크스페이스로 | `워크스페이스로` |
| 마크다운 복사 | `마크다운 복사` |
| 복사 토스트 | `복사했어요` |
| .md 다운로드 | `.md 다운로드` |
| 다운로드 토스트 | `다운로드를 시작했어요` |
| 한도 도달 제목 | `오늘 DOC 생성 한도에 도달했어요` |
| 한도 도달 설명 | `내일 다시 시도해 주세요` |

---

## 컴포넌트 구성

```
src/app/(main)/workspace/doc/[doc_id]/
├── page.tsx               — Server Component (초기 데이터)
└── DocClient.tsx          — Client wrapper (폴링)

src/components/doc-builder/
├── DocGeneratingState.tsx
├── DocFailedState.tsx
├── DocContent.tsx
├── DocActionBar.tsx       — sticky
├── DocMarkdownRenderer.tsx — react-markdown + remark-gfm
└── DocLimitReachedState.tsx

src/lib/doc-builder/
├── generate-doc.ts        — AI 호출 로직
├── prompts/
│   └── generate-doc-prompt.ts
└── doc-client.ts          — 클라이언트 fetch wrapper
```

---

## 마크다운 렌더링

```bash
npm install react-markdown remark-gfm
```

Tailwind `prose` 또는 디자인 토큰 커스텀.

---

## 데이터 모델 매핑 (기존 implementations 컬럼)

| 프롬프트 input | 현재 DB 컬럼 | 비고 |
|---|---|---|
| features | `implementations.features` (FeatureSpec[]) | ✅ HC-051~063에서 추가됨 |
| implementation_cards | `implementations.feature_areas` (jsonb) | ✅ |
| pros / cons | `implementations.pros` / `cons` | ✅ |
| best_for | `implementations.best_for` | ✅ |
| operation_note | `implementations.plain_notes` (mapping) | ✅ |
| setup_guide | `implementations.setup_guide` | ✅ |
| edge_cases | **없음** → HC-069에서 jsonb 컬럼 추가 | ❌ |
| company_name | `products.name` (제품명, 회사명 아님) | ⚠️ |

---

## 본인이 직접 검증해야 할 핵심

이 작업이 끝나고:
1. 워크스페이스에 부품 2~3개 담기 (카카오헤어샵, 짐박스 등)
2. [DOC 만들기] 클릭 → 마크다운 받기
3. 그 마크다운을 Cursor에 던지기
4. **진짜로 작동하는 코드가 나오나 확인**

작동하면: HowCloud 핵심 가치 검증 완료. Phase 1 진입.
작동 안 하면: 프롬프트(`generate-doc-prompt.ts`) 튜닝 (HC-077).

---

## 위험 평가

| 위험 | 영향 | 대응 |
|---|---|---|
| AI 응답 30초 초과 | UX 깨짐 | 폴링 + 안내 메시지 |
| 생성 품질 낮음 | 가치 검증 실패 | 프롬프트 반복 튜닝 (HC-077) |
| AI 비용 폭증 | 본인 부담 | 일일 제한 + 모델 선택 |
| 환각 (없는 정보 만듦) | 신뢰 깨짐 | Iron Law + 본인 검수 |
| 부품 1개로도 PRD 잘 나오나 | MVP 데모 가능 여부 | HC-077 검증 |
