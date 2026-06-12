-- implementations.features — 기능 명세 표용 jsonb 배열
-- 기존 feature_areas(구현 결정 묶음: element/chosen/why/advantage)와 별개 컬럼.
-- 구조: FeatureSpec[] = [{ id: number, spec: string, ui: string, states: string[] }, ...]

alter table implementations
  add column features jsonb default '[]'::jsonb;
