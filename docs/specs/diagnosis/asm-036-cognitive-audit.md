# ASM-036 · 디자인 인지 진단 리포트 (1단계 — 승인 대기)

> 진단: 2026-07-05, main 811d443 기준 · 렌즈 2 병렬 — **V**=ui-ux-designer(시각: 위계·색·타이포·대비) / **X**=assembler-design(구조: 시선 흐름·상태·인지 부하)
> 규율: 전 항목 파일:라인 실측 재검증 · [ux-audit.md](../ux-audit.md) 기지 사항 dedup(하단 메모) · 기준선 [ux-references.md](../ux-references.md) · 원칙 [ux-strategy.md](../ux-strategy.md)
> 확정 디자인 방향: 중성 블랙(#1e1e1e/#2b2b2b)+블루 브랜드(filled·인터랙션에만) · 플로팅 라운드 · 그라데이션 금지 · 하드코딩 금지
> **2단계 실행은 사용자 top-N 승인 후.** "실행 소유" 열: `레인`=이 레인 소유 범위(CSS·시각 TSX) 안에서 2단계 실행 가능 / `티켓`=로직·소유 밖 — 오케스트레이터 티켓 신설 권고.

## 종합 판정

> 여정·프리미티브 공사(3~7차)는 자리를 잡았다 — 이번에 나온 것은 **그 위에 얹힌 위계의 역전**이다.
> 화면 최강조(filled 브랜드)가 죽은 버튼에 가 있고(V-07/X-01), 제품 차별 자산인 연결선은 대비 1.26:1로 비가시이며(V-01),
> 가장 긴 글을 읽는 표면이 컨트롤용 13px을 쓰고(V-03), 같은 인스펙터가 선택 대상에 따라 제목 20px↔15px로 널뛴다(V-02).
> 구조 쪽 최중증은 **승인 관문의 신뢰 누수** — 미적용 변경 계획이 3경로에서 무언 소멸하고(X-02), diff가 raw 필드명·id를 노출한다(X-03).
> 토큰 규율은 유지 중이나 duration·z-index·soft 배경·참조 칩에서 방언이 다시 축적되고 있다(V-08·13·14).

## 발견 요약표 (우선순위순)

| id | 발견 | 렌즈 | 심각도 | 공수 | 실행 소유 |
|---|---|---|---|---|---|
| V-01 | 플로우 엣지 대비 1.26:1 — 연결선 비가시 | 정보 위계 | HIGH | S | 레인 |
| V-07/X-01 | 유일 filled=죽은 "공유하기"(사유 툴팁 無), 내보내기·쓰기 경로는 저강조 | 위계/시선 | HIGH | S | 레인 |
| V-03 | 읽기 본문(PRD·문서·챗)이 전부 label 13px — 크롬보다 작은 본문 | 인지 부하 | HIGH | S | 레인 |
| V-02 | 공용 인스펙터 제목 20px↔15px·패딩 28↔18px 이원화 | 정보 위계 | HIGH | S | 레인 |
| X-02 | 미적용 변경 계획 3경로 무언 소멸(대체·접힘·이탈) | 인지 부하 | HIGH | M | 티켓 |
| X-03 | 승인 diff가 raw 필드명·id·JSON 노출 — 비개발자 결정 표면에 내부 언어 | 인지 부하 | HIGH | M | 티켓 |
| V-04 | `--text-muted` #7a7a7a = AA 미달(3.3~3.9:1), 정책 문구까지 11px+muted 이중 감쇠 | 인지 부하 | MED | S | 레인 |
| V-05 | PriorityBars: med/low 시각 동일 + high 브랜드색 단독 지시(거짓 게이지) | 정보 위계 | MED | S | 레인 |
| V-06 | DataView 읽기전용 고지 3중 반복 + 위계 다른 세그 2단 동일 시각 | 인지 부하 | MED | M | 레인 |
| V-08 | 참조 칩 3벌(ui/Chip·impactChip·target) — 프리미티브 재발명 재발 | 인지 부하 | MED | M | 레인 |
| V-09/X-04 | suggestions 두 집·두 정책 — 도크는 포커스만으로 유료 자동 호출, 카드는 명시 버튼 | 시선/부하 | MED | M | 티켓 |
| V-10 | 파괴 확인 "버리기"가 브랜드 filled — 진행/폐기가 같은 색·같은 자리 | 인지 부하 | MED | S | 레인 |
| X-05 | 선택→인스펙터 규칙 불일치 — 테이블은 우패널 펴줌, 와이어 요소는 무언 no-op | 시선 흐름 | MED | S | 티켓(store) |
| X-06 | FlowView 노드만 인스펙터 미배선 — #44 확정인데 주석은 "정의 대기" | 시선 흐름 | MED | M | 티켓 |
| X-07 | SpecView 도큐먼트 서브뷰 = DocView 저해상도 복제(B-1 패턴 재발) | 정보 위계 | MED | S~M | 티켓(결정 필요) |
| X-08 | 좌 레일 뱃지 단위가 행마다 다른데 무라벨(문서=req수·플로우=엣지수·와이어=페이지수) | 인지 부하 | MED | S | 레인 |
| V-11 | 플로우 노드마다 브랜드 도트 — 장식 반복, hover 강조 변별력 희석 | 색 사용 | LOW | S | 레인 |
| V-12 | 좌 레일 그룹 헤더 2방언(.treeGroupHead vs .tcommon) | 정보 위계 | LOW | S | 레인 |
| V-13 | 토큰 밖 잔여: z-index 2건·radius 1건·soft 배경 color-mix 우회·죽은 CSS 2블록 | 드리프트 | LOW | S | 레인 |
| V-14 | duration 리터럴 22선언(B-6 지적 후 8→22 증가) | 드리프트 | LOW | S | 레인 |
| V-15 | 챗 도크 입력이 단일행 input — 복문 요청 표면과 불일치(Composer는 textarea) | 인지 부하 | LOW | M | 티켓 |
| X-09 | 명세 좁히기 컨트롤 분산(필터=헤더·검색=미니레일) + "전체 보기" 상태/액션 이중성 | 시선 흐름 | LOW | S | 레인 |
| X-10 | 패널 토글 라벨이 상태 무관 "접기" 고정·aria-expanded 없음·펴기 어포던스 반대편 | 부하/접근성 | LOW | S | 레인 |
| X-11 | 수용 기준 disabled 체크박스 — 순수 장식의 거짓 어포던스 | 인지 부하 | LOW | S | 레인 |
| X-12 | "최근 활동"이 프로덕트 전역 스코프인데 스코프 라벨 없음 | 인지 부하 | LOW | S | 레인 |
| X-13 | 플로우·와이어 빈 상태가 "어떻게 채우는지"(챗 도크) 안내 결락 | 인지 부하 | LOW | S | 레인 |
| X-14 | Avatar "J" 하드코딩 — 가짜 로그인 신호 | 인지 부하 | LOW | S | 레인 |

## HIGH 상세

### [V-01] 유저플로우 엣지가 사실상 비가시 — 차별 자산이 화면 최약 요소
- 표면: FlowView 캔버스 · SpecTreeView(동일 문법) / 파일: `src/components/editor/views/FlowView.tsx:47,53` · `src/app/globals.css:22-23` · `SpecTreeView.tsx:52`
- 문제: 비활성 엣지 stroke=`--border`(rgba 255,255,255,.08) → #1e1e1e 위 합성 대비 **≈1.26:1**, 화살표(`--border-strong` .2)도 ≈1.9:1 — WCAG 1.4.11 비텍스트 3:1 미달. 도트 그리드와 같은 색이라 연결선이 배경에 묻혀 "연결 그래프"가 "떠 있는 카드들"로 읽힌다. 북극성("모든 요소는 연결된다")의 시각 증거 상실.
- 제안: 엣지 전용 토큰 `--edge: rgba(255,255,255,0.28)` 신설(또는 border-strong 이상 상향) + 화살표 `--text-muted`급. hover 브랜드 강조 유지. 공수 S.

### [V-07/X-01] TopBar 위계 역전 — 유일 filled가 영구 disabled "공유하기"
- 표면: 에디터 TopBar ↔ ChatDock / 파일: `src/components/editor/TopBar.tsx:60-66` · `dock/ChatDock.tsx:140-152` · `editor.module.css:1321-1331` · `useEditorStore.ts:75`
- 문제: 화면 유일 브랜드 filled 슬롯을 상시 disabled "공유하기"가 점유 — 사유 툴팁도 없어 B-13 방언 잔존(코멘트 탭·ExportModal은 aria-disabled+사유 툴팁 문법). 배선된 유일 산출 액션 "내보내기"는 ghost, 북극성 핵심 행위(변경 요청)의 문인 챗 도크는 기본 접힘의 저채도 1줄. button.md "filled=화면 주요 액션 1개"와 정면 충돌.
- 제안: 공유하기 ghost 강등+사유 툴팁(기존 문법 재사용, 또는 배선 전 숨김) · 내보내기 filled 승격 · 도크 인풋에 포커스/브랜드 어포던스 부여. 공수 S.

### [V-03] 읽기 본문 전부가 컨트롤용 13px — 크롬이 본문보다 크다
- 표면: DocView·SpecView 도큐먼트 뷰·ChatDock 메시지·인스펙터 본문 / 파일: `editor.module.css:838,866,876-878,745,758,1413,670` (전부 `--font-size-label`)
- 문제: 스케일에 body(14.5px)가 있는데 가장 긴 글을 읽는 표면이 13px — TopBar `.proj`(14.5px, :125)가 본문보다 큰 위계 역전. max-width 860px 컬럼에서 13px은 행 길이도 과도. ASM-035 13px 버킷의 문제가 아니라 **매핑 대상 선정** 문제(읽기 텍스트가 label에 과적재).
- 제안: 읽기 투사 셀렉터 7종만 `--font-size-body` 승격 — `.docpLead`·`.docpFeature p`·`.docpDetails`·`.specdoc .lead`·`.specdoc p`·`.msgText`·`.detailDesc`. 컨트롤·메타는 label 유지. 공수 S.

### [V-02] 공용 인스펙터 안에서 제목·패딩 문법이 선택 대상 따라 널뛰기
- 표면: RightPanel — SpecInspector vs Table/ElementInspector / 파일: `editor.module.css:642`(.detailTitle 20px)·`:1111`(.inspTitle 15px)·`:632`(.detail 24/28px)·`:1101`(.insp 18px), 소비 `InspectorSpecPanels.tsx:77`·`RightPanel.tsx:77`·`ElementInspector.tsx:19`
- 문제: "상세 단일 집"(A-11 해소) 안에서 요구사항/기능 선택=20px 제목+28px 패딩(밀러 3컬럼 이주 잔재), 테이블/요소 선택=15px+18px. 같은 320px 패널에서 "같은 자리=같은 문법" 기대를 매번 깬다.
- 제안: 제목 1단 통일 — `.detailTitle`을 `--font-size-section`(17px)으로 하향해 `.inspTitle`(15px 유지 또는 동반 17px)과 정렬, `.detail` 패딩 18px 수렴. 이월 입력 1번 판정과 연동. 공수 S.

### [X-02] 미적용 변경 계획의 생존이 보이지 않음 — 무언 대체·접힘 무신호·이탈 무언 소멸
- 표면: ChatDock/ChangePlanCard 승인 관문 / 파일: `dock/ChatDock.tsx:39,65-72,140-164` · `app/editor/[id]/page.tsx:20-22`
- 문제: ① 새 계획 도착 시 검토 중이던 계획 무언 대체(명시적 "버리기"는 확인 1단계를 요구하는데 같은 파괴가 경로 따라 확인 유무 갈림) ② 도크 접힘 바에 "계획 대기" 신호 0 ③ `activePlan`이 컴포넌트 로컬 state라 스펙 전환·복귀 시 언마운트 소멸, 이탈 가드 없음.
- 제안: 대체 확인 1단계(버리기와 동일 문법) · 접힘 바 대기 뱃지 · 미적용 계획 보유 중 이탈 확인. 공수 M. **실행 소유: 티켓** — store·page 로직, 레인 시각 범위 밖.

### [X-03] 승인 관문 diff가 모델 내부 언어 노출 — raw 필드명·id·JSON
- 표면: ChangePlanCard diff·에러 카피 / 파일: `dock/planDiff.ts:16-18,32-34,47-60` · `dock/ChangePlanCard.tsx:94-104,147-152`
- 문제: G1(비개발자)이 내리는 승인 결정의 근거 표면에 `requirementIds`·`JSON.stringify` 배열(`["feat_1","feat_2"]`)·내부 id가 그대로. dangling 에러도 id 3중 노출.
- 제안: 필드명→한글 라벨 맵(유한집합) · id 배열은 이름 해석 렌더(ImpactSection 기존 해석 재사용) · dangling 카피 이름+종류로. 공수 M. **실행 소유: 티켓** — diff 로직+테스트 동반.

## MED·LOW 상세

- **[V-04]** `--text-muted` #7a7a7a: base 위 ≈3.9:1·card 위 ≈3.3:1 — AA(4.5:1) 미달. `.readonlyNote`(919-926)는 필수 정책 문구인데 11px+muted 이중 감쇠. → muted #949494 상향(card 위 ≈4.7:1, secondary와 단차 유지) + readonlyNote는 secondary 승격. S.
- **[V-05]** `editor.module.css:368-390` PriorityBars 막대 높이 5/8/12px 고정 — 값 없는 거짓 게이지, med=low 동일 렌더, high만 브랜드색(색 단독 지시 + 브랜드=의미 사용 위반). → 채움 개수 인코딩(1/2/3) + 활성색 text-secondary(high만 --warning 고려) + aria-label. S.
- **[V-06]** DataView 읽기전용 고지 3중(배지 :31-33 · 노트 바 :47-49 · 범례 :219-224) + elevated 세그 2단 스택(:37-44·:56-65)이 위계 무구분. → 고지 1곳(배지+툴팁), 범례는 FK만, 하위 세그 tone="card"/sm 강등. M.
- **[V-08]** 참조 칩 3벌: `ui/Chip`(card bg·radius-sm·11px) vs `.impactChip`(투명 pill·11+10px) vs `SuggestionsCard .target`(투명 pill·12px) — 의미·hover 문법 동일한데 형태 3벌. → Chip 소비 치환(필요시 tone/size prop 확장). M.
- **[V-09/X-04]** 같은 `POST /suggestions`를 SuggestionsCard는 "유료라 명시 버튼만"(주석 :15), ChatDock은 **인풋 포커스만으로 자동 발사**(:44-53,147) — 정책 모순+2회 과금 가능+결과 캐시 비공유, 소비 방식도 상이(칩=챗 전송 vs 카드=점프). → 호출 정책 통일(최소 포커스 발화 제거)·결과 공유·장기 한 집 수렴. M. **티켓**.
- **[V-10]** ChangePlanCard 확인 단계 filled="버리기"(:116-118), 평시 filled="적용하기"(:126-128) — 같은 슬롯이 진행/폐기 겸용, 계획 폐기는 복구 불가. → Button danger 변형(negative 계열) 신설 적용, filled 슬롯은 진행 고정. S.
- **[X-05]** ER 선택은 `setRightCollapsed(false)` 동반(DataView:166-169), 와이어 `selectElement`(store:118)는 안 폄 — 인스펙터가 결과의 전부인 와이어 요소에서 무언 no-op. → store 액션에 패널 오픈 통일. S. **티켓(store 소유 밖)**.
- **[X-06]** FlowView 노드 클릭 무반응(:60-71, cursor 미지정) — 주석(:10)은 "#44 정의 대기"인데 editor-interactions.md:167에 #44 확정(2026-07-02). 낡은 주석이 편성 누락 재생산 위험. → #44 확정안 배선 티켓 + 주석 정정. M. **티켓**.
- **[X-07]** SpecView 내 도큐먼트 서브뷰(:272-299)가 DocView의 저해상도 복제(TOC·상태 필·수용 기준 없음) — B-1 패턴이 트리뷰 숨긴 자리에서 재발, 원칙 2 존재 자격 미달. → 결정 필요: ① 서브뷰 제거+"문서로 보기" 점프(S) ② 부분 문서 정체성 명시+DocView 렌더 재사용(M). **티켓(협의)**.
- **[X-08]** LeftRail 뱃지(:26-31) 단위가 행마다 다름(문서=req 수·플로우=엣지 수·와이어=페이지 수), 무라벨 — 뷰 헤더는 단위를 붙임(FlowView:23-28). → 1급 객체 수로 통일 + aria-label/툴팁 단위 명시. S.
- **[V-11]** `.flowDot`(:1250-1256) 전 노드 브랜드 도트 — 장식 반복, hover 브랜드 변별 희석. → text-muted 또는 positive로. S.
- **[V-12]** `.treeGroupHead`(:211-221, uppercase·600) vs `.tcommon`(:309-313, 무장식) — 같은 위계 2방언, uppercase는 한글에 무의미. → 통일·클래스 삭제. S.
- **[V-13]** `floating.module.css:7` z-index 90(토큰 밖 — `--z-toast` 60 위라 툴팁>토스트 역전 잠재)·`Select.module.css:38` z 60 하드코딩·`dashboard.module.css:162` radius 11px·`.opBadge_*`(:1518-1529) color-mix 16%로 `--*-soft`(14%) 우회·죽은 CSS `.scopeChip`(:222-235)/`.tnum`(:269-284). → `--z-float` 신설(토스트와 순서 의도 결정 1건)·radius-control 스냅·soft 토큰 치환·죽은 블록 삭제. S.
- **[V-14]** duration 리터럴 22선언(0.12s/0.16s/120ms + 0.5s flash) — B-6(8건) 이후 증가, 같은 파일에 var 소비처와 혼재. → transition-base/duration 계열 일괄 치환, 0.5s는 `--duration-flash` 신설 또는 slow 스냅(시각 확인 1건). S.
- **[V-15]** `.dockInput`(:1351-1361) 단일행 34px input — 기대 발화는 복문, Composer는 auto-grow textarea(76px)라 같은 행위 입력 문법 2벌. → auto-grow textarea(1→4행)+Enter/Shift+Enter. M. **티켓(로직)**.
- **[X-09]** SpecView 좁히기 분산 — 필터=우상단 헤더(:170-196)·검색=좌 미니 레일(:200-223, 뷰 전환 그룹에 액션 혼입)·"전체 보기"는 무필터일 때 활성 스타일이 붙는 리셋 버튼(상태/액션 이중성). → 검색 헤더 합류·미니 레일 뷰 전환 전용·"전체 보기"→조건부 "필터 초기화". S.
- **[X-10]** 패널 토글 라벨 상태 무관 고정 "접기"(TopBar:45-47,57-59)·aria-expanded 없음·우패널은 안에서 접고 펴기는 반대편 TopBar만(RightPanel:52-54). → 상태 토글 라벨+aria-expanded, 접힌 자리 펴기 핸들 검토. S.
- **[X-11]** 수용 기준 `<input type="checkbox" disabled>`(InspectorSpecPanels:113-118) — 추적 모델 없는 순수 장식·거짓 어포던스. → 불릿 교체. S.
- **[X-12]** ActivitySlideover(:39,122-125) — 프로덕트 전역 스코프인데 제목 "최근 활동"뿐(DataView는 "· 전체 프로덕트" 명시). → 스코프 라벨+항목 스펙 메타. S.
- **[X-13]** 플로우·와이어 빈 상태(FlowView:31-35·WireframeView:30-34) — "어떻게 채우는지"(챗 도크) 결락. → 다음 행동 카피+도크 열기 버튼(선택). S.
- **[X-14]** `<Avatar initial="J" />` 하드코딩(editor/TopBar:67·dashboard/TopBar:14) — 가짜 로그인 신호, no-hardcoding 저촉. → auth 전 중립 아이콘/숨김. S.

## 이월 입력 판정 (ASM-035 → 4종)

**1. font-size 보류 8건 — 분할: 실행 7 + 보류 1**
- **마이크로 5건 실행**: `.impactChip b`(10)·`Badge .pill`(10)·`.tag`(8.5)·`Chip .marker`(9.5)·`.erHname`(9.5) → **`--font-size-micro: 10px` 신설**로 5값 1토큰 수렴(전부 2~3자 표식으로 용처 동질, caption 11 개별 스냅은 Δ 초과). **조건부**: `.pill` 실소비에 한글 경고 전문 존재(`SpecDirectoryView.tsx:73` "연결 안 됨"·`SuggestionsCard.tsx:70` "AI 추정") — 한글 라벨 pill은 status variant(caption 11px)로 이관 후 치환.
- **20px 제목류 2건 실행(하향)**: `.detailTitle` 20px·`.specdoc h2` 19px → **subtitle 단 신설 대신 `--font-size-section`(17px) 하향 통일**. 근거: V-02 이주 잔재 + DocView h2가 이미 section 17px이라 신설(20)이면 두 문서 뷰 h2가 17/20 영구 분열. Δ3·Δ2 하향 — 통합 스크린샷 확인 필수.
- **1건 보류**: `dashboard.module.css:23` `.logoWord` 19px — 워드마크는 타입 스케일 아닌 브랜드 록업 상수. 현행 유지(원하면 `--logo-size` 별도 상수).

**2. 12.5→13px 버킷 35건 — 실행(유지 승인)**. 76참조/14파일 재확인, +0.5px 스냅의 시각 회귀 징후 없음(컨트롤·칩·행 높이 고정이라 랩핑 위험 0). 버킷의 진짜 문제는 크기가 아니라 **과적재**(읽기 텍스트 혼입) — V-03으로 분리 해소.

**3. ER 툴팁 하단 배치 — 실행(현행 유지 승인)**. `DataView.tsx:186-216`+`floating.ts` 표준 배치 확인. 하단 노드 일시 가림은 있으나 pointer-events:none·hover 한정이고, 표준화가 주는 스크롤 추적·클램프·키보드 포커스 이득 > 수제 우측 배치 복원(B-2 재발) 비용. 부수 개선(S): 툴팁 첫 줄(테이블명)이 바로 위 노드 헤더와 완전 중복 — description만 남기면 가림 높이도 감소.

**4. font-weight 47건/10파일 — 실행**. grep 재확인 47건 일치(editor 26·dashboard 6·Badge 4·SuggestionsCard/ExportModal/ActivitySlideover/CodeConnectModal 각 2·Button/Chip/SpecBulkBar 각 1). 토큰 4종 기존재+같은 파일에 var/리터럴 혼재 — 방언 고착 전 기계 치환. 400/500/600/700→regular/medium/semibold/bold 1:1, 시각 회귀 0, 검증 `font-weight:\s*\d` grep 0건. S.

## top-N 추천 (승인 요청)

**추천 top-10 — 전부 레인 소유 안 · 시각 회귀는 스냅·상향뿐이라 한 웨이브에 마감 가능:**

| # | 항목 | 왜 지금 |
|---|---|---|
| 1 | **이월 4** font-weight 47건 치환 (S) | M1-D 탈출 조건 "하드코딩 0" 직결, 회귀 0 |
| 2 | **이월 1** font-size 잔여 실행 7건 — micro 토큰 신설+한글 pill 이관+제목 section 하향 (S) | 〃 + V-02와 동시 마감 |
| 3 | **V-13** z-float·radius·soft 토큰·죽은 CSS 2블록 (S) | "하드코딩 0" 마감조 + z 역전 잠재 제거 |
| 4 | **V-14** duration 리터럴 22선언 치환 (S) | 〃 (B-6 잔존 종결) |
| 5 | **V-01** 엣지 가시성 토큰 (S, HIGH) | 차별 자산 복구 — 시각 효과 대비 최소 비용 |
| 6 | **V-07/X-01** filled 역전 해소 — 공유하기 강등+사유 툴팁·내보내기 승격 (S, HIGH) | 화면 최강조가 죽은 버튼인 상태 종료 |
| 7 | **V-03** 읽기 본문 body 승격 7셀렉터 (S, HIGH) | 매 세션 읽기 부하 — 이월 2 승인과 한 쌍 |
| 8 | **V-02** 인스펙터 제목·패딩 통일 (S, HIGH) | #2(제목 하향)와 같은 셀렉터 — 동시 처리 |
| 9 | **V-04** muted 상향+readonlyNote 승격 (S) | AA 미달 광역 해소 — 토큰 1줄+셀렉터 1건 |
| 10 | **V-05** PriorityBars 값 인코딩+브랜드 회수 (S) | 거짓 시각화 제거, 색 규율 복구 |

- **차순위(승인 시 +α로 흡수 가능, 전부 S)**: X-13 빈 상태 다음 행동 카피 · X-11 체크박스→불릿 · X-12 활동 스코프 라벨 · V-11 flowDot 브랜드 회수 · V-12 트리 헤더 통일 · X-10 토글 aria · X-14 Avatar 하드코딩 · X-08 뱃지 단위 · 이월 3 부수(툴팁 중복 줄 제거).
- **레인 밖 — 오케스트레이터 티켓 신설 권고**: **X-02(HIGH)**·**X-03(HIGH)**은 M1-D "HIGH 해소" 조건에 걸리므로 판단 필요 — 로직+테스트 동반이라 이 레인 2단계가 아닌 별도 티켓 권고. V-09/X-04(유료 자동 호출 정책)는 비용 누수라 우선 순위 높음. X-05·X-06·X-07·V-15는 후속 웨이브.
- **이월 2·3은 "실행=현행 유지 승인"** — 코드 변경 없음, 사용자 승인만 기록하면 종결.

## dedup 메모 (기지 사항 — 재지적 제외)

**해소 실측 확인(제외)**: A-1 에디터 복귀(TopBar Link) · A-3/A-4 에러 상태 분리·재시도 · A-11/A-12 공용 인스펙터+도크 · A-14/15/16 상태 리셋 · C-1/C-3 언어("제품 구조"·"읽기 전용") · B-2 Tooltip/Chip 소비 시작 · B-3 세그 프리미티브 통일 · B-4 hover 문법 · B-5 죽은 챗 CSS 삭제 · A-2/A-6/B-10/C-6/C-7(ux-audit ✅ 기표기).

**기지 사항 잔존(재발견 아님 — 기록만)**:
- A-17 원인 오진 빈 상태 카피 — 명세 뷰 3곳 잔존(`SpecDirectoryView.tsx:57`·`SpecView.tsx:275-277`·`SpecTreeView.tsx:34-36` 전부 `hasActiveSpecFilters` 미분기 — 진짜 빈 스펙에도 "필터를 풀어보세요").
- B-14 빈 상태 카피 리터럴 3벌 복제(위 3곳) · A-18 placeholder 뷰 0 카운트 칩(FlowView:23-28) · B-13/C-9 "준비 중" 방언 1곳(공유하기 — V-07에 흡수).
- B-6 duration — 잔존+증가라 V-14로 실측 갱신 재기록(dedup 제외 아님).
