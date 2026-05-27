-- products 테이블 추가 + implementations 스키마 정규화

-- 1. products 테이블
create table products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  logo_url text,
  brand_color text,
  industry_id uuid references industries(id) on delete set null,
  website_url text,
  description text,
  is_published bool default false,
  created_at timestamptz default now()
);

-- 2. implementations: product_id FK 추가
alter table implementations
  add column product_id uuid references products(id) on delete set null;

-- 3. implementations: feature_areas 추가 (states/flow_data 대체)
alter table implementations
  add column feature_areas jsonb default '[]'::jsonb;

-- 4. implementations: 제거된 컬럼 드롭
alter table implementations
  drop column if exists company_name,
  drop column if exists company_logo_url,
  drop column if exists flow_data,
  drop column if exists states;

-- 5. 인덱스
create index idx_products_industry on products(industry_id) where is_published = true;
create index idx_products_slug on products(slug);
create index idx_implementations_product on implementations(product_id) where is_published = true;
