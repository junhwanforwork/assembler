---
paths:
  - "supabase/**"
  - "src/types/**"
  - "src/lib/supabase/**"
---

# HowCloud DB & Supabase 규칙

DB 스키마, 마이그레이션, Supabase 클라이언트, TypeScript 타입에 적용한다.

---

## 핵심 원칙

- **Supabase only** — 다른 DB/ORM 사용 금지
- `SELECT *` 금지 — 필요한 컬럼만 명시
- 마이그레이션 파일명: `YYYYMMDDHHMMSS_description.sql`
- 타입은 `supabase gen types` 로 자동 생성 — 수동 수정 금지 (`database.types.ts`)
- 앱 레벨 타입은 `src/types/index.ts` 에서 관리

---

## 테이블 구조 요약

### products (브랜드/서비스 정보)
```sql
products (
  id uuid PK,
  slug text UNIQUE,        -- 'starbucks', 'kakao'
  name text,               -- '스타벅스', '카카오'
  logo_url text,           -- 브랜드 로고 URL
  brand_color text,        -- hex (ex. '#00704A') — 카드 bg용
  industry_id uuid FK → industries,
  website_url text,
  description text,
  is_published bool DEFAULT false,
  created_at timestamptz
)
```

### implementations (메인 콘텐츠)
```sql
implementations (
  id uuid PK,
  product_id uuid FK → products,      -- ★ products 테이블 참조
  industry_id uuid FK → industries,   -- 이 구현의 업종 컨텍스트
  feature_type_id uuid FK → feature_types,
  headline text,                       -- "QR 스캔으로 자동 적립"
  feature_areas jsonb DEFAULT '[]',    -- UIDecision 배열 (아래 구조 참고)
  plain_notes text,
  pros jsonb,
  cons jsonb,
  best_for text,
  device_type text,                    -- 'mobile_app' | 'web' | 'kiosk' | 'tablet_pos' | 'dashboard'
  setup_guide jsonb,
  tags text[],
  view_count int DEFAULT 0,
  is_published bool DEFAULT false,
  created_at timestamptz
)
```

**제거된 컬럼 (재추가 금지):**
- `company_name`, `company_logo_url` → `products` 테이블로 이동
- `flow_data`, `states` → `feature_areas` JSONB로 대체

---

## feature_areas JSONB 구조

```typescript
interface FeatureArea {
  name: string           // "적립 화면"
  decisions: UIDecision[]
}

interface UIDecision {
  element: string        // "QR 코드 표시 방식"
  chosen: string         // "전체 화면 흰 배경"
  why: string            // "시야에 잘 들어와 스캔 성공률이 높아요"
  advantage: string      // "오류율 낮음, 재시도 거의 없음"
  company_context?: string  // 이 회사만의 이유 (없으면 null)
  screenshot_url?: string   // 있을 때만
}
```

---

## 쿼리 규칙

### implementations 조회는 항상 products JOIN 필수

```typescript
// ✅ 올바른 쿼리
supabase
  .from('implementations')
  .select(`
    id, headline, device_type, industry_id, feature_type_id, tags, created_at,
    product:products(id, slug, name, logo_url, brand_color),
    feature_type:feature_types(name, slug),
    industry:industries(name, icon)
  `)
  .eq('is_published', true)

// ❌ products 없이 단독 조회 금지 (카드 렌더링 불가)
supabase.from('implementations').select('*')
```

### 피드 필터 쿼리 패턴

```typescript
let query = supabase.from('implementations').select(IMPL_SELECT).eq('is_published', true)

if (feature_type) query = query.eq('feature_type_id', feature_type)
if (industry)     query = query.eq('industry_id', industry)
if (device)       query = query.eq('device_type', device)
if (q)            query = query.ilike('headline', `%${q}%`)

query = query.order('created_at', { ascending: false })
```

### saved_items — session_id 기반

```typescript
// 비로그인: x-session-id 헤더
// 로그인 시: user_id 우선, session_id 폴백
const sessionId = request.headers.get('x-session-id')
```

---

## Supabase 클라이언트 사용 규칙

| 컨텍스트 | 사용할 클라이언트 |
|---------|----------------|
| Server Component / Route Handler | `src/lib/supabase/server.ts` (createServerClient) |
| Client Component | `src/lib/supabase/client.ts` (createBrowserClient) |

---

## RLS 정책 원칙

- `implementations`: is_published = true → 전체 읽기 허용
- `products`: is_published = true → 전체 읽기 허용
- `saved_items`: session_id 일치 시 읽기/쓰기
- 어드민 전용 쓰기: `service_role` key 사용 (서버 사이드 전용)
