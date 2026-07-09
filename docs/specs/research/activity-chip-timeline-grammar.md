# 레퍼런스 해석 — 활동 패널·칩·타임라인 시각 문법 (스크린샷 2장)

> 리서치: 2026-07-09 · 모드 A(레퍼런스 해석) · product-researcher · 렌즈 = 기능 목적 아님, UI(시각 문법) 시점.
> 출처: 사용자 제공 스크린샷 2장(이미지 1 = 데이터 거버넌스형 "Proposal Activity" 오버레이 / 이미지 2 = 커머스 어드민 주문·배송 추적).

## Summary

사용자가 준 스크린샷 2장(이미지 1 = 우측 "Proposal Activity" 오버레이 패널이 달린 데이터 거버넌스형 화면 / 이미지 2 = 우측 주문·배송 추적 패널이 달린 커머스 어드민)을 **기능이 아니라 시각 문법**의 눈으로 분해했다. 두 화면은 공통적으로 **우측 오버레이 패널 + 세로 타임라인 + 상태 dot/체크 + 라벨-값 2열 + 참조 칩/배지 + 아바타(스택) + 상단 액션 버튼군**이라는 문법을 공유한다. 우리 `src/components/ui/` 인벤토리와 대조한 결과 **절반은 이미 있는 프리미티브로 흡수 가능**(OverlayPanel P-B·Badge·Chip·Segmented·Button·InsightCard P-C·Avatar), **절반은 신설 필요**(리치 Timeline·AvatarGroup·세그먼트 진행바·라벨-값 DescriptionList·완료 취소선 항목·상태 배너). 다만 신설 후보 다수는 우리 로드맵상 **아크2 v2(git 쓰기·상태 바)·협업 아크(M3 대기)**에 걸리는 미래 표면이라, 중단 규칙(백로그 소진 금지)을 지켜 "현 13차 편성" vs "M3/아크2 대기"를 제안 티켓에서 명시 구분했다.

---

## 본문 — 요소별 관찰·차용·차별·출처·미확인

### E1. 우측 오버레이 패널 (Proposal Activity / Order tracking)

- **관찰:** 두 이미지 모두 화면 우측에 세로로 긴 패널이 본문 위에 떠 있다. 이미지 1은 제목 "Proposal Activity" + 우상단 X 닫기. 이미지 2는 제목 없이 헤더 카드로 시작하고 본문을 가린 채 스크롤된다. 본문(좌측)은 패널 뒤로 이어져 보인다(비차단).
- **차용:** 이미 있음 — `src/components/ui/OverlayPanel.tsx:27`의 `side="right"` 변형. 현 소비처 `src/components/editor/ActivitySlideover.tsx:57`(최근 활동), `src/components/editor/DocOverlay.tsx:33`(문서 창, `variant="window"`). 제목·X 닫기·`meta` 슬롯·포커스 트랩·백드롭·Esc 전부 프리미티브에 존재. 신설 불필요 — 이미지 1의 "Proposal Activity"는 ActivitySlideover와 **정확히 동형 껍데기**다.
- **차별:** 그들의 패널은 워크플로우(리뷰·머지) 부산물 / 우리 OverlayPanel은 "구조의 투사를 잠깐 띄우는 참조 창"(정본은 구조, 창은 임시 뷰 — ux-references §4 P-B 정합).
- **출처:** 사용자 제공 스크린샷 2026-07-09.
- **미확인:** 패널 폭·슬라이드인 애니메이션·리사이즈 가능 여부(스크린샷 밖).

### E2. 세로 타임라인 + 연결선 (varied leading node)

