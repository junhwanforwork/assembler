# Lane 2 Work Log

> 레인 2 작업 세션의 기억 전용. **/checkout 때 그 세션의 컨텍스트를 여기 쌓는다(최신이 위).**
> 오케스트레이터의 tickets.md 동기화와 별개 — 티켓 상태가 아니라 "그때 무슨 일이 있었고 뭘 배웠나"를 남긴다.
> 항목 형식은 아래 템플릿 고정. 실수노트는 빈칸 금지 — 없었으면 "없음"이라고 쓴다(회고 생략 방지).

---

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
