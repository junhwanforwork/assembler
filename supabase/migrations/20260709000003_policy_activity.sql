-- 정책 문서 활동 로그(ASM-068) — asm_activity.type CHECK 제약에 policy_doc_* 3값 추가.
-- ⚠️ 옛 마이그레이션(20260627000002) 파일은 수정하지 않는다 — 적용된 파일 편집은 재실행되지 않는다.
--    새 ALTER 마이그레이션으로만 확장한다.
-- 인라인 컬럼 CHECK 의 Postgres 기본 제약명 = {table}_{column}_check = asm_activity_type_check.
-- 드리프트 안전: drop if exists 후 add. 목록 = 20260627000002 원본 7종 + policy_doc_* 3종.

alter table asm_activity drop constraint if exists asm_activity_type_check;
alter table asm_activity add constraint asm_activity_type_check check (type in (
  'workspace_created',
  'workspace_renamed',
  'workspace_deleted',
  'design_updated',
  'file_generated',
  'apis_synced',
  'db_tables_synced',
  'policy_doc_created',
  'policy_doc_updated',
  'policy_doc_deleted'
));
