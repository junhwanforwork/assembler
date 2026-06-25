-- wf_projects 로그인 소유권 + 익명 세션 승계 (온보딩/인증)
-- 익명(user_id null + x-session-id 헤더)과 로그인(user_id = auth.uid())을 RLS dual-key로 공존시킨다.
-- 가입 직후 claim_session_projects 로 익명 세션 프로젝트를 계정으로 승계한다(멱등).

-- if not exists/if exists: 마이그레이션 히스토리 드리프트 복구 시 부분 재적용에도 안전(idempotent).
alter table wf_projects
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

create index if not exists idx_wf_projects_user on wf_projects(user_id, updated_at desc);

-- RLS 재작성: 로그인 = user_id 소유 / 익명 = user_id null + 세션 헤더 일치.
-- with check 의 user_id = auth.uid() 조건이 로그인 사용자의 user_id 위조를 막는다.
-- 정책 술어가 auth.uid()로 게이트하므로 to public 으로 둔다(anon/authenticated 모두 동일 술어로 안전).
drop policy if exists "wf_projects_select" on wf_projects;
drop policy if exists "wf_projects_insert" on wf_projects;
drop policy if exists "wf_projects_update" on wf_projects;
drop policy if exists "wf_projects_delete" on wf_projects;

create policy "wf_projects_select" on wf_projects
  for select using (
    (auth.uid() is not null and user_id = auth.uid())
    or (user_id is null and session_id = current_setting('request.headers', true)::json->>'x-session-id')
  );

create policy "wf_projects_insert" on wf_projects
  for insert with check (
    (auth.uid() is not null and user_id = auth.uid())
    or (user_id is null and session_id = current_setting('request.headers', true)::json->>'x-session-id')
  );

create policy "wf_projects_update" on wf_projects
  for update using (
    (auth.uid() is not null and user_id = auth.uid())
    or (user_id is null and session_id = current_setting('request.headers', true)::json->>'x-session-id')
  )
  with check (
    (auth.uid() is not null and user_id = auth.uid())
    or (user_id is null and session_id = current_setting('request.headers', true)::json->>'x-session-id')
  );

create policy "wf_projects_delete" on wf_projects
  for delete using (
    (auth.uid() is not null and user_id = auth.uid())
    or (user_id is null and session_id = current_setting('request.headers', true)::json->>'x-session-id')
  );

-- 가입 직후 익명 세션 프로젝트를 계정으로 승계. user_id is null 인 행만 옮긴다(타 계정 미침범)·멱등.
-- SECURITY DEFINER 로 RLS 를 우회해 auth.uid() 소유권을 부여한다. p_session_id 는 호출자 localStorage 의
-- 무작위 UUID — 기존 x-session-id 소유권과 같은 "보유=접근" 모델이라, 세션 id 를 아는 주체만 승계할 수 있다.
-- set search_path = '' + 스키마 정규화로 정의자 권한 함수의 검색경로 하이재킹을 막는다.
create or replace function public.claim_session_projects(p_session_id text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  claimed integer;
begin
  if auth.uid() is null then
    return 0;
  end if;
  update public.wf_projects
    set user_id = auth.uid()
    where session_id = p_session_id and user_id is null;
  get diagnostics claimed = row_count;
  return claimed;
end;
$$;

revoke all on function public.claim_session_projects(text) from public;
grant execute on function public.claim_session_projects(text) to authenticated;
