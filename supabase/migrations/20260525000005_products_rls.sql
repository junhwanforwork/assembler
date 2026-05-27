-- products RLS 보강 — 마이그레이션 4에서 테이블 생성 시 누락된 정책을 채운다.
-- 현재 products 는 RLS 가 꺼져 있어 공개 anon 키로 읽기/쓰기가 모두 가능하다(보안 갭).
-- implementations 와 동일하게: 읽기는 발행분만 공개, 쓰기는 정책 없음 → service_role(어드민)만 가능.
--
-- ⚠️ 적용 전 SUPABASE_SERVICE_ROLE_KEY 를 환경변수에 설정해야 한다.
--    설정 없이 적용하면 어드민 상품 생성(anon 폴백)이 RLS 에 막힌다.

alter table products enable row level security;

create policy "products_public_read" on products
  for select using (is_published = true);
