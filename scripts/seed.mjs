import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Parse .env.local manually
const envFile = readFileSync('.env.local', 'utf8')
const env = Object.fromEntries(
  envFile.split('\n')
    .filter(l => l && !l.startsWith('#'))
    .map(l => {
      const idx = l.indexOf('=')
      if (idx === -1) return null
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()]
    })
    .filter(Boolean)
)

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ---------------------------------------------------------------------------
// Step 1: Resolve industries
// ---------------------------------------------------------------------------
console.log('📦 1. industries 조회 중...')

const { data: industries, error: indError } = await supabase
  .from('industries')
  .select('id, slug, name')
  .in('slug', ['cafe', 'gym', 'salon'])

if (indError) {
  console.error('❌ industries 조회 실패:', indError.message)
  process.exit(1)
}

const industryMap = Object.fromEntries(industries.map(i => [i.slug, i.id]))
console.log('  ✅ industries:', industries.map(i => `${i.slug}(${i.id.slice(0, 8)})`).join(', '))

const cafeId = industryMap['cafe']
const gymId = industryMap['gym']
const salonId = industryMap['salon']

if (!cafeId || !gymId || !salonId) {
  console.error('❌ 필요한 industry slug가 DB에 없어요. cafe/gym/salon 확인 필요.')
  console.error('  찾은 slugs:', Object.keys(industryMap))
  process.exit(1)
}

// ---------------------------------------------------------------------------
// Step 2: Resolve feature_types
// ---------------------------------------------------------------------------
console.log('📦 2. feature_types 조회 중...')

const { data: featureTypes, error: ftError } = await supabase
  .from('feature_types')
  .select('id, slug, name')
  .in('slug', ['loyalty', 'reservation'])

if (ftError) {
  console.error('❌ feature_types 조회 실패:', ftError.message)
  process.exit(1)
}

const featureTypeMap = Object.fromEntries(featureTypes.map(f => [f.slug, f.id]))
console.log('  ✅ feature_types:', featureTypes.map(f => `${f.slug}(${f.id.slice(0, 8)})`).join(', '))

const loyaltyId = featureTypeMap['loyalty']
const reservationId = featureTypeMap['reservation']

if (!loyaltyId || !reservationId) {
  console.error('❌ 필요한 feature_type slug가 DB에 없어요. loyalty/reservation 확인 필요.')
  console.error('  찾은 slugs:', Object.keys(featureTypeMap))
  process.exit(1)
}

// ---------------------------------------------------------------------------
// Step 3: Upsert products
// ---------------------------------------------------------------------------
console.log('📦 3. products upsert 중...')

const productsToInsert = [
  {
    slug: 'starbucks',
    name: '스타벅스',
    brand_color: '#00704A',
    logo_url: null,
    industry_id: cafeId,
    website_url: 'https://www.starbucks.co.kr',
    description: '국내 1위 커피 프랜차이즈',
    is_published: true,
  },
  {
    slug: 'gymbox',
    name: '짐박스',
    brand_color: '#FF5B00',
    logo_url: null,
    industry_id: gymId,
    website_url: null,
    description: '헬스장 관리 앱',
    is_published: true,
  },
  {
    slug: 'kakao-hair',
    name: '카카오헤어샵',
    brand_color: '#FFE600',
    logo_url: null,
    industry_id: salonId,
    website_url: 'https://hairshop.kakao.com',
    description: '카카오 미용실 예약 서비스',
    is_published: true,
  },
]

const { data: insertedProducts, error: prodError } = await supabase
  .from('products')
  .upsert(productsToInsert, { onConflict: 'slug' })
  .select('id, slug, name')

if (prodError) {
  console.error('❌ products upsert 실패:', prodError.message)
  process.exit(1)
}

const productMap = Object.fromEntries(insertedProducts.map(p => [p.slug, p]))
console.log('  ✅ products:', insertedProducts.map(p => `${p.slug}(${p.id.slice(0, 8)})`).join(', '))

const starbucks = productMap['starbucks']
const gymbox = productMap['gymbox']
const kakaoHair = productMap['kakao-hair']

// ---------------------------------------------------------------------------
// Step 4: Upsert implementations
// ---------------------------------------------------------------------------
console.log('📦 4. implementations upsert 중...')

