# Wave 14 일지(SW2) — Storyboard 기능 명세서 뷰 (2026-07-10 통합)

> 웨이브 일지 = 통합 시점의 **판단과 근거** 기록. 티켓의 "무엇을"(tickets.md Done)과 달리
> "왜 그렇게 했나"를 남긴다 — 다음 세션·다음 모델이 결정을 재추론하지 않게.

## 한 줄 요약
Storyboard 하위 "기능 명세서"를 살아있는 3뷰(Table/Card/Node)로 펼치고, 그 위에 요구사항 리스트
(Product Requirement)를, 옆에 상세를 떠 있는 창으로 붙였다. 3레인 병렬·충돌 0으로 첫 순수 레인 웨이브.

## 편성 판단
- 계획(1-abundant-wreath.md)의 SW2 = "기능 명세서 뷰" 묶음을 파일 소유가 상호 배타가 되도록 3레인으로 쪼갬:
  레인1=SpecView(뷰 전환·Table/Card), 레인2=ProductRequirementView(요구사항 리스트·좌 레일 PR 행), 레인3=DetailOverlay(플로팅).
- **겹치는 파일은 `useEditorStore.ts` 하나로 좁혔다** — 세 레인이 각각 distinct 필드만 additive로 추가(specViewMode·preq/preqSelectedId·detailOverlayOpen), `selectSpec*`·`specSelected*`·`inspected` 시그니처는 전 레인 동결. 이 동결 덕에 통합 add/add가 기계적 자동 머지로 끝났다(충돌 0).
- SW2b(문서 family 제거·데이터사전→DB·기술명세 재배치)는 **의도적으로 분리** — 콘텐츠를 옮기기 전에 뷰부터 세워야 고아 콘텐츠가 안 생긴다.

## 핵심 설계 결정과 근거
- **4뷰 = 같은 공유 계약, 렌더만 다름.** Table/Card/Node/디렉토리가 SpecDirectoryView props 세트를 그대로 받는다. 새 shape를 안 만들어 통합 결합면을 0으로. Node는 string id 어댑터(`selectedReq?.id ?? null`)로 기존 SpecTreeView 시그니처에 맞춤.
- **플로팅 상세 = 도킹 우패널의 "추가 표면", 대체 아님.** RightPanel 도킹은 유지하고 SpecInspector(props 3개)를 OverlayPanel(window)로 한 번 더 마운트. 진입은 자동 오픈이 아니라 TopBar 명시 버튼("상세 띄우기") — 도킹과 중복 표시·의도치 않은 팝업 회피.
- **DetailOverlay 마운트 위치 = EditorClient(셸).** 패킷이 CenterView(레인2 DocOverlay 소유)와 충돌 회피용으로 허용한 편차. import 1줄 + 마운트 1줄, 기존 로직 무변경. SpecInspector가 DOM id/anchor를 안 써서 도킹·플로팅 이중 마운트에도 id 충돌 없음(DocView의 anchorPrefix 불필요) — 크로스체크가 실물 확인.
- **읽기 전용 경계.** Table/Card는 선택(selectSpecFeature)만, 직접 편집은 SW3. 이번 뷰들은 유료 발사 0(GET·표시만) — e2e가 design PATCH=0·`/api/**` abort로 강제 단언.

## 머지·정정 판단
- 머지 순서 레인1→2→3, 전부 `--no-ff`. `useEditorStore.ts` add/add는 git ort가 자동 해소(충돌 마커 0 검증). 3레인 필드가 타입·INITIAL·액션 세 블록에 모두 존재함을 grep으로 의미 검증.
- **LOW/MEDIUM 인라인 수정 3건**(방침 feedback-fix-lows-in-wave):
  - 레인2 MEDIUM — 요구사항 제목 `<h2>`가 `<button>` 안(비유효 HTML·낭독기 제목 인식 약화) → `<h2><button>제목</button></h2>` + meta는 형제로. e2e `getByRole("heading")`는 제목 텍스트 유지라 무영향(확인 후 수정).
  - 레인1 LOW×2 — 표 `<th>`에 `scope="col"` 추가 · `<tr>`의 `aria-selected`(정적 table에서 무시됨) 제거(선택 표시는 이름 버튼 `aria-current`로 유지). e2e가 aria-selected 미의존 확인 후 제거.
- **wave-worker.md "cd 금지" 규칙 동봉.** 레인3가 `cd 폴더; 명령` 합친 Bash로 안전 가드 승인 프롬프트를 반복 유발해 검증·커밋이 크게 지연됨(사용자 수동 승인 부담). cwd가 이미 워크트리이므로 cd는 불필요 — 규칙으로 금지. 이 통합 커밋에 포함해 다음 웨이브부터 발효.
- 미룬 LOW 3건(아이콘 의미 불일치=대체 아이콘 부재·unlinkedFeatures 미표시=의도 스코프·이중 포커스트랩=도달 불가) → ASM-075.

## 검증 요약 (실행 출력 그대로)
- `npx tsc --noEmit` → exit 0
- `npm run lint` → exit 0
- `npx vitest run` → Test Files 74 passed (74) / Tests 858 passed (858)
- `npm run build` → Compiled successfully
- e2e(E2E_PORT=3000, 통합 트리 재사용): spec-views·product-requirement·detail-overlay + 회귀(editor-dock·editing·doc-family·journey) → **26 passed / 0 failed**
- hex 하드코딩 0 · diff 내 시크릿/위험 패턴(eval·innerHTML·토큰) 0 · console 신규 0
- 마이그레이션·라우트·API·DB 변경 없음 → 실 DB 스모크 불요

## 배운 것 (프로세스)
- **계약 동결 + distinct additive 필드 = 공유 store 병렬의 정답.** 세 레인이 같은 파일을 건드려도 시그니처를 얼리고 각자 다른 필드만 더하면 add/add는 자동 머지된다. 11차 브리지 파일 패턴의 store 버전.
- **cd 합친 Bash가 레인 속도의 숨은 병목.** 안전 가드(경로 우회 방지)가 `cd; 명령`을 매번 승인 요청으로 막아, 격리 컨텍스트의 이점을 프롬프트 대기로 상쇄했다. 구조적 해결(규칙으로 cd 제거)이 개별 승인보다 낫다.
- **/clear 넘어온 미커밋 작업은 재실행이 아니라 실물 대조로 이어간다.** 레인3가 이전 세션 산출물을 처음부터 다시 하지 않고 검증→커밋으로 마무리(evidence-first 6계명 정신).

## 다음 웨이브에 넘긴 것
- **SW2b**(문서 family 제거·데이터사전→DB 흡수·기술명세 Storyboard 재배치) 또는 **SW3**(필드 직접 수정·필드별 AI 추천/수정·AI 완성도 체크) — 창업자 선택 대기.
- ASM-075(미룬 LOW 3건). 상세 창 진입 아이콘은 전용 info/inspect 아이콘 신설 시 함께.
