-- Recent Activity — 제품 활동 타임라인(append-only).
-- 대시보드 Recent Activity / Recent Updates + AI Suggestions 맥락의 데이터 출처.
-- asm_products 자식 — dual-key 로직을 부모 RLS에 위임(asm_core 패턴 동일).
-- append-only 로그 — updated_at/트리거 없음. 워크스페이스 삭제 시 이력은 보존(set null).

create table asm_activity (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references asm_products(id) on delete cascade,
  -- 워크스페이스 단위 이벤트는 참조, 제품 단위(삭제 등)는 null. 워크스페이스 삭제해도 이력 유지.
  workspace_id uuid references asm_workspaces(id) on delete set null,
  type text not null check (type in (
    'workspace_created',
    'workspace_renamed',
    'workspace_deleted',
    'design_updated',
    'file_generated',
    'apis_synced',
    'db_tables_synced'
  )),
  -- 표시 카피는 FE가 type+metadata로 조합. 여기엔 사실(name·count·counts 등)만 스냅샷.
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_asm_activity_product on asm_activity(product_id, created_at desc);

-- 형제 테이블과 동일한 for-all 부모 위임 정책. append-only는 앱 레벨 규약(repo가 insert/select만 노출)이지
-- DB 제약은 아니다 — 소유자는 정책상 update/delete도 가능하나 그 경로를 코드로 두지 않는다.
alter table asm_activity enable row level security;
create policy "asm_activity_all" on asm_activity
  for all
  using (exists (select 1 from asm_products p where p.id = product_id))
  with check (exists (select 1 from asm_products p where p.id = product_id));
