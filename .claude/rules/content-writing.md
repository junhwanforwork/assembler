---
paths:
  - "scripts/**"
  - "src/app/admin/**"
  - "src/app/api/implementations/**"
---

# HowCloud 콘텐츠 작성 규칙

구현(implementation) 콘텐츠를 생성·수정할 때 적용한다.

---

## 1. headline

한 줄, 동사 + 목적어 형식. 기능의 핵심 동작만.

```
✅ "QR 스캔으로 자동 적립"
✅ "카카오 계정으로 1초 로그인"
✅ "날짜·시간·인원 선택 후 즉시 예약확정"
❌ "포인트 적립 기능" (명사 나열)
❌ "스타벅스의 QR 스캔 포인트 적립 시스템" (너무 김)
```

## 2. feature_areas JSONB 구조

```typescript
interface FeatureArea {
  name: string        // "적립 화면" — 기능 영역 이름 (화면/섹션 단위)
  decisions: UIDecision[]
}

interface UIDecision {
  element: string           // "QR 코드 표시 방식" — 어떤 UI 요소
  chosen: string            // "전체 화면 흰 배경" — 선택한 방식
  why: string               // "시야에 잘 들어와 스캔 성공률이 높아요" — UX 원칙 (해요체)
  advantage: string         // "오류율 낮음, 재시도 거의 없음" — 이 선택의 장점
  company_context?: string  // "스타벅스는 하루 수천 건이라 자동화가 필수였어요" — 이 회사 특유의 이유 (선택)
  screenshot_url?: string   // 있을 때만
}
```

### feature_areas 작성 기준

**area 개수:** 2~5개. 화면/단계 단위로 묶는다.
```
포인트 적립: [적립 화면, 완료 화면, 실패 처리]
예약: [날짜 선택, 시간 선택, 예약 확인, 완료/취소]
```

**decisions 개수:** area당 2~6개. UI 요소별 1개 결정.
```
✅ element: "QR 코드 표시 방식"  (구체적 요소)
❌ element: "화면 디자인"         (너무 광범위)
```

**why 작성법 (핵심):**
- UX 원칙을 설명한다. "왜 이게 더 나은가"
- 해요체, 기술 용어 없이
- 20~60자

```
✅ "3개 이하 선택지라 라디오 버튼이 한눈에 들어와요"
✅ "손님이 직접 확인하면 직원 실수를 줄일 수 있어요"
❌ "UX 최적화를 위해 선택함"
❌ "industry best practice에 따라"
```

**company_context 작성 기준:**
- 이 회사·서비스에만 해당하는 이유가 있을 때만 작성
- 없으면 null (억지로 채우지 않는다)
```
✅ "스타벅스는 하루 수천 건 적립이 발생해 자동화가 필수였어요"
✅ "카카오는 전 국민 계정이 있어서 소셜 로그인이 가장 자연스러워요"
❌ "더 나은 UX를 위해서요" (일반적 설명 → why에 넣을 것)
```

## 3. plain_notes

자유 서술. 해요체. 500~1500자.

**포함할 내용:**
- 이 구현 방식을 선택한 전체적인 맥락
- 운영 관점 (직원 교육, 유지보수)
- 사용자 관점 (학습 곡선, 사용 빈도)
- 주의사항

**금지:**
- 기술 용어 (`API`, `DB`, `OAuth`, `endpoint`)
- 합쇼체 (`~합니다`, `~입니다`)

## 4. pros / cons

각 3~5개. 짧은 문장, 해요체.

```
pros: [
  "직원이 따로 조작하지 않아도 돼요",
  "처리 속도가 빠르고 오류가 거의 없어요",
  "손님이 결과를 즉시 확인할 수 있어요"
]
cons: [
  "스마트폰이 없는 고객은 이용할 수 없어요",
  "앱 설치가 전제되어야 해요"
]
```

## 5. best_for

한 문장, 해요체. "~에 맞아요" 형식.

```
✅ "스마트폰 사용에 익숙한 고객이 많은 소규모 카페에 맞아요"
✅ "직원 교육 비용을 줄이고 싶은 매장에 딱이에요"
❌ "모든 카페에 적합합니다"
```

## 6. setup_guide

노코드·직접개발·외주 세 타겟별 가이드.

```typescript
interface SetupGuide {
  target: 'nocode' | 'code' | 'outsource'
  tool?: string       // 'Glide', 'Bubble', 'React', 'Flutter'
  note: string        // 해요체, 구체적 설명
  cost_range?: string // '₩0', '₩100-300만원'
}
```

## 7. device_type별 콘텐츠 포인트

| device_type | 강조할 것 |
|---|---|
| `mobile_app` | 터치 UX, 앱 설치 여부, 오프라인 지원 |
| `web` | 반응형 여부, 로그인 불필요 여부, SEO |
| `kiosk` | 터치 크기, 대기 화면, 네트워크 단절 대응 |
| `tablet_pos` | 직원 워크플로우, 권한 분리 |
| `dashboard` | 데이터 시각화, 필터, 내보내기 |
