-- DB Learning — 테이블 호버 AI 설명(노트). 두 레이어 분리의 신규 저장소.
-- ⚠️ asm_db_tables.description 은 code-truth(싱크가 멱등 upsert로 덮어씀). AI 추론을 거기 박으면 사라진다.
--    그래서 추론(설명)은 이 별도 테이블에 둔다 — 싱크가 건드리지 않으므로 노트가 살아남는다.
-- 소유권은 부모 asm_products RLS에 위임(자식 테이블 공통 패턴).
-- if not exists/if exists: 마이그레이션 히스토리 드리프트 복구 시 부분 재적용에도 안전(idempotent).

create table if not exists asm_db_table_notes (
  id uuid primary key default gen_random_uuid(),
  -- cascade 는 테이블/제품이 실제로 delete 될 때만 노트를 정리한다.
  -- ⚠️ 코드 rename 은 cascade 가 아니다: syncDbTables 는 (product,name) upsert 라 옛 이름 row 를 지우지 않고
  --   새 이름 row 를 추가한다 → 옛 노트는 옛(고아) row 에 남고 새 이름엔 노트가 없다. v1 허용 엣지(노트 미이전).
  db_table_id uuid not null references asm_db_tables(id) on delete cascade,
  product_id uuid not null references asm_products(id) on delete cascade,
  explanation text not null,
  -- 연결 증거(FK·UIElement 역참조) 기반(true) vs 컬럼만 보수적(false). UI 강조·신뢰도 표시용.
  grounded boolean not null default false,
  -- 사용자가 손대면 true → AI 재생성이 덮지 않는다.
  is_user_edited boolean not null default false,
  generated_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- 테이블당 노트 1개(product-global). upsert 멱등 키.
  unique (db_table_id)
);

create index if not exists idx_asm_db_table_notes_product on asm_db_table_notes(product_id);

drop trigger if exists trg_asm_db_table_notes_updated_at on asm_db_table_notes;
create trigger trg_asm_db_table_notes_updated_at
  before update on asm_db_table_notes
  for each row execute function set_asm_updated_at();

-- 부모 asm_products가 보이면(=소유) 접근. dual-key 로직을 부모 RLS에 위임(DRY) — asm_db_tables 정책과 동일.
alter table asm_db_table_notes enable row level security;
drop policy if exists "asm_db_table_notes_all" on asm_db_table_notes;
create policy "asm_db_table_notes_all" on asm_db_table_notes
  for all
  using (exists (select 1 from asm_products p where p.id = product_id))
  with check (exists (select 1 from asm_products p where p.id = product_id));
