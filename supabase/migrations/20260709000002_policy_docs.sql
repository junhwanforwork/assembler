-- 정책 문서(ASM-068) — 사용자가 직접 쓰는 저작물 md 문서(계정 구조·요금·권한 등).
-- 투사 문서(PRD·기술명세·데이터사전, 렌더 시 계산)와 달리 실제 저장물이다.
-- ⚠️ 부모(제품)당 N행 — asm_api_notes 의 unique(api_id) 같은 유일 제약을 넣지 않는다(문서는 여러 개).
-- 소유권은 부모 asm_products RLS에 위임(자식 테이블 공통 패턴).
-- if not exists/if exists: 마이그레이션 히스토리 드리프트 복구 시 부분 재적용에도 안전(idempotent).

create table if not exists asm_policy_docs (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references asm_products(id) on delete cascade,
  title text not null,
  body text not null default '',
  -- 본문이 참조하는 코드-진실 id — 호버 해석/추천 대상. 그래프 무결성은 앱(참조 살균) 몫이라 FK 배열은 두지 않는다.
  api_ids uuid[] not null default '{}',
  db_table_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_asm_policy_docs_product on asm_policy_docs(product_id, updated_at desc);

drop trigger if exists trg_asm_policy_docs_updated_at on asm_policy_docs;
create trigger trg_asm_policy_docs_updated_at
  before update on asm_policy_docs
  for each row execute function set_asm_updated_at();

-- 부모 asm_products가 보이면(=소유) 접근. dual-key 로직을 부모 RLS에 위임(DRY) — asm_api_notes 정책과 동일.
alter table asm_policy_docs enable row level security;
drop policy if exists "asm_policy_docs_all" on asm_policy_docs;
create policy "asm_policy_docs_all" on asm_policy_docs
  for all
  using (exists (select 1 from asm_products p where p.id = product_id))
  with check (exists (select 1 from asm_products p where p.id = product_id));