const implementationsToInsert = [
  // Starbucks 포인트 적립
  {
    product_id: starbucks.id,
    industry_id: cafeId,
    feature_type_id: loyaltyId,
    headline: 'QR 스캔으로 자동 적립',
    device_type: 'mobile_app',
    tags: ['포인트', 'QR', '자동화'],
    is_published: true,
    plain_notes: `스타벅스는 하루 수천 건의 적립 요청이 발생해요. 직원이 금액을 수동으로 입력하면 실수가 생기고 줄이 길어져요. QR 스캔 방식은 손님이 직접 화면을 열어서 보여주면 단말기가 자동으로 계산하기 때문에 오류율이 거의 없어요. 또한 손님 입장에서도 직원에게 별도로 요청할 필요가 없어서 편해요.`,
    pros: ['직원 개입 없이 자동 처리돼요', '오류율이 매우 낮아요', '처리 속도가 빨라요'],
    cons: ['스마트폰이 없는 고객은 사용할 수 없어요', '앱 설치가 필수예요'],
    best_for: '스마트폰에 익숙한 고객이 많은 카페에 딱이에요',
    setup_guide: [
      { target: 'nocode', tool: 'Glide', note: 'QR 코드 생성 기능이 내장돼 있어요. 포인트 계산 로직은 Glide 시트로 연결하면 돼요.', cost_range: '₩0~월 ₩25,000' },
      { target: 'code', tool: 'React Native', note: 'expo-barcode-scanner 라이브러리로 QR 스캔을 구현할 수 있어요.', cost_range: '₩0' },
      { target: 'outsource', note: '포인트 적립 모듈 개발은 보통 ₩300~500만원 선이에요.', cost_range: '₩300~500만원' },
    ],
    feature_areas: [
      {
        name: '적립 화면',
        decisions: [
          {
            element: 'QR 코드 표시 방식',
            chosen: '전체 화면 흰 배경',
            why: '시야에 잘 들어와 스캔 성공률이 높아요',
            advantage: '오류율 낮음, 재시도 거의 없음',
            company_context: '스타벅스는 하루 수천 건이라 자동화가 필수였어요',
            screenshot_url: null,
          },
          {
            element: '완료 표시',
            chosen: '숫자 + 팝업 애니메이션',
            why: '시각적 피드백이 확인을 빠르게 해요',
            advantage: '손님 만족도 높음',
            company_context: null,
            screenshot_url: null,
          },
        ],
      },
      {
        name: '실패 처리',
        decisions: [
          {
            element: '스캔 실패 안내',
            chosen: '재시도 버튼 + 안내 문구',
            why: '손님이 당황하지 않고 바로 해결할 수 있어요',
            advantage: '직원 호출 빈도 감소',
            company_context: null,
            screenshot_url: null,
          },
        ],
      },
    ],
  },

  // 짐박스 수업 예약
  {
    product_id: gymbox.id,
    industry_id: gymId,
    feature_type_id: reservationId,
    headline: '달력으로 날짜 선택 후 수업 즉시 확정',
    device_type: 'mobile_app',
    tags: ['예약', '달력', '수업'],
    is_published: true,
    plain_notes: `헬스장 수업 예약은 마감 시간과 정원이 핵심이에요. 달력 뷰를 먼저 보여주면 어느 날에 수업이 있는지 한눈에 알 수 있어요. 날짜를 고르면 해당 날짜의 수업 목록이 나오고, 정원이 남은 수업만 선택할 수 있어요. 예약 완료 즉시 확정 문자를 보내서 손님이 불안하지 않게 해요.`,
    pros: ['마감된 수업이 명확하게 표시돼요', '즉시 확정으로 손님이 안심해요', '운영자가 별도로 확인할 필요 없어요'],
    cons: ['달력 구현이 복잡해요', '수업 취소 정책이 별도로 필요해요'],
    best_for: '정원이 정해진 그룹 수업이 있는 헬스장에 맞아요',
    setup_guide: [
      { target: 'nocode', tool: 'Glide', note: '달력 컴포넌트가 내장돼 있어요. 수업 시트와 연결하면 바로 예약 시스템이 돼요.', cost_range: '₩0~월 ₩25,000' },
      { target: 'code', tool: 'React + FullCalendar', note: 'FullCalendar 라이브러리로 쉽게 구현할 수 있어요.', cost_range: '₩0' },
      { target: 'outsource', note: '예약 시스템 개발은 보통 ₩400~600만원 선이에요.', cost_range: '₩400~600만원' },
    ],
    feature_areas: [
      {
        name: '날짜 선택',
        decisions: [
          {
            element: '날짜 선택 방식',
            chosen: '월별 달력 뷰',
            why: '이번 달 전체 수업 일정을 한눈에 볼 수 있어요',
            advantage: '예약 가능 날짜 파악이 쉬움',
            company_context: null,
            screenshot_url: null,
          },
        ],
      },
      {
        name: '수업 선택',
        decisions: [
          {
            element: '정원 표시',
            chosen: '잔여 자리 수 + 마감 배지',
            why: '급해서 빨리 예약해야 한다는 동기를 줘요',
            advantage: '마감 직전 예약률 상승',
            company_context: '짐박스는 인기 수업이 당일 마감되는 경우가 많아요',
            screenshot_url: null,
          },
        ],
      },
    ],
  },

  // 카카오헤어샵 예약
  {
    product_id: kakaoHair.id,
    industry_id: salonId,
    feature_type_id: reservationId,
    headline: '디자이너 선택 후 원하는 시간 바로 예약',
    device_type: 'mobile_app',
    tags: ['예약', '디자이너', '시간 선택'],
    is_published: true,
    plain_notes: `미용실 예약에서 가장 중요한 건 "누구한테 받느냐"예요. 카카오헤어샵은 디자이너 프로필을 먼저 보여주고, 마음에 드는 디자이너를 선택한 다음 가능한 시간을 고르는 흐름이에요. 디자이너 포트폴리오(전후 사진)를 보고 결정할 수 있어서 만족도가 높아요.`,
    pros: ['디자이너를 먼저 선택할 수 있어요', '포트폴리오로 스타일 확인이 가능해요', '카카오 계정으로 바로 예약해요'],
    cons: ['원하는 디자이너가 바쁘면 대안 탐색이 번거로워요'],
    best_for: '단골 디자이너가 있는 고객이 많은 미용실에 맞아요',
    setup_guide: [
      { target: 'nocode', tool: 'Glide', note: '디자이너 목록을 시트로 관리하고, 예약 폼을 연결하면 돼요.', cost_range: '₩0~월 ₩25,000' },
      { target: 'code', tool: 'Next.js', note: 'Supabase로 디자이너·예약 관리, 카카오 로그인 연동이 필요해요.', cost_range: '₩0' },
      { target: 'outsource', note: '디자이너 포트폴리오 포함 예약 시스템은 ₩500~800만원 선이에요.', cost_range: '₩500~800만원' },
    ],
    feature_areas: [
      {
        name: '디자이너 탐색',
        decisions: [
          {
            element: '디자이너 목록 표시',
            chosen: '프로필 사진 + 전문 스타일 태그',
            why: '한 줄 설명만으론 스타일을 알기 어려워요. 사진이 결정을 도와요',
            advantage: '결정 시간 단축, 만족도 상승',
            company_context: '카카오는 전국 디자이너 수가 많아 태그 필터가 필수예요',
            screenshot_url: null,
          },
        ],
      },
      {
        name: '시간 선택',
        decisions: [
          {
            element: '예약 시간 선택 방식',
            chosen: '30분 단위 시간 슬롯 그리드',
            why: '전체 가능 시간을 한눈에 보고 고를 수 있어요',
            advantage: '예약 완료 시간 단축',
            company_context: null,
            screenshot_url: null,
          },
        ],
      },
    ],
  },
]

