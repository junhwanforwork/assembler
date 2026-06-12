-- 시드: 카카오헤어샵에 edge_cases 3건, 모든 시드 impl 에 source_url 채움 (시각 검증용)

update implementations
set edge_cases = '[
  {"case": "위치 권한 거부", "handling": "기본 위치(서울)로 디자이너 검색 + 권한 안내 배너 노출"},
  {"case": "예약 마감된 시간 클릭", "handling": "회색 처리 + 클릭 시 \"대기 등록\" 옵션 안내"},
  {"case": "결제 직전 디자이너 휴무 처리", "handling": "실시간 상태 체크 + 변경 안내 모달 + 다른 시간 추천"}
]'::jsonb,
source_url = 'https://www.kakaocorp.com/page/service/service/HairShop'
where id = '622fee60-afdd-47a9-a195-bdf50f229b49';

update implementations
set source_url = 'https://gymbox.co.kr'
where id = 'b984bede-8816-48f2-a9e8-ee396cde2455';

update implementations
set source_url = 'https://www.starbucks.co.kr/mso/sirenorder/sirenOrderHowToGoodsInfo.do'
where id = '2728bc39-1a9c-4758-a976-733d0bacf4e1';
