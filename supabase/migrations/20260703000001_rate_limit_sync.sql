-- ASM-028 — sync(싱크-인 apis·db-tables POST) 라우트를 rate limit RPC 허용 목록에 추가.
-- 배경: ASM-026 이 두 POST 를 UI 경로로 승격했지만 rate limit 미배선 — 임의 세션으로
-- 호출당 최대 300행 DB 쓰기를 무제한 반복 가능. rate-limit.ts 가 "{sid}:sync:m|h" 키를 보낸다.
-- ⚠️ 이 마이그레이션이 DB 에 적용되기 전까지 sync 키는 인자 가드 exception → 클라이언트
--    fail-open = sync rate limit 무력화 상태다(2026-07-02 chat 사고와 동일 패턴).
--    적용 + 실 DB 429 스모크는 오케스트레이터가 통합 시 수행한다.
-- 함수 본문은 라우트 목록 외 20260702000003 과 동일(create or replace 라 멱등).

create or replace function check_rate_limit(p_key text, p_limit int, p_window_seconds int)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := now();
  v_count int;
  v_window_start timestamptz;
begin
  if p_window_seconds not in (60, 3600)
     or p_limit not between 1 and 1000
     or length(p_key) > 120
     or p_key !~ ':(generate|files|suggestions|note|chat|sync):(m|h)$' then
    raise exception 'invalid rate limit args';
  end if;

  if random() < 0.01 then
    delete from public.asm_rate_limits where window_start < v_now - interval '2 hours';
  end if;

  insert into public.asm_rate_limits as r (key, window_start, count)
  values (p_key, v_now, 1)
  on conflict (key) do update set
    count = case when r.window_start + make_interval(secs => p_window_seconds) <= excluded.window_start
                 then 1 else r.count + 1 end,
    window_start = case when r.window_start + make_interval(secs => p_window_seconds) <= excluded.window_start
                        then excluded.window_start else r.window_start end
  returning count, window_start into v_count, v_window_start;

  if v_count <= p_limit then
    return 0;
  end if;
  return greatest(1, ceil(extract(epoch from (v_window_start + make_interval(secs => p_window_seconds) - v_now))))::int;
end;
$$;
