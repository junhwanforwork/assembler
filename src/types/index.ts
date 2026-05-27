export interface FeatureArea {
  name: string
  decisions: UIDecision[]
}

// 기능 명세 표 — implementations.features (FeatureArea 와 별개 jsonb 컬럼)
export interface FeatureSpec {
  id: number
  spec: string
  ui: string
  states: string[]
}

export interface UIDecision {
  element: string
  chosen: string
  why: string
  advantage: string
  company_context?: string
  screenshot_url?: string
}

export interface SetupGuide {
  target: 'nocode' | 'code' | 'outsource'
  tool?: string
  note: string
  cost_range?: string
}

export interface ImplWithProduct {
  id: string
  headline: string
  feature_type_id: string | null
  industry_id: string | null
  device_type: string | null
  tags: string[] | null
  created_at: string | null
  is_published: boolean | null
  feature_areas: FeatureArea[] | null
  features: FeatureSpec[] | null
  plain_notes: string | null
  pros: string[] | null
  cons: string[] | null
  best_for: string | null
  setup_guide: SetupGuide[] | null
  product: {
    id: string
    slug: string
    name: string
    logo_url: string | null
    brand_color: string | null
  } | null
  feature_type: { name: string; slug: string } | null
  industry: { name: string; icon: string | null } | null
}

export interface ProductWithImpls {
  id: string
  slug: string
  name: string
  logo_url: string | null
  brand_color: string | null
  industry: { name: string; icon: string | null } | null
  implementations: ImplWithProduct[]
}

export interface SavedItem {
  id: string
  session_id: string
  user_id: string | null
  implementation_id: string
  note: string | null
  created_at: string | null
  implementation?: ImplWithProduct
}
