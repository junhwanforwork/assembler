-- UX 빌더: 프로젝트 문서 모델
-- 프로젝트 전체(화면·블록·플로우)를 document(jsonb) 단일 컬럼에 통째로 저장한다.
-- 세션 기반 소유권: x-session-id 헤더로 RLS 스코프 (saved_items 패턴 동일).

create table wf_projects (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  title text not null default '제목 없는 프로젝트',
  document jsonb not null default '{"screens":[],"flows":[]}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_wf_projects_session on wf_projects(session_id, updated_at desc);

-- updated_at 자동 갱신
create or replace function set_wf_projects_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_wf_projects_updated_at
  before update on wf_projects
  for each row execute function set_wf_projects_updated_at();

-- RLS: session_id 소유자만 (x-session-id 헤더 기준). anon 클라이언트로 CRUD 가능.
alter table wf_projects enable row level security;

create policy "wf_projects_select" on wf_projects
  for select using (session_id = current_setting('request.headers', true)::json->>'x-session-id');

create policy "wf_projects_insert" on wf_projects
  for insert with check (session_id = current_setting('request.headers', true)::json->>'x-session-id');

create policy "wf_projects_update" on wf_projects
  for update using (session_id = current_setting('request.headers', true)::json->>'x-session-id')
  with check (session_id = current_setting('request.headers', true)::json->>'x-session-id');

create policy "wf_projects_delete" on wf_projects
  for delete using (session_id = current_setting('request.headers', true)::json->>'x-session-id');
