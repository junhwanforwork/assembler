-- implementations.edge_cases — 권한 거부·네트워크 실패 등 기본 외 케이스
-- features(기능 명세 표) 와 feature_areas(구현 결정) 와는 별개의 jsonb 컬럼.
-- 구조: EdgeCase[] = [{ case: string, handling: string }, ...]

alter table implementations
  add column edge_cases jsonb default '[]'::jsonb;
