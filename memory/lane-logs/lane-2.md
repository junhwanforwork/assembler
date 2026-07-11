# Lane 2 Work Log

> 레인 2 작업 세션의 기억 전용. **/checkout 때 그 세션의 컨텍스트를 여기 쌓는다(최신이 위).**
> 오케스트레이터의 tickets.md 동기화와 별개 — 티켓 상태가 아니라 "그때 무슨 일이 있었고 뭘 배웠나"를 남긴다.
> 항목 형식은 아래 템플릿 고정. 실수노트는 빈칸 금지 — 없었으면 "없음"이라고 쓴다(회고 생략 방지).

---

## 2026-07-11 · 16차 웨이브(Wave B) · ASM-081 (AI 제안 3dot 메뉴)
**한 일**: 상시 SuggestionsCard→아이템 3dot 메뉴(SpecItemMenu, Popover+MoreVerticalIcon). suggestions 로컬 state→store 승격(additive 4필드+4액션, 유료결과 유실 방지). 4개 스펙 뷰에 3dot 앵커. 유료=명시 "분석하기" 1곳만.
**실수노트**(REPORT 수집): ① 3dot 트리거 aria-label에 **아이템 표시명**("로그인 기능…메뉴")을 넣었더니 이름 기반 셀렉터(getByRole name:/로그인 기능/)와 strict-mode 충돌 → 종류 기준("요구사항"/"기능") 라벨로 전환(정직 해소, 테스트 무력화 아님). **교훈: 이름 기반 셀렉터가 많은 코드베이스에서 per-row 버튼 추가 시 표시명 임베드 금지.** ② 3dot 절대배치를 IconButton에 얹어 Popover 앵커 span이 0크기로 접힘 → 바깥 래퍼(앵커)에 배치. ③ 전체 e2e 회귀 격리(git stash -u baseline)로 10건이 내 것임을 확인 후 해소. **통합 관찰(오케스트레이터)**: 3dot이 아이템별인데 제안 내용은 워크스페이스 전역 — 아이템별 맥락 제안은 후속(제품 결정).

