-- ASM-006 후속 — chat 라우트를 rate limit RPC 허용 목록에 추가.
-- 배경: rate-limit.ts 가 chat 키("{sid}:chat:m|h")를 보내지만 기존 RPC 인자 가드가
-- generate|files|suggestions|note 만 허용 → chat 은 exception → 클라이언트 fail-open
-- = 챗 rate limit 이 조용히 무력화. 통합 시점(오케스트레이터 리뷰)에 발견.
-- 함수 본문은 라우트 목록 외 20260702000002 와 동일(create or replace 라 멱등).

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
     or p_key !~ ':(generate|files|suggestions|note|chat):(m|h)$' then
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
