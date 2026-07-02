-- ASM-001 rate limit — 유료 Anthropic 호출 라우트(generate·files·suggestions·note) 반복 호출 방어.
-- fixed-window 카운터. 키 = "{sessionId}:{route}:{m|h}" — 조립은 앱(src/lib/api/rate-limit.ts)이 한다.
-- 저장소를 Supabase 로 두는 이유: 새 벤더 0 + 다중 인스턴스/콜드스타트에서도 정확(인메모리 한계 회피).
-- if not exists/if exists: 마이그레이션 히스토리 드리프트 복구 시 부분 재적용에도 안전(idempotent).

create table if not exists asm_rate_limits (
  key text primary key,
  window_start timestamptz not null,
  count int not null default 0
);

-- 기회적 청소용(아래 함수) — 죽은 윈도 행 스캔이 seq scan 이 되지 않게.
create index if not exists idx_asm_rate_limits_window on asm_rate_limits(window_start);

-- 직접 접근 차단 — RLS on + 정책 없음(deny-all). 읽기/쓰기는 아래 security definer RPC로만.
alter table asm_rate_limits enable row level security;

-- 원자적 증가 + 윈도 롤오버(upsert 한 방 — check-then-act 레이스 없음).
-- 반환: 0 = 허용, N > 0 = N초 후 재시도(라우트가 Retry-After 헤더로 전달).
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
  -- anon 이 PostgREST 로 직접 호출해 인자를 조작(p_window_seconds=0 → 매 호출 윈도 리셋 = 우회)하는 걸 차단.
  -- 앱(rate-limit.ts)은 항상 이 범위 안의 값만 보낸다 — raise 는 직접 호출 어뷰즈에서만 발화.
  if p_window_seconds not in (60, 3600)
     or p_limit not between 1 and 1000
     or length(p_key) > 120
     or p_key !~ ':(generate|files|suggestions|note):(m|h)$' then
    raise exception 'invalid rate limit args';
  end if;

  -- 기회적 청소(~1% 확률) — 모든 윈도 ≤ 1h 라 2h 지난 행은 죽은 행. TTL 없는 무한 성장 방지.
  if random() < 0.01 then
    delete from public.asm_rate_limits where window_start < v_now - interval '2 hours';
  end if;

  insert into public.asm_rate_limits as r (key, window_start, count)
  values (p_key, v_now, 1)
  on conflict (key) do update set
    -- 윈도가 끝났으면 새 윈도로 리셋, 아니면 증가. excluded.window_start = v_now.
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

grant execute on function check_rate_limit(text, int, int) to anon, authenticated;