## 2026-07-10 · 15차 웨이브(Wave A) · ASM-077 (상세 플로팅 자동 오픈 + 내용 강화)
**한 일**: DetailOverlay가 선택 시 자동 오픈(로컬 effect, 기본 꺼짐) + InspectorSpecPanels "트리에서 열기"(useSpecJump+setSpecViewMode). specAutoOpen 순수 로직 TDD. Ask AI 버튼은 소비자 없어 "거짓 버튼" 되므로 다음 웨이브로 연기(트리 링크만).
**실수노트**(REPORT 수집): ① **모달 오버레이를 "선택마다 자동 오픈"으로 바꾸면 상시 도킹 패널·도크가 백드롭에 막힌다** — "비차단"이라 적힌 프리미티브도 실제 구현(aria-modal·pointer-events)을 확인해야(주석≠동작, evidence-first #5). 통합 이슈로 정직 신고 → 오케스트레이터가 OverlayPanel 비모달 모드로 해소. ② 비클릭 syncSpecSelection이 로드 시 첫 요구사항 자동선택 → 순진한 "선택 변화=오픈"은 로드 때 뜸. 처음엔 sticky inspected 게이트로 막았으나 크로스체크가 "닫은 뒤 필터 보정 재오픈" 결함 지적 → **통합에서 store 클릭 카운터(nonce)로 교체**(정답). ③ 회귀 격리는 앱 파일만 base checkout·커밋 후 실험(미커밋 유실 0).

## 2026-07-10 · 14차 웨이브(SW2) · ASM-073 (Product Requirement 리스트)
**한 일**: 요구사항 리스트 뷰(ProductRequirementView) — 요구사항 카드 + 소속 기능 펼침, 기능 클릭 시 명세서 점프(useSpecJump 재사용·필터 가드 공유), docProjection.projectDoc 재사용(저장 0). 좌 레일 PR 행 최상단 + 그룹명 "문서·md"→"문서". store EditorView += "preq"·preqSelectedId additive. e2e 격리 3132 · 인접 회귀 12 통과.
**실수노트**(REPORT 수집): e2e 초안이 뷰 제목("Product Requirement")을 heading 역할로 단언 → 실제는 viewTitle span이라 실패(요구사항 제목만 h2). 기능 버튼도 우패널 fcard와 이름 충돌 → main 스코프로 정정. 교훈: 로케이터는 실물 DOM 확인 후 정밀화(evidence-first). 통합 크로스체크 MEDIUM 1건(요구사항 제목 h2가 button 안 — 낭독기 제목 인식 약화)은 통합에서 h2>button 구조로 인라인 수정.

## 2026-07-09 · 13차 웨이브 · ASM-069 (정책 문서 FE + 참조 호버)
**한 일**: 좌 레일 "정책 문서" 그룹 + PolicyView(작성/편집/삭제/md 다운로드) + usePolicyDoc 브리지(공유 store, PolicyDoc 로컬 스텁) + 본문 참조 API·DB 호버 시 12차 해석 카드(ApiNoteTip/로컬 TableRefTip, GET 전용). store additive("policy"·policySelectedId). 재하달 4건(삭제 확인 다이얼로그·라벨 method 병기·aria-current·DB 호버 e2e) 마감. 크로스체크 조건부→재검증 APPROVE + QA PASS.
**실수노트**(REPORT 수집): 별도 섹션 없음. 재하달로 잡힌 것 — 삭제가 확인 없는 단일 클릭이었음(button.md "확인 없이 삭제" 금지 위반, 데이터 유실). 교훈: 파괴적 액션은 처음부터 확인 다이얼로그+"영구 삭제하기" 페어링. 참조 목록 라벨은 endpoint만이면 GET/POST 구분 불가 → method 병기. 통합 LOW 정정: 불리언 isConfirmingDelete 네이밍·저장 중 입력 disabled(리마운트 소실 방지).

## 2026-07-09 · 12차 웨이브 · ASM-065 (문서 오버레이 창 + 좌 레일 문서 패밀리)
**한 일**: OverlayPanel variant="window" 첫 소비 — DocOverlay(TopBar "문서 띄우기" 진입, CenterView 마운트)·좌 레일 "문서" ▾ 하위 3행(PRD·기술명세·데이터사전)·docKind store 승격(additive). 본문 3종 export 재사용, 기술명세 API 인라인 해석 블록 원위치 보존(통합 ApiNoteTip 교체 지점). 재하달 3건 마감(목차 점프 접두사 분리+회귀 e2e·aria-current·수치 정정). 크로스체크 APPROVE(재검증 포함)+QA PASS.
**실수노트**(REPORT 수집): 별도 실수노트 섹션 없음. 재하달로 잡힌 것 2건 — ① 중앙 뷰+오버레이 동시 렌더 시 DOM id 중복으로 TOC 점프가 가려진 중앙으로 감(QA MED, 접두사 주입으로 해소) ② 첫 REPORT 검증 수치 "5 skipped"가 부분 실행값(실측 8) — evidence-first 4계명: 전 스위트 재실행 출력을 그대로 복사할 것. 편차: DocOverlay 마운트를 TopBar 대신 CenterView로(문서 데이터 보유자, EditorClient가 소유 밖).

## 2026-07-08 · 11차 웨이브 · ASM-061 (본 작업 + 정정 3건)
**한 일**: repo-scan 라우트+repo-clone lib(URL 화이트리스트 40케이스·클론·워커·조립)+정정(blob 캡·최소 env·길이 상한). 단위별 TDD 커밋 6개.
**실수노트**(REPORT 수집): ① 프루닝과 파일 보고를 한 테스트에 뭉침 — 설계 의도 분리는 테스트 설계 시점에 ② 전역 ProcessEnv 증강(NODE_ENV 필수)을 예상 못 해 tsc 2회 실패. 참고: 작업 중 도착한 보충(프루닝 정직 보고) 미이행 — 통합이 반영(4회째 패턴).

## 2026-07-08 · 10차 웨이브 · ASM-057 (본 작업 + 정정 4건)
**한 일**: InsightCard+db-learning 구조화(고립 클램프·폴백 정직)+note-codec 봉투(스키마 제약 우회)+노트 캐시. 패킷의 잘못된 스키마 전제(jsonb)를 발견해 봉투로 해결.
**실수노트**(REPORT 수집): placeholder 파일 실수 생성 즉시 삭제(커밋 오염 0). 참고: 작업 중 도착한 보충 지시 2건을 보고 전 재확인에서 누락(2회째 패턴 — 프로세스 기록).

## 2026-07-07 · 9차 웨이브 · ASM-054
**한 일**: 기술 명세·데이터 사전 투사(TDD 25케이스)+문서 종류 pill+인라인 해석+X-07 해소. 크로스체크 APPROVE·QA PASS.
**실수노트**: 없음 — 단 REPORT에 실수노트 섹션 자체가 누락됨(고정 포맷 위반, 기록 차원).

## 2026-07-06 · 8차 웨이브 · ASM-046 (본 작업 + QA 정정 3건)
**한 일**: 변경 계획 store 승격(무언 대체·접힘 무신호·이탈 소멸 3경로 해소) → QA 정정(planSeq 리마운트·clearActivePlan identity 가드·소유 렌더 필터). 재검증 APPROVE.
**실수노트**(REPORT에서 오케스트레이터 수집): 없음 (2회 보고 모두) — 단 참고: 1차 구현이 "보이는 쪽"만 막고 쓰기 측(receivePlan)을 안 막아 보안 리뷰 HIGH로 재발견, 통합 정정으로 마감(currentWorkspaceId 가드).
