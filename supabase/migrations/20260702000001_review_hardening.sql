-- 코드리뷰 후속 하드닝 (asm-be-activity-suggestions 리뷰 지적사항).
-- 1) asm_activity.workspace_id FK 인덱스 — on delete set null 이 활동 로그 전체 스캔으로 번지는 걸 막는다
--    (advisor: unindexed_foreign_keys. 기존 idx_asm_activity_product 는 workspace_id 미커버).
-- 2) set_asm_updated_at() search_path 고정 — claim_session_projects 와 동일한 하드닝
--    (advisor: function_search_path_mutable).

create index if not exists idx_asm_activity_workspace on asm_activity(workspace_id);

create or replace function set_asm_updated_at()
returns trigger as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$ language plpgsql
set search_path = '';