- **관찰:** 왼쪽에 세로선이 흐르고 각 이벤트의 앞머리에 서로 다른 노드가 붙는다. 이미지 1 = 초록 채운 dot(생성) / 말풍선 아이콘(토론) / 원형 화살표 아이콘(준비됨). 이미지 2 = 빈 원(노트) / 파란 라운드 사각 글리프(Shipment) / 초록 체크(완료 단계) / 파란 채운 dot(진행 중). 이벤트마다 제목 + 타임스탬프("Today, 10:00 AM"), 그 아래 카드가 세로로 쌓인다. 중간에 섹션 라벨("IN-PROGRESS", "COMPLETED")이 회색 대문자로 선에 얹힌다.
- **차용:** 부분만 있음 — `src/components/editor/ActivitySlideover.tsx:97`의 `ActivityList`가 세로 `ol` + 단일 `s.dot` + 제목/메타를 렌더한다. 그러나 이건 **평면 목록**이다(노드 종류 1개, 섹션 그룹 없음, 자식 카드/중첩 체크리스트 없음). 이미지들의 **리치 타임라인**(노드 종류 다수·섹션 라벨·중첩 카드·중첩 체크리스트)은 `src/components/ui/`에 프리미티브가 없다(Glob 인벤토리 13종·Grep `Timeline` 0건 확인) → **신설 필요**(`ui/Timeline` 또는 `ui/Steps`, 리딩 노드 종류를 slot으로).
- **차별:** 그들의 타임라인은 상태 로그(배송·리뷰) / 우리 타임라인은 "이걸 하면 다음에 무엇이 일어나는가"의 인과 흐름 표시 — 활동 기록이자 변경 전파의 시각화 후보. 다만 사실(구조 이벤트)과 추론(AI 해석)을 섞지 않는다.
- **출처:** 사용자 제공 스크린샷 2026-07-09.
- **미확인:** 노드 아이콘 클릭 동작·라이브 갱신 여부·선 애니메이션(스크린샷 밖).

### E3. 상태 dot / 완료 체크 / 진행 dot

- **관찰:** 이미지 2 하위 체크리스트에서 완료 항목은 **초록 체크 + 회색 취소선 텍스트**("Carrier: Royal Mail" 취소선), 현재 항목은 **파란 채운 dot + 정상 텍스트**("Packing in progress"). 이미지 1 배너는 **노란 dot**(대기).
- **차용:** dot 자체는 있음 — `src/components/ui/Badge.tsx:18`의 `variant="status"`가 tone별 색 dot을 렌더(brand/positive/warning/negative/neutral). `InsightCard.tsx:41`도 dot 사용. 그러나 **완료=초록체크+취소선** 조합과 **진행=채운 dot** 조합은 컴포넌트가 없다(Grep `line-through` src 0건 확인) → 타임라인 프리미티브(E2)의 항목 상태로 **신설 필요**.
- **차별:** 취소선 완료 문법은 "끝난 사실"을 지우지 않고 보존하며 시각적으로만 낮추는 것 — 우리 이력 보존(활동 로그) 원칙과 정합.
- **출처:** 사용자 제공 스크린샷 2026-07-09.
- **미확인:** 완료 항목 재활성 동작(스크린샷 밖).

### E4. 라벨-값 2열 행 (Submitted by / Dataset / Context / Delivery by)

- **관찰:** 카드 안에서 왼쪽 회색 라벨 + 오른쪽 값이 여러 줄 반복된다. 이미지 1: "Submitted by → 아바타+John", "Dataset → 칩 2개", "Context → 문단". 이미지 1 좌측(잘린 부분)에도 "Origin Info / General Information / Status / Type / Submitted by" 같은 라벨-값 표. 이미지 2: "Delivery by: → 국기+텍스트", "Estimated dispatch: Today".
- **차용:** 공유 프리미티브 없음 — `src/components/ui/`에 DescriptionList/FieldRow 부재(Grep 확인). 우리 제품에도 이 문법이 이미 등장한다: `src/components/editor/views/DocView.tsx`에 label/row 표현 7건(Grep count). 즉 **문서 패밀리·데이터 사전 본문에서 반복되는 문법인데 프리미티브로 안 묶여 있다** → 추출 후보(`ui/FieldRow` 또는 `DescriptionList`). 13차 정책 문서 본문에서 API·DB 참조 메타를 라벨-값으로 보여줄 때 직접 소비된다.
- **차별:** 그들의 라벨-값은 정적 레코드 표시 / 우리는 값이 **연결된 객체로의 참조**(값 클릭 = 대상 이동)일 수 있어 단순 표가 아니다.
- **출처:** 사용자 제공 스크린샷 2026-07-09.
- **미확인:** DocView 로컬 구현이 얼마나 재사용 가능한 형태인지는 파일 본문 미독(Grep count만 확인) — 추출 타당성은 구현 시 재확인 필요.

