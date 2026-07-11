# Wave 17 일지 — 스토리보드 편집 완성 (2026-07-11 통합)

> 티켓(무엇을)은 `memory/tickets.md`. 이 일지는 **왜**(판단·근거)를 남긴다.
> 통합 브랜치 `integrate/wave-17` · 안전 태그 `wave-17-pre`.

## 한 줄 요약

기능 명세서를 "읽기만"에서 **실제 편집 가능**으로: 제목·설명 클릭 인라인 편집(ASM-084) + 구현/변경/역할별 확인 설정(ASM-085). 토대(빌더·InlineEditText)는 오케스트레이터가 선행 구현(ASM-083)하고 A·B를 그 위에 병렬로 돌렸다.

## 편성 판단 — 직렬 의존을 오케스트레이터 선행으로 흡수

편집 완성은 세 조각인데 **A·B가 공통 토대(편집 빌더·InlineEditText·saveCtx 배선)에 의존**한다. 셋을 그냥 병렬로 던지면 A·B가 스텁을 자작(계약 표류)하거나 토대가 흔들린다. 그래서 토대(ASM-083)를 **오케스트레이터가 직접** 먼저 구현·머지하고, A·B는 그 머지본에서 브랜치를 떠 순수 소비만 하게 했다. A·B는 파일이 안 겹쳐(레인1=InspectorSpecPanels·editor-editing.spec / 레인2=FeatureStatusControls·feature-status.spec) 충돌 0. FeatureStatusControls는 레인 0이 **프롭 계약을 동결한 스텁(return null)**으로 심고 FeaturePanel에 마운트만 해둬, 레인 2는 파일 하나를 채우고 레인 1은 그 마운트 줄만 안 건드리면 되게 했다(11차 계약 동결 패턴의 축소판).

## 핵심 설계 결정과 근거

- **무변경 스킵을 컴포넌트에서도 막는다(이중 방어).** 빌더가 무변경 시 `null`을 반환하는데, 그걸 그대로 `patchDesignScoped`에 태우면 `{ok:false, kind:"stale"}`로 변환돼 **정상 no-op이 가짜 에러**로 보인다. 그래서 InlineEditText/FeatureStatusControls 둘 다 저장 호출 **전에** 현재 값과 비교해 같으면 호출 자체를 건너뛴다(PATCH 0). 빌더 null 가드는 409 재적용 등 방어 심층화용으로 남긴다.
- **서버 enum 가드 없음 → 클라 Select가 유일 가드.** validate.ts 정규화는 unknown 필드를 spread로 보존만 하고 status/impl enum을 검증하지 않는다(탐사 확인). 새 필드(implStatus/changeStatus/reviews)가 저장 통과하는 근거이자, 값의 정합은 Select 옵션이 유일하게 책임진다는 뜻. 자유 입력 경로가 없어 현재는 안전.
- **not_checked = 역할 키 삭제.** 리뷰 "미확인"을 값으로 저장하지 않고 reviews에서 키를 지워 ReviewBadges가 다시 "—"로 복원되게 했다(표시 계약과 정합).
- **InlineEditText = useInlineAdd 미러.** 새 패턴을 만들지 않고 기존 인라인 추가(열기/저장중/실패/포커스 복원)의 편집판으로 복제 — 표시(클릭→편집)↔편집만 추가.

## 머지·정정 판단

- 파일 겹침 0이라 머지 충돌 0(레인1 먼저·레인2 나중, 순서 무관).
- 크로스체크 4건 전부 blocker 0. LOW 2건은 **통합 인라인 수정**(feedback-fix-lows-in-wave): ① FeatureStatusControls 저장 실패 카피에 해결 절 추가(오해 소지 제거) ② InspectorSpecPanels 빈 설명 카피에 "눌러서 추가" 힌트.
- **미룬 것(ASM-086, 사유 있음):** InlineEditText 표시 버튼 접근명이 aria-label로 덮여 스크린리더가 값을 못 읽는 a11y LOW — 고치려면 ASM-084 e2e 로케이터(`name:"…편집"`)를 동반 수정해야 해 통합서 보류. e2e 커버리지 갭(Feature/DetailFeature 편집·실패 UI·409·논의필요 상태)도 함께 백로그.

## 검증 요약 (실행 출력 그대로)

- `npx tsc --noEmit` → 0
- `npm run lint` → 0
- `npm test` (vitest) → **916 passed** (76 파일) — 레인 0 빌더 유닛 26 포함
- `npm run build` → 성공
- `npx playwright test` (전체) → **70 passed / 0 failed / 8 skipped** — 신규 11(ASM-084 4 + ASM-085 7)
- 하드코딩 hex → 0 · 시크릿 → 0

## 배운 것 (프로세스)

- **직렬 의존 웨이브 = 오케스트레이터 선행 토대 + 병렬 소비.** 토대를 먼저 머지하면 소비 레인이 스텁 표류 없이 실물을 import만 한다. 스텁은 "프롭 계약 동결 + 마운트만"으로 최소화해 소비 레인 간 파일 충돌을 0으로 만들 수 있다.
- **무변경/취소를 저장 계층이 아니라 입력 계층에서 판정**해야 정상 no-op이 가짜 에러로 안 샌다(빌더 null→stale 변환 함정).

## 다음 웨이브에 넘긴 것

- ASM-086: a11y(편집 버튼 값 접근명) + e2e 커버리지 확장.
- 18차부터 **레인 3까지 3레인 편성**(창업자 지시 2026-07-11). 후보: 연결 편집(레인 C)·PRD 재정의·사용자 플로우·코멘트 백엔드.
