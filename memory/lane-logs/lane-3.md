# Lane 3 Work Log

> 레인 3 작업 세션의 기억 전용. **/checkout 때 그 세션의 컨텍스트를 여기 쌓는다(최신이 위).**
> 오케스트레이터의 tickets.md 동기화와 별개 — 티켓 상태가 아니라 "그때 무슨 일이 있었고 뭘 배웠나"를 남긴다.
> 항목 형식은 아래 템플릿 고정. 실수노트는 빈칸 금지 — 없었으면 "없음"이라고 쓴다(회고 생략 방지).

---

<!-- 템플릿 (복사해서 맨 위에 추가)
## YYYY-MM-DD · N차 웨이브 · 티켓
**한 일**
- (완료한 것 — 커밋/파일 단위가 아니라 결과 단위로)
**실수노트**
- (무엇을 잘못 짚었고 → 어떻게 잡았나. 다음 세션이 같은 함정을 피하게)
-->

## 2026-07-03 · 5차 웨이브 · ASM-030 (asm-030-export)
**한 일**
- 구현 컨텍스트 패키징 유틸 `exportContext.ts` TDD(15 유닛) — 선택 기능의 연결 명세만, 재사용/신규 구분(status 기준: active·deprecated=재사용, planned=신규), 고아 참조는 "연결 끊김" 정직 표기.
- ExportModal(+css) 신규 — ui/Modal 재사용, 데이터 자체 조회, 미리보기→복사/.md 다운로드, Confluence·Figma "곧"+사유 툴팁.
- 진입점 2곳 활성화: TopBar disabled 해제 · SpecBulkBar "곧" 툴팁 제거+#34 프리셀렉트(effectiveCheckedIds 스코프).
- e2e 3개(export.spec) + editor-editing 낡은 단언 갱신. /cross-check MEDIUM 2·LOW 4 전부 수정, blocker 0.
**실수노트**
- e2e 실패 주입을 "n번째 GET 실패"로 짰다가 dev StrictMode의 effect 이중 실행 때문에 비결정적으로 깨짐 → **테스트가 켜고 끄는 제어 스위치**(mutable control 객체)로 교체. 카운트 기반 모킹은 dev 서버에서 쓰지 말 것.
- 워크트리에 `.env.local`이 없어 e2e dev 서버가 middleware에서 죽음 → main에서 복사로 해결. **wave-prep에 env 복사 단계 필요**(오케스트레이터에 제안함).
- e2e 포트 3100이 다른 레인 서버에 점유 — reuseExistingServer면 **남의 워크트리 코드로 테스트**하게 됨. 레인마다 E2E_PORT 분리(이번엔 3130).
- `git diff main..HEAD`가 16파일로 나와 놀랐으나, main이 분기 후 전진한 것 — 내 변경 검증은 **merge-base 기준**으로 볼 것.
- 다운로드 anchor를 미부착+동기 revoke로 짰다가 리뷰에서 Safari 간헐 실패 지적 → 부착 후 click·지연 revoke 패턴으로.
- 프리셀렉트를 store 원본 specCheckedIds로 넘겨 필터로 가려진 체크가 샘(QA 지적) → SpecView effectiveCheckedIds로 스코프 통일. 부모가 이미 파생값을 갖고 있으면 store 재구독 말고 prop으로 받을 것.

## 2026-07-02 · 4차 웨이브 · ASM-022 → ASM-026 (asm-026-code-connect)
**한 일**
- ASM-022: 진단 결과 QA 증거가 오진 — files 라우트는 runGenerate→parseGeneratedDesign→parseDesign으로 이미 중복 id를 거부. 경계 추가 대신 **회귀 테스트 2개로 계약 고정**, 뮤테이션 체크(경유 우회 시 red)로 테스트 실효성 증명.
- ASM-026: 수동 싱크-인 — parseSyncPaste(서버 파서 행 단위 재사용, "몇 번째 행이 왜"), CodeConnectModal(붙여넣기/파일 업로드), 싱크 성공 시 스펙 0개면 "메인" 자동 생성 + useCodeTruth.reload. e2e 3개.
- /cross-check HIGH 1(배치 내 중복 행→upsert 21000→500)·MEDIUM 3 전부 수정.
**실수노트**
- 배치 안 conflict key 중복을 안 막아 서버 upsert가 500 나는 걸 QA가 잡음 — **업서트 소비 UI는 배치 내 중복을 경계에서 막을 것**(재시도 안내가 거짓이 됨).
- 비배열 `apis` 키를 조용히 버리는 분기(무음 데이터 드랍)와 fail-open 폴스루를 만듦 → "검증 실패는 반드시 실패로 끝나야 한다", 키가 있으면 형식 오류로 거부.
- 부분 실패(apis 성공·tables 실패) 후 onSynced 미호출로 표면-실제 불일치 → 부분 성공 사실을 카피에 반영 + 닫기 시 재판정.
- T7의 file_generated activity는 빈 자동 생성 스펙에 거짓 기록이라 **의도적으로 workspace_created 유지** — 편차는 보고로 넘김(멋대로 따르지도, 조용히 무시하지도 않기).

## 2026-07-02 · 3차 웨이브 · ASM-020 (asm-020-dashboard)
**한 일**
- 대시보드 언어·정직화: "파일"→"스펙" 개명, 빈 파일 카드 제거(Composer 단일 관문), 죽은 검색·케밥 제거, 로드 실패≠빈 상태(+다시 시도하기), Composer 카피 조건화(useCodeTruth 신설, C-4).
- ui/Modal 프리미티브 신설(포커스 트랩·Esc·백드롭·z 토큰) + CreateProjectModal 이관. e2e 갱신.
**실수노트**
- Modal 포커스 복원 대상을 effect에서 캡처 → 자식 autoFocus가 커밋 중 먼저 포커스를 가져가 복원이 모달 내부를 가리킴(e2e가 잡음) → **렌더 시점 lazy useState로 캡처**.
- 실패 카피를 "네트워크 확인"으로 단정 → 원인 미상(boolean 붕괴)이면 중립 서버 오류 카피로(리뷰 지적). 회사 귀책을 사용자 환경 탓으로 돌리지 말 것.
- z-index 토큰이 없어 globals.css에 신설 — 허용 범위 밖 파일은 최소 추가+보고로 처리(선례).