### E5. 참조 칩/배지 (Employees · Record EMP008)

- **관찰:** "Dataset" 값으로 회색 라운드 pill 2개("Employees", "Record EMP008")가 나란히. 클릭 가능해 보이나 스크린샷상 확정 불가. 텍스트만, 마커/아이콘 없음.
- **차용:** 두 후보 다 있음 — 클릭해 대상(레코드·테이블)로 이동하면 `src/components/ui/Chip.tsx:12`(참조 칩, `marker="DB"` 등), 읽기 전용 표식이면 `src/components/ui/Badge.tsx:15` `variant="pill"`/`"tag"` tone neutral. 우리 13차 "본문 API·DB 참조 호버" 흐름에서 **"Record EMP008" = DB 레코드 참조 칩**과 정확히 대응 → Chip(marker) 소비. 신설 불필요, 단 **정적 vs 인터랙티브 판정 규칙**만 소비처에서 확정 필요(Badge인지 Chip인지).
- **차별:** 그들의 칩은 단순 라벨 / 우리 Chip은 참조 그래프의 1급 엣지(클릭=연결 이동), 사실 계층.
- **출처:** 사용자 제공 스크린샷 2026-07-09.
- **미확인:** 칩 클릭 시 동작(스크린샷 밖).

### E6. 상태 태그 배지 (USER · In Progress)

- **관찰:** 이미지 1 좌측 제목 옆 회색 대문자 "USER" 태그. 이미지 2 "Shipment 1" 옆 연한 파란 pill "In Progress".
- **차용:** 이미 있음 — `src/components/ui/Badge.tsx`: "USER" = `variant="tag"` tone neutral, "In Progress" = `variant="pill"` tone brand(또는 status dot 붙여). tone 5종·variant 4종으로 전부 커버. 신설 불필요.
- **차별:** 없음(순수 표식 문법 일치). 우리 색 규율(브랜드 절제 — 상태에만)과 정합.
- **출처:** 사용자 제공 스크린샷 2026-07-09.
- **미확인:** 없음.

### E7. 아바타 + 아바타 스택

- **관찰:** 이미지 1 상단 겹친 아바타 2개(사진), "KK" 이니셜 파란 아바타. "Contributors → Maya, John" 겹친 아바타 2개 + 이름. 이미지들은 **사진 아바타**와 **겹쳐 쌓인 그룹**을 쓴다.
- **차용:** 부분만 있음 — `src/components/ui/Avatar.tsx:4`는 **이니셜 단일 아바타만** 렌더한다. 주석엔 "이니셜/이미지"라 적혀 있으나 코드에 image prop 없음(파일 전체 확인) → **이미지 지원 갭**. **겹쳐 쌓는 AvatarGroup도 없음**(Grep 확인) → 협업/기여자 표시에 신설 필요.
- **차별:** 협업 표시는 우리 협업 아크(M3 대기) 소속 — 현 단일 사용자 도그푸딩 단계에선 우선순위 낮음.
- **출처:** 사용자 제공 스크린샷 2026-07-09.
- **미확인:** 스택 최대 개수·"+N" 오버플로 표기 유무(스크린샷 밖).

### E8. 상단 액션 버튼군 (Hold/Edit/⋯ · Upvote/Add to Workspace)

- **관찰:** 이미지 2 우상단 "Hold"(손 아이콘+텍스트, 아웃라인) · "Edit"(연필+텍스트, 아웃라인) · "⋯"(케밥 아이콘 버튼). 이미지 1 "Upvote"(위 캐럿+텍스트) · "Add to Workspace"(북마크 아이콘, 진한 채운 버튼) · 케밥. 좌측 이미지 2엔 주황("Open"으로 추정) 상태 텍스트.
- **차용:** 이미 있음 — `button.md` 규율의 `Button`(filled=주요 1개="Add to Workspace" 대응, ghost=보조="Hold"/"Edit"/"Upvote", `leftIcon`/`rightIcon` slot) + `IconButton`(케밥, `label`→aria). 버튼군 컨테이너는 레이아웃일 뿐 프리미티브 불필요. 신설 불필요.
- **차별:** 없음(버튼 문법 일치). 다만 "한 영역 filled 1개" 규율(우리)과 정합 — 이미지 1도 filled 1개("Add to Workspace")만.
- **출처:** 사용자 제공 스크린샷 2026-07-09.
- **미확인:** 케밥 메뉴 내용·주황 상태 텍스트 원문(스크린샷 밖/잘림).

