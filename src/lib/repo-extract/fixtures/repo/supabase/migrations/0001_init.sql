-- ASM-060 픽스처: CREATE TABLE 파서 입력(2순위 소스 — database.types.ts 부재 시에만 사용)
create type order_status as enum ('pending', 'paid');

create table if not exists public.customers (
  id uuid,
  email text not null,
  signup_source text default 'organic',
  primary key (id)
);

CREATE TABLE public.orders (
  id uuid primary key,
  customer_id uuid not null references public.customers (id),
  amount numeric(10,2),
  placed_at timestamp with time zone not null default now(),
  memo text, -- 컬럼 뒤 주석
  status order_status not null
);

-- 파서가 무시해야 하는 문장들
alter table public.orders add column ignored boolean;
create index orders_customer_idx on public.orders (customer_id);
