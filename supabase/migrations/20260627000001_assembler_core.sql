-- Assembler 코어 스키마 — 아이디어 → 연결된 구조.
-- 레거시(products·implementations 등)와 충돌 피하려 asm_ 프리픽스(wf_projects 전례).
-- 두 레이어: A 코드-진실(asm_apis·asm_db_tables, 코드/MCP 싱크) · B 저작(products·workspaces).
-- 소유권은 asm_products 한 곳(dual-key: 로그인 user_id / 익명 x-session-id).
-- 자식 테이블은 asm_products RLS 가시성에 위임한다(부모가 보이면 자식 접근).

-- ───────────────────────── 공통: updated_at 트리거 ─────────────────────────
create or replace function set_asm_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ───────────────────────── asm_products (소유권 루트) ─────────────────────────
create table asm_products (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  user_id uuid references auth.users(id) on delete cascade,
  name text not null default '제목 없는 프로덕트',
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_asm_products_session on asm_products(session_id, updated_at desc);
create index idx_asm_products_user on asm_products(user_id, updated_at desc);

create trigger trg_asm_products_updated_at
  before update on asm_products
  for each row execute function set_asm_updated_at();

-- ───────────────────────── asm_workspaces (B 저작) ─────────────────────────
-- 디자인 그래프(requirements·features·pages·flows·wireframes·elements)를 design(jsonb)에 통째로 저장.
create table asm_workspaces (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references asm_products(id) on delete cascade,
  name text not null default 'Main',
  is_main boolean not null default false,
  design jsonb not null default '{"requirements":[],"features":[],"pages":[],"flows":[],"wireframes":[],"elements":[]}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_asm_workspaces_product on asm_workspaces(product_id, updated_at desc);
-- 프로덕트당 Main 워크스페이스는 하나.
create unique index uq_asm_workspaces_main on asm_workspaces(product_id) where is_main;

create trigger trg_asm_workspaces_updated_at
  before update on asm_workspaces
  for each row execute function set_asm_updated_at();

-- ───────────────────────── asm_apis (A 코드-진실, Product 전역) ─────────────────────────
create table asm_apis (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references asm_products(id) on delete cascade,
  method text not null,
  endpoint text not null,
  summary text not null default '',
  status text not null default 'planned' check (status in ('planned', 'active', 'deprecated')),
  source text not null check (source in ('code', 'mcp')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- 싱크-인 멱등 키: 같은 (product, method, endpoint)는 갱신.
  unique (product_id, method, endpoint)
);

create index idx_asm_apis_product on asm_apis(product_id);

create trigger trg_asm_apis_updated_at
  before update on asm_apis
  for each row execute function set_asm_updated_at();

-- ───────────────────────── asm_db_tables (A 코드-진실, Product 전역) ─────────────────────────
create table asm_db_tables (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references asm_products(id) on delete cascade,
  name text not null,
  description text not null default '',
  columns jsonb not null default '[]'::jsonb,
  source text not null check (source in ('code', 'mcp')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, name)
);

create index idx_asm_db_tables_product on asm_db_tables(product_id);

create trigger trg_asm_db_tables_updated_at
  before update on asm_db_tables
  for each row execute function set_asm_updated_at();

-- ───────────────────────── RLS ─────────────────────────
-- asm_products: dual-key(로그인 user_id / 익명 user_id null + 세션 헤더). wf_projects 패턴 동일.
alter table asm_products enable row level security;

create policy "asm_products_select" on asm_products
  for select using (
    (auth.uid() is not null and user_id = auth.uid())
    or (user_id is null and session_id = current_setting('request.headers', true)::json->>'x-session-id')
  );
create policy "asm_products_insert" on asm_products
  for insert with check (
    (auth.uid() is not null and user_id = auth.uid())
    or (user_id is null and session_id = current_setting('request.headers', true)::json->>'x-session-id')
  );
create policy "asm_products_update" on asm_products
  for update using (
    (auth.uid() is not null and user_id = auth.uid())
    or (user_id is null and session_id = current_setting('request.headers', true)::json->>'x-session-id')
  ) with check (
    (auth.uid() is not null and user_id = auth.uid())
    or (user_id is null and session_id = current_setting('request.headers', true)::json->>'x-session-id')
  );
create policy "asm_products_delete" on asm_products
  for delete using (
    (auth.uid() is not null and user_id = auth.uid())
    or (user_id is null and session_id = current_setting('request.headers', true)::json->>'x-session-id')
  );

-- 자식 테이블: 부모 asm_products가 보이면(=소유) 접근. dual-key 로직을 부모 RLS에 위임(DRY).
alter table asm_workspaces enable row level security;
create policy "asm_workspaces_all" on asm_workspaces
  for all
  using (exists (select 1 from asm_products p where p.id = product_id))
  with check (exists (select 1 from asm_products p where p.id = product_id));

alter table asm_apis enable row level security;
create policy "asm_apis_all" on asm_apis
  for all
  using (exists (select 1 from asm_products p where p.id = product_id))
  with check (exists (select 1 from asm_products p where p.id = product_id));

alter table asm_db_tables enable row level security;
create policy "asm_db_tables_all" on asm_db_tables
  for all
  using (exists (select 1 from asm_products p where p.id = product_id))
  with check (exists (select 1 from asm_products p where p.id = product_id));