### E9. 세그먼트 진행바 (Your Order is on the Way)

- **관찰:** 이미지 2 헤더 카드 "Your Order is on the Way / 2 shipments · Arriving tomorrow" 아래 **파란 세그먼트 4칸**이 작은 간격을 두고 채워진 진행 표시. 트럭 아이콘이 연한 브랜드 원 안에.
- **차용:** 없음 — `src/components/ui/Segmented.tsx`는 **탭 컨트롤**(SegmentedButton, role=group)이지 진행 표시가 아니다. 진행바 프리미티브 부재(Grep `Progress` 컴포넌트 0건) → **신설 필요**(`ui/SegmentBar`/`ProgressSegments`). 우리 대응 소비처는 문서 패밀리 3종 완성 진행/온보딩 단계 진행 정도 — 현 시점 강한 수요 아님.
- **차별:** 그들은 물류 단계 / 우리라면 "생성→해석→내보내기 완주" 같은 여정 진행. 다만 현 로드맵에 명시 소비처 없음.
- **출처:** 사용자 제공 스크린샷 2026-07-09.
- **미확인:** 세그먼트 수가 고정인지 단계 수 가변인지(스크린샷 밖).

### E10. 탭 필터 (All / Notes / Shipment / Fulfillment)

- **관찰:** 이미지 2 진행바 아래 텍스트 탭 4개, "All"이 pill 배경으로 활성. 타임라인을 종류별로 거른다.
- **차용:** 이미 있음 — `src/components/ui/Segmented.tsx:29` `SegmentedButton active`가 pill 활성 문법과 동일. 신설 불필요. 리치 타임라인(E2) 도입 시 필터로 조립.
- **차별:** 없음(탭 문법 일치).
- **출처:** 사용자 제공 스크린샷 2026-07-09.
- **미확인:** 각 탭의 카운트 배지 유무(스크린샷 밖).

### E11. 상태 배너 / 인용 노트 카드

- **관찰:** 이미지 1 패널 상단 **노란 dot + "This proposal is pending review…"** 전폭 안내 배너. 이미지 2 **좌측 보더 강조 인용 카드**("Please double-check the shipment packaging." — Jane Cooper 노트).
- **차용:** 없음 — 인라인 알림 배너/인용 카드 프리미티브 부재. `InsightCard.tsx`(P-C)는 제목+AI배지+pros/cons 구조라 형태가 다르다(안내 배너 아님). dot은 Badge status로 재사용 가능하나 전폭 배너 껍데기는 신설. **신설 필요**(`ui/Callout` 또는 `ui/NoteCard`) — 단 소비처 수요 확인 후(반복 2회+ 규칙).
- **차별:** 우리 배너는 상태 안내(해요체·navigating error 규율) — 원문의 영어 톤과 별개.
- **출처:** 사용자 제공 스크린샷 2026-07-09.
- **미확인:** 배너 dismiss 동작(스크린샷 밖).

### E12. 카드 내 전폭 아웃라인 푸터 버튼 (View proposal details ↗)

- **관찰:** 이미지 1 각 카드 하단에 전폭 아웃라인 버튼 + 우측 화살표("View proposal details ↗", "Open related thread ↗").
- **차용:** 이미 있음 — `Button` ghost + `className="w-full"` + `rightIcon`(화살표). 신설 불필요.
- **차별:** 없음.
- **출처:** 사용자 제공 스크린샷 2026-07-09.
- **미확인:** 없음.

---

## 제안 티켓 (roadmap 탈출조건 매핑)

> 원칙: ux-references §4~6 스키마 준수. **현 13차 편입 후보 vs M3/아크2 대기**를 명시(중단 규칙 1·3 — 백로그 소진용 제안 금지). 편입 판정은 오케스트레이터 몫.

