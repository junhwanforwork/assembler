-- Seed 데이터

-- 업종
insert into industries (slug, name, icon, description, order_index) values
  ('cafe', '카페', '☕', '카페·커피숍 관련 기능', 1),
  ('gym', '헬스장', '💪', '헬스장·피트니스 센터 관련 기능', 2),
  ('salon', '미용실', '✂️', '미용실·헤어숍 관련 기능', 3),
  ('restaurant', '식당', '🍽️', '식당·음식점 관련 기능', 4),
  ('pt', 'PT샵', '🏋️', '개인 트레이닝·PT 센터 관련 기능', 5);

-- 기능 유형
insert into feature_types (slug, name, description, order_index) values
  ('loyalty', '포인트 적립', '포인트·스탬프 적립 및 관리', 1),
  ('reservation', '예약', '예약·스케줄 관리', 2),
  ('payment', '결제', '결제·주문 처리', 3),
  ('notification', '알림', '푸시·문자 알림', 4),
  ('signup', '회원가입', '회원가입·로그인', 5),
  ('review', '리뷰', '리뷰·평점 관리', 6),
  ('coupon', '쿠폰', '쿠폰·할인 관리', 7),
  ('membership', '회원권', '회원권·정기권 관리', 8);
