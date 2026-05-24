-- HowCloud 초기 스키마

-- 업종
create table industries (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  icon text,
  description text,
  order_index int default 0,
  created_at timestamptz default now()
);

-- 기능 유형
create table feature_types (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  order_index int default 0,
  created_at timestamptz default now()
);

-- 구현 (메인 콘텐츠 단위)
create table implementations (
  id uuid primary key default gen_random_uuid(),
  industry_id uuid references industries(id) on delete set null,
  feature_type_id uuid references feature_types(id) on delete set null,
  company_name text not null,
  company_logo_url text,
  source_url text,
  headline text not null,
  -- 화면 순서: [{id, label, screenshot_url}]
  flow_data jsonb default '[]'::jsonb,
  -- 화면별 상태: [{label, screenshot_url, description, ui_choices[]}]
  states jsonb default '[]'::jsonb,
  plain_notes text,
  pros jsonb default '[]'::jsonb,
  cons jsonb default '[]'::jsonb,
  best_for text,
  device_type text check (device_type in ('mobile_app','web','kiosk','tablet_pos','dashboard')),
  -- [{target: 'nocode'|'code'|'outsource', tool, note, cost_range}]
  setup_guide jsonb default '[]'::jsonb,
  tags text[] default '{}',
  view_count int default 0,
  is_published bool default false,
  created_at timestamptz default now()
);

-- 아티클 (Type B 콘텐츠, Phase 2)
create table articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  source_url text,
  summary text,
  feature_type_ids uuid[] default '{}',
  impl_ids uuid[] default '{}',
  tags text[] default '{}',
  is_published bool default false,
  created_at timestamptz default now()
);

-- 저장 (비로그인 session_id 기반)
create table saved_items (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  user_id uuid,
  implementation_id uuid references implementations(id) on delete cascade,
  note text,
  created_at timestamptz default now(),
  unique(session_id, implementation_id)
);

-- 공유 링크
create table workspace_shares (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  slug text unique not null,
  snapshot jsonb not null default '[]'::jsonb,
  created_at timestamptz default now()
);

-- 인덱스
create index idx_implementations_industry on implementations(industry_id) where is_published = true;
create index idx_implementations_feature_type on implementations(feature_type_id) where is_published = true;
create index idx_implementations_published_created on implementations(created_at desc) where is_published = true;
create index idx_implementations_view_count on implementations(view_count desc) where is_published = true;
create index idx_saved_items_session on saved_items(session_id);
create index idx_workspace_shares_slug on workspace_shares(slug);