// Upsert using product_id + feature_type_id as conflict target
// Supabase upsert requires a unique constraint — we'll do it manually:
// fetch existing by (product_id, feature_type_id) then insert or update

for (const impl of implementationsToInsert) {
  const { data: existing, error: fetchErr } = await supabase
    .from('implementations')
    .select('id')
    .eq('product_id', impl.product_id)
    .eq('feature_type_id', impl.feature_type_id)
    .maybeSingle()

  if (fetchErr) {
    console.error(`❌ implementation 조회 실패 (${impl.headline}):`, fetchErr.message)
    process.exit(1)
  }

  if (existing) {
    const { error: updateErr } = await supabase
      .from('implementations')
      .update(impl)
      .eq('id', existing.id)

    if (updateErr) {
      console.error(`❌ implementation 업데이트 실패 (${impl.headline}):`, updateErr.message)
      process.exit(1)
    }
    console.log(`  ✅ [업데이트] ${impl.headline} (${existing.id.slice(0, 8)})`)
  } else {
    const { data: inserted, error: insertErr } = await supabase
      .from('implementations')
      .insert(impl)
      .select('id')
      .single()

    if (insertErr) {
      console.error(`❌ implementation insert 실패 (${impl.headline}):`, insertErr.message)
      process.exit(1)
    }
    console.log(`  ✅ [신규] ${impl.headline} (${inserted.id.slice(0, 8)})`)
  }
}

console.log('\n🎉 시드 완료!')