### 현 웨이브(13차) 편입 후보 — 탈출조건에 직접 기여

**T1 · 라벨-값 필드행 프리미티브 추출 (`ui/FieldRow`/DescriptionList)**
- 명세: DocView 등에 흩어진 라벨-값 2열 문법(E4)을 공용 프리미티브로 추출, 값 슬롯이 텍스트·Chip·Avatar를 받게.
- 근거: E4(관찰 — 두 이미지 공통 반복) + 우리 DocView label/row 7건(Grep) — 13차 정책 문서·데이터 사전 본문에서 API·DB 참조 메타를 이 문법으로 렌더.
- 매핑: **P8 디자인**("컨트롤 문법 1벌" — 반복 CSS 1벌화). 재개 조건 "신규 표면 추가 시 그 표면만"에 해당(정책 문서 본문).

**T2 · 본문 참조 칩 정적/인터랙티브 판정 규칙 확정**
- 명세: "Record EMP008"류 참조 표식(E5)을 정적이면 Badge pill, 클릭 이동이면 Chip(marker)로 — 정책 문서 본문 호버/참조에서 어느 쪽인지 소비 규칙 1줄 확정. 신규 컴포넌트 아님(기존 Badge/Chip 소비 규칙).
- 근거: E5 + 13차 "본문 API·DB 참조 호버 해석/추천"(roadmap 165~173행).
- 매핑: **P8 디자인**(문법 일관) + 13차 현행 기능 직결. 소형 — 크로스체크급.

### M3/아크2 대기 — 지금 편성 아님(재개 조건 발화 시)

**T3 · 리치 Timeline 프리미티브 (varied node·섹션·중첩·완료 취소선)**
- 명세: 리딩 노드 종류 slot + 섹션 라벨 + 중첩 자식 + 완료=체크·취소선/진행=dot(E2·E3)을 갖춘 `ui/Timeline`. 기존 평면 ActivitySlideover를 이 프리미티브 위로 재조립.
- 근거: E2·E3 관찰.
- 매핑: **아크2 v2**(git 상태·PR·변경 리뷰 표면 — roadmap 90~91행) 또는 변경 전파 심화. **현재는 git 쓰기=창업자 보류(인증 대기)**라 편성 보류. "새 파트 후보"로 대기.

**T4 · AvatarGroup + Avatar 이미지 지원**
- 명세: 겹침 스택 + "+N" 오버플로(E7), Avatar image prop 추가(현재 이니셜만).
- 근거: E7 관찰 + Avatar.tsx 이미지 미지원 확인.
- 매핑: **협업 아크(M3 판정 대기)** — 단일 사용자 도그푸딩 단계엔 소비처 없음. 편성 보류.

**T5 · 세그먼트 진행바 (`ui/ProgressSegments`)**
- 명세: 단계 수 가변 세그먼트 진행 표시(E9).
- 근거: E9 관찰.
- 매핑: **새 파트 후보**(온보딩/여정 진행) — 현 로드맵 명시 소비처 없음. M3 신호 대기.

**T6 · 상태 배너/인용 노트 카드 (`ui/Callout`)**
- 명세: dot+전폭 안내 배너, 좌보더 인용 카드(E11).
- 근거: E11 관찰.
- 매핑: **조건부** — 정책 문서에 상태(검수/대기) 표면 수요가 반복 2회+ 확인되면 P8. 지금은 수요 미확정 → 보류.

---

## 미확인

- 두 스크린샷의 **원 제품명** — 이미지 1(데이터 거버넌스형), 이미지 2("happymammoth.co"·"Royal Mail" 언급 커머스 어드민) 모두 서비스명 화면 밖 → 지어내지 않음.
- 모든 요소의 **클릭 동작·전환 애니메이션·라이브 갱신** — 정적 스크린샷이라 미확인(E2·E5·E7·E9·E11 각 항목 명시).
- **T1 추출 타당성** — DocView label/row는 Grep count(7건)만 확인, 파일 본문 미독. 실제 재사용 가능한 형태인지는 구현 착수 시 재진단 필요.
- 이미지 2 좌상단 **주황 상태 텍스트**("...en") 원문 — 화면 잘림으로 미확인("Open" 추정, 사실로 쓰지 않음).
