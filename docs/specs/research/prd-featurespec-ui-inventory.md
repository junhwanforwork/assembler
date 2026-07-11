> 반영: 미반영 (17차 편성 후보 — 제안 티켓 T1·T2·T3·T4·T6, T5 조건부)

# 레퍼런스 해석 리포트 — Assembler 화면 캡처 4장 (모드 A)

> 입력: 사용자 제공 캡처 4장(파일 5·6·7·8.png), 2026-07-11 · 대조 정본: `src/app/globals.css`(다크+블루 토큰), `.claude/rules/ds-tokens.md`, `.claude/rules/ds-components.md` · 스키마: `docs/specs/ux-references.md` §4~6
> ⚠️ **출처 성격 주의(미확인):** 4장은 **라이트 테마 + 퍼플 액센트** UI다. 우리 확정 DS는 **다크 우선 + 블루 단일 브랜드, 그라데이션 금지**(`globals.css:3-6`)로 시각이 정면으로 어긋난다. 화면 구성(PRD→기능명세서→유저플로우→와이어프레임 탭, 파란 승인/일괄처리, AI 수정 요청)은 `ux-references.md:37-48`에 기록된 **직접 경쟁사 manyfast.io(Manifest)** 의 문법과 매우 유사하다. 따라서 "이것이 우리 제품 확정 시안"이라고 사실 단정하지 않고, **레퍼런스로 관찰 → 우리 다크 토큰으로 재매핑**하는 방식으로 처리한다. 원 출처(신규 방향 프로토타입인지 경쟁 제품 캡처인지)는 캡처만으로 미확인.

---

## 1. Summary

4장은 "문서 탭 네비 × 캔버스(노드·엣지) × 우측 오버레이 상세 패널 × 하단 플로팅 액션 바"라는 **에디터 4축 레이아웃**과, 그 안의 재사용 UI 문법(태그/칩 인풋, 카테고리 드롭다운, 상태 dot 배지 + 막대형 중요도 미터, 드래그 핸들 리스트 아이템, 승인/거절 액션 바, AI 수정요청 팝오버, PRD 진행률 바)을 보여준다. 우리 코드에는 이 문법 대부분의 실물 컴포넌트가 이미 있다 — `OverlayPanel`(P-B) · `FloatBar`(P-D) · `Badge/StatusPill/PriorityBars` · `Button(filled/ghost)` · `Select` · `Chip` · `FlowView`. 반영 시 핵심 이슈 2개: **(1) 라이트↔다크·퍼플↔블루 색계 불일치** — 캡처의 흰 배경·퍼플 체크/로고는 우리 토큰에 없으므로 다크 표면(--bg-card/elevated)과 블루 브랜드(--brand)로 전면 재매핑해야 하고, 퍼플을 세컨더리 액센트로 "신설"하는 건 "브랜드는 블루 단일·절제"(`ds-tokens.md`) 원칙과 충돌하므로 **비권장**. **(2) 태그 인풋(칩+X+추가) 공용 컴포넌트 부재** — 캡처 2곳(사용자 역할·기기)에서 반복되는데 `src/components/ui/`에 `TagInput`이 없어(Grep 확인) 신설 후보다.

---

## 2. 화면별 UI 인벤토리

수치는 캡처 비율에서 읽은 **근사(±)** 다(2x 스크린샷 추정 → CSS px 환산). 정확 hex·hover 상태는 §7 미확인.

### 캡처 5 — PRD 속성 설정 (기본 상태)
- **좌측 스텝 네비**: 아이콘+라벨 5행(개요/문제 및 해결 방안/타겟 및 시나리오/성공·위험 요소/속성 설정). 활성행(속성 설정)만 옅은 회색 라운드 배경(radius ≈ 8–10) + 퍼플 체크(✓). 아이콘 stroke 얇음.
- **상단 헤더**: 좌상단 사이드바 토글 아이콘 버튼 · 중앙 "PRD" 히어로(≈26px bold) + 진행률 바(어두운 채움, 100%) + "100%" 라벨.
- **본문 카드**: 흰 라운드 카드(radius ≈ 16–20, 옅은 보더). 안에:
  - **섹션 헤더**: 정사각 체크 표식(회색 라운드 ≈8, 퍼플 ✓) + "속성 설정" 타이틀(≈18px bold).
  - **설명 텍스트**: 2줄 회색(≈15px).
  - **행(라벨 좌 · 콘텐츠 우)** 3개, 행 사이 얇은 구분선:
    - 카테고리: 아웃라인 pill "라이프스타일 / 일상"(radius ≈ 8–10, padding ≈ 8×14).
    - 사용자 역할: 태그 "User ✕" "Admin ✕"(아웃라인 pill + X) + 인풋(placeholder "입력 후 Enter를 치거나 + 버튼을 눌러주세요") + "+" 정사각 버튼(≈40–44px).
    - 기기: 태그 "Web ✕" "iOS ✕" + **포커스된 인풋**(퍼플 보더 ≈1.5px, "Android" 텍스트+커서) + "+" 버튼.
- **하단 링크**: "기능명세서로 이동 →" 중앙 텍스트 링크.

### 캡처 6 — 카테고리 드롭다운 열림
- 캡처 5와 동일 + **드롭다운 메뉴**: 흰 라운드 카드(radius ≈ 12–16) + 부드러운 그림자, 트리거 아래 정렬. 옵션 9개(생산성/업무·소셜/커뮤니티·라이프스타일/일상·교육/학습·금융/재테크·건강/웰빙·커머스/쇼핑·엔터테인먼트/미디어·기타). **각 옵션이 아웃라인 pill 형태**로 메뉴 안에 세로 나열, 현재값(라이프스타일/일상)은 옅은 회색 배경으로 강조. (우리 `Select`는 옵션이 평문 행 — 캡처는 옵션마다 pill, 차이.)

### 캡처 7 — 기능명세서 상세 오버레이 패널 + 하단 바
- **오버레이 창**(흰 표면, 우측 대부분 덮음, 배경 캔버스 위에 떠 있음 → 그림자):
  - **헤더**: ✕ 닫기 + 브레드크럼 "집중 타이머 및 보증금 설정 / 보증금 설정" + ★(주황 채움). 우측: "거절"(고스트 텍스트) · "승인"(파란 filled, radius ≈10).
  - **타이틀** "보증금 설정"(≈26px bold).
  - **메타 행**: `ID F-ASRTBD`(모노 회색) │ `상태 [● 시작전]`(회색 dot pill) │ `중요도 [막대차트 아이콘, 분홍/빨강 3막대]`.
  - **사용자 역할**: `[User]` 아웃라인 pill.
  - **설명 문단**(회색).
  - **하이라이트 콜아웃 박스**: 연한 블루/라벤더 배경(radius ≈10, padding ≈16) — AI 수정 제안문.
  - **"연결된 상세 기능"** 섹션 라벨.
  - **리스트 아이템**(카드, 흰 배경 보더, radius ≈12): 드래그 핸들(⠿ 6-dot 회색) + 번호 "1." + 굵은 제목 + 회색 설명 + 우측 ID(모노 회색, 예 S-LIQNSW).
- **하단 플로팅 액션 바**(pill, 흰 배경, 그림자): `[일괄처리]`(고스트) │ `‹ 1/3 [수정 보증금 설정] ›` │ `[✕ 거절]`(고스트) │ `[✓ 승인]`(파란 filled). radius pill.
- **배경 캔버스**: 도트 그리드 + 노드 카드(보상 및 페널티 규…, 주간/월간 랭킹 조…, 사용자 랭킹 정보), 각 노드에 분홍 막대차트 아이콘.

### 캡처 8 — 전체 에디터 셸 + AI 수정요청 팝오버
- **상단 바**: 퍼플 로고 마크 + "보증금 기반 집중 타이머 앱" + 드롭다운 ⌄. **중앙 탭 스텝 네비**: PRD ··· 기능명세서(활성, 회색 pill 배경) ··· 유저플로우 ··· 와이어프레임 `[BETA]` 배지. 우측: 아바타(주황 원) · 챗 아이콘 · 히스토리 아이콘 · `[공유]`(퍼플 filled) · `[내보내기]`(다크 filled).
- **좌측 아이콘 레일**: 사이드바 토글 · 플로우 아이콘(활성 흰 배경) · 레이어 아이콘 · 별 아이콘(세로 배치).
- **캔버스**: 도트 그리드 + 노드 카드(막대차트 아이콘 + 제목 + 번호 6.1/6.2 + ★ + 우측 "+" 확장 버튼). **선택 노드**(다양한 결제 수단 지원)는 파란 보더 + 상단 플로팅 툴바(↗ 열기 · ⧉ 복제 · 🗑 삭제, 다크 바).
- **우측 오버레이 패널**: 브레드크럼 + ★ + `[✨ AI에게 수정 요청]`(퍼플 반짝임 아이콘) + 검색 · 휴지통 아이콘. 아래 **팝오버 인풋**: "‹ 어떻게 수정할까요?" + 원형 전송(↑) 버튼. 이하 타이틀/메타/사용자 역할(User, 아바타 dot)/기능 설명/연결된 상세 기능 리스트(신용카드 결제 수단 추가 S-NVGBXV 등).

---

## 3. 재사용 컴포넌트 스펙 (CSS/HTML) — 우리 다크 토큰 재매핑

색·간격·라운드는 전부 `var(--...)` (하드코딩 hex 금지 — `ds-tokens.md`). 라이트/퍼플은 **의도적으로 다크/블루로 치환**했다.

### (a) 태그/칩 인풋 + 삭제 X + 추가 버튼 — `TagInput` (**신설 필요**, 실존 없음: Grep `TagInput` 0건)
```html
<div class="tag-input" role="group" aria-label="사용자 역할">
  <span class="tag">User <button class="tag-x" aria-label="User 제거">✕</button></span>
  <span class="tag">Admin <button class="tag-x" aria-label="Admin 제거">✕</button></span>
  <input class="tag-field" placeholder="입력 후 Enter를 치거나 + 버튼을 눌러주세요" aria-label="역할 추가" />
  <button class="tag-add" aria-label="역할 추가">＋</button>
</div>
```
```css
.tag-input { display:flex; flex-wrap:wrap; gap:8px; align-items:center; }
.tag {                                   /* Badge variant="tag" 문법과 정합 */
  display:inline-flex; align-items:center; gap:6px;
  padding:5px 10px; border-radius:var(--radius-xs);       /* 6px, 소형 라운드 */
  border:var(--border-width) solid var(--border-strong);  /* 아웃라인 칩 */
  background:var(--bg-card); color:var(--text-primary);
  font-size:var(--font-size-label);                       /* 13px */
}
.tag-x { display:inline-flex; width:20px; height:20px; border:0; background:none;
  color:var(--text-muted); border-radius:var(--radius-xs); cursor:pointer; }
.tag-x:hover { background:var(--hover-bg); color:var(--text-primary); }
.tag-field {                                              /* 인풋 = 카드 표면 */
  flex:1 1 200px; min-height:40px; padding:0 12px;
  background:var(--bg-card); color:var(--text-primary);
  border:var(--border-width) solid var(--border); border-radius:var(--radius-control); /* 10px */
  font-size:var(--font-size-input); }                     /* 15.5px */
.tag-field:focus-visible {                                /* 캡처의 퍼플 포커스 → 블루로 */
  outline:2px solid var(--brand); outline-offset:1px; border-color:var(--brand); }
.tag-add {                                                /* IconButton(ghost) 재사용 권장 */
  width:44px; height:44px; border-radius:var(--radius-control);            /* 44px = 터치타깃 */
  border:var(--border-width) solid var(--border); background:var(--bg-card);
  color:var(--text-secondary); cursor:pointer; }
.tag-add:hover { border-color:var(--brand); color:var(--brand); }         /* ghost hover=브랜드 */
```

### (b) 드롭다운 셀렉트 메뉴 — 기존 `Select`(`src/components/ui/Select.tsx:27`) 재사용
캡처의 카테고리 선택은 우리 `Select`로 커버된다(pill 트리거 + 커스텀 listbox + 키보드 Enter/↑↓/Esc — `Select.tsx:65-88`). 단 캡처는 **옵션마다 아웃라인 pill**, 우리 `Select`는 평문 옵션 행이다. pill 옵션이 필요하면 `Select` 옵션 렌더에 variant 추가(소규모). 메뉴 표면 토큰만 다크로:
```css
/* Select.module.css 대응 — 신설 아님, 토큰 확인용 */
.menu { background:var(--bg-elevated); border:var(--border-width) solid var(--border);
  border-radius:var(--radius-card); box-shadow:var(--shadow-panel); /* 2단 = 팝오버 */ }
.option { padding:8px 12px; border-radius:var(--radius-sm); color:var(--text-primary); }
.option:where(.active) { background:var(--hover-bg); }        /* 캡처의 회색 강조 */
.option:where(.selected) { color:var(--brand); }             /* 현재값 = 브랜드 */
```

### (c) 상태 배지 + 중요도 미터 — 기존 재사용 (`StatusPill` `Badges.tsx:27` · `PriorityBars` `Badges.tsx:110`)
```html
<span class="meta-row">
  <span class="id">F-ASRTBD</span>
  <!-- 상태: Badge variant="status" tone="neutral" (시작전 = not_started) -->
  <span class="badge status neutral"><i class="dot" aria-hidden></i>시작전</span>
  <!-- 중요도: PriorityBars — 채움 개수가 값, aria-label 동반 -->
  <span class="prio" role="img" aria-label="중요도 높음"><i class="on"></i><i class="on"></i><i class="on"></i></span>
</span>
```
```css
.id { font-family:var(--font-mono); font-size:var(--font-size-meta); color:var(--text-muted); }
.badge.status { display:inline-flex; align-items:center; gap:6px;
  padding:3px 9px; border-radius:var(--radius-pill); font-size:var(--font-size-label); }
.badge.status.neutral { background:var(--surface-tint); color:var(--text-secondary); }
.badge.status .dot { width:6px; height:6px; border-radius:var(--radius-pill);
  background:var(--text-muted); }                            /* 시작전 = 중성 dot */
/* 중요도 막대 — 색 단독 지시 금지: 개수가 값, high만 warning (Badges.tsx:108-109 주석) */
.prio { display:inline-flex; gap:2px; align-items:flex-end; }
.prio i { width:3px; background:var(--text-muted); border-radius:1px; }
.prio i:nth-child(1){height:6px} .prio i:nth-child(2){height:9px} .prio i:nth-child(3){height:12px}
.prio i.on { background:var(--text-secondary); }
.prio.prioHi i.on { background:var(--warning); }             /* 캡처의 분홍 → 우리는 high만 warning */
```
> ⚠️ 캡처는 **모든 레벨을 분홍/빨강 막대**로 칠한다. 우리 `PriorityBars`는 색을 high(warning)에만 쓰고 나머지는 중성 — "브랜드/의미색 절제" 원칙(`ds-tokens.md`)과 `Badges.tsx:108` 주석("색 단독 지시 금지 → aria-label 동반")에 맞다. **캡처 방식을 그대로 복제하지 말 것.**

### (d) 연결 상세 기능 리스트 아이템 — 드래그 핸들 + 제목 + 설명 + ID (**핸들만 신설 후보**)
```html
<li class="feat-item">
  <button class="drag" aria-label="순서 변경" tabindex="0">⠿</button>
  <span class="idx">1.</span>
  <div class="feat-body">
    <p class="feat-title">최소/최대 보증금 범위 검증</p>
    <p class="feat-desc">사용자가 설정한 보증금이 최소 1,000원 이상, 최대 50,000원 이하인지 검증</p>
  </div>
  <span class="feat-id">S-LIQNSW</span>
</li>
```
```css
.feat-item { display:flex; align-items:flex-start; gap:12px;
  padding:14px 16px; background:var(--bg-card);
  border:var(--border-width) solid var(--border); border-radius:var(--radius-sm); }
.feat-item:hover { background:var(--bg-elevated); box-shadow:var(--shadow-raised); } /* 짝: 명도+그림자 */
.drag { color:var(--text-muted); background:none; border:0; cursor:grab; line-height:1;
  min-width:24px; min-height:24px; }                        /* 24px = 최소 타깃 */
.idx { color:var(--text-secondary); font-size:var(--font-size-body); font-weight:var(--font-weight-semibold); }
.feat-title { margin:0; color:var(--text-primary); font-size:var(--font-size-title); font-weight:var(--font-weight-semibold); }
.feat-desc  { margin:4px 0 0; color:var(--text-secondary); font-size:var(--font-size-body); }
.feat-id { margin-left:auto; font-family:var(--font-mono); font-size:var(--font-size-meta); color:var(--text-muted); }
```
> 드래그 핸들 아이콘/동작은 `src/components/ui/icons.tsx`에 6-dot 핸들이 있는지 미확인(§7) — 없으면 아이콘만 신설. 리스트 재정렬 dnd는 `.claude/rules/assembler/wireframe.md`의 dnd 재배선 방향과 정합.

### (e) 하단 승인/거절 액션 바 — 기존 `FloatBar`(`src/components/ui/FloatBar.tsx:18`) 재사용
```html
<!-- FloatBar dock="bottom-center", info=좌측 페이저, actions=우측 버튼 -->
<div class="floatbar-wrap bottom-center">
  <div class="floatbar-bar">
    <button class="btn ghost sm">일괄처리</button>
    <div class="pager">‹ <span>1 / 3</span> <span class="edit-pill">수정</span> 보증금 설정 ›</div>
    <div class="actions">
      <button class="btn ghost sm">✕ 거절</button>
      <button class="btn filled sm">✓ 승인</button>          <!-- filled = 브랜드, 한 바 1개 -->
    </div>
  </div>
</div>
```
```css
.floatbar-bar { display:inline-flex; align-items:center; gap:12px;
  padding:8px 12px; background:var(--bg-elevated);          /* 떠있음 = elevated */
  border:var(--border-width) solid var(--border);
  border-radius:var(--radius-pill); box-shadow:var(--shadow-pop); } /* 3단 = 플로팅 바 */
.edit-pill { padding:2px 8px; border-radius:var(--radius-xs);
  background:var(--brand-soft); color:var(--brand); font-size:var(--font-size-meta); } /* 캡처의 연블루 "수정" */
.btn.filled { background:var(--brand); color:var(--text-inverse); border-radius:var(--radius-sm); }
.btn.filled:hover { background:var(--brand-hover); }
.btn.ghost  { background:transparent; color:var(--text-secondary);
  border:var(--border-width) solid var(--border); border-radius:var(--radius-sm); }
.btn.ghost:hover { border-color:var(--brand); color:var(--brand); }
```
> 캡처 상단 헤더에도 "거절/승인"이 중복 노출된다(패널 헤더 + 하단 바). 위계 중복 이슈는 §5 참조.

### (f) AI 수정요청 팝오버 인풋 — 기존 `Popover`(`src/components/ui/Popover.tsx`) + 인풋 조립
```html
<div class="ai-pop" role="dialog" aria-label="AI에게 수정 요청">
  <button class="ai-back" aria-label="닫기">‹</button>
  <input class="ai-field" placeholder="어떻게 수정할까요?" aria-label="수정 요청 입력" />
  <button class="ai-send" aria-label="보내기">↑</button>
</div>
```
```css
.ai-pop { display:inline-flex; align-items:center; gap:8px;
  padding:8px 10px; background:var(--bg-elevated);
  border:var(--border-width) solid var(--border-strong); border-radius:var(--radius-pill);
  box-shadow:var(--shadow-pop); }
.ai-field { flex:1; min-width:260px; min-height:36px; border:0; background:none;
  color:var(--text-primary); font-size:var(--font-size-input); }
.ai-field:focus-visible { outline:none; }                   /* 포커스는 컨테이너 링으로 */
.ai-pop:focus-within { outline:2px solid var(--brand); outline-offset:1px; }
.ai-send { width:32px; height:32px; border-radius:var(--radius-pill);
  background:var(--brand); color:var(--text-inverse); border:0; cursor:pointer; }
.ai-send:disabled { background:var(--surface-tint); color:var(--text-muted); } /* 캡처의 비활성 회색 */
```
> "AI에게 수정 요청" 진입 버튼의 ✨ 아이콘은 우리 `BrandSpark`(`src/components/ui/motion/BrandSpark.tsx`)로 대체 가능(브랜드 스파크 자산 존재).

### (g) 상단 탭 스텝 네비 — 기존 `TopBar`(`src/components/editor/TopBar.tsx`, "기능명세서/유저플로우/와이어프레임" 실존: Grep 확인)
```html
<nav class="doc-tabs" role="tablist" aria-label="문서 종류">
  <button role="tab" class="tab" aria-selected="false">PRD</button><span class="sep">···</span>
  <button role="tab" class="tab active" aria-selected="true">기능명세서</button><span class="sep">···</span>
  <button role="tab" class="tab" aria-selected="false">유저플로우</button><span class="sep">···</span>
  <button role="tab" class="tab" aria-selected="false">와이어프레임 <span class="beta">BETA</span></button>
</nav>
```
```css
.doc-tabs { display:inline-flex; align-items:center; gap:6px; }
.tab { padding:6px 12px; border-radius:var(--radius-sm); border:0; background:none;
  color:var(--text-secondary); font-size:var(--font-size-title); cursor:pointer; }
.tab.active { background:var(--surface-tint); color:var(--text-primary); }  /* 캡처의 회색 pill 활성 */
.tab:hover:not(.active) { color:var(--text-primary); }
.sep { color:var(--text-muted); }
.beta { margin-left:6px; padding:1px 6px; border-radius:var(--radius-xs);
  background:var(--brand-soft); color:var(--brand); font-size:var(--font-size-micro); } /* BETA 배지 */
```
> 캡처의 탭 사이 "···"는 순차 파이프라인(PRD→기능명세→플로우→와이어) 의존성을 시각화한다 — `ux-references.md:11` "탭(문서타입) × 뷰" 2층 내비 관찰과 정합. 우리 `Segmented`(`src/components/ui/Segmented.tsx`)로도 조립 가능하나, 스텝 사이 구분자(···)는 세그먼트 문법 밖 → `role="tablist"` 커스텀이 적합.

---

## 4. 우리 디자인 시스템 반영 제안 (신설/변경)

| 항목 | 현 상태 | 제안 | 근거·정합 |
|---|---|---|---|
| **퍼플 액센트(체크·로고·✨·공유 버튼)** | 토큰에 없음 | ✅ **확정(2026-07-11): 블루로 통일.** 선택/체크/AI 진입은 전부 `--brand`(블루). 퍼플 세컨더리 신설 안 함. 로고 마크는 브랜드 자산이라 토큰과 별개(판단 보류) | `ds-tokens.md` "브랜드는 블루 단일·절제", `globals.css:29` 주석. 퍼플 신설 = 원칙 위반 |
| **TagInput (칩+X+추가)** | 없음(Grep 0건) | **신설**(§3a). 반복 2회+(사용자 역할·기기) 확인 → `ds-components.md` "신설은 반복 2회+" 충족 | `Badge variant="tag"` + `IconButton` 조립으로 SRP 유지 |
| **ProgressBar (PRD 100%)** | `ProductRequirementView.module.css`에 진행률 관련 스타일 존재(Grep 매치), 공용 컴포넌트로는 미추출 | 여러 문서 탭에서 재사용된다면 **공용 추출 후보**. 단독 사용이면 보류(YAGNI) | `file-structure.md` SRP, 재사용 2회+ 확인 후 |
| **중요도 미터 색** | `PriorityBars`가 high만 warning | 캡처의 전(全)레벨 채색 **복제 금지** — 현행 유지 | `Badges.tsx:108` 주석, 색 단독 지시 금지 |
| **드래그 핸들 아이콘** | icons.tsx 존재 여부 미확인 | 6-dot 핸들 없으면 아이콘만 신설(stroke=`ICON_STROKE`) | `ds-tokens.md` 아이콘 stroke 단일값 |
| **오버레이 상세 패널** | `OverlayPanel`(P-B) 존재 | **재사용.** 캡처의 우측 슬라이드 창 = `side="right"`, 중앙 창은 `variant="window"` | `OverlayPanel.tsx:27`, `design-system-plan.md` Layer 1.5 |
| **하단 액션 바** | `FloatBar`(P-D) 존재 | **재사용**(dock="bottom-center", info=페이저·actions=승인/거절) | `FloatBar.tsx:18` |

**design-system-plan.md 정합:** 캡처 문법은 이미 10차에 도입된 패턴층(P-B OverlayPanel · P-C InsightCard · P-D FloatBar)과 대부분 겹친다 — 하이라이트 콜아웃 박스(AI 제안)는 `InsightCard`(P-C)의 요약/좋은 점/주의할 점 구조로 흡수 가능(`ds-components.md` 신설 3종). 즉 **신규 컴포넌트 순증은 TagInput 1개(+선택적 ProgressBar·드래그 핸들 아이콘)** 로 최소화된다.

---

## 5. UI/UX 체크 (발견)

**[HIGH] 색계 전면 불일치 (라이트↔다크 · 퍼플↔블루).** 캡처는 흰 배경 + 퍼플 액센트로 우리 확정 다크+블루 DS(`globals.css:3-6`)와 정면 충돌. 그대로 구현하면 다크 토큰·그라데이션 금지·브랜드 절제 규칙을 모두 깬다. → §3 재매핑 적용, 퍼플은 `--brand`로 흡수. **이 캡처를 "구현 사양"으로 오인해 라이트/퍼플을 신규 도입하지 말 것.**

**[HIGH] 표면이 평면적 — 선(보더)만으로 구분(창업자 피드백 2026-07-11).** 캡처(및 현 빌더)는 카드·패널·리스트를 대부분 얇은 보더 하나로만 구분해 위계가 평면적이고, 클릭 가능 요소(버튼·affordance)가 약해 "비효율적"으로 읽힌다. 요구: **Stitch·Claude처럼 입체적** — 즉 명도 위계 + 그림자로 표면을 띄운다. 우리 DS엔 이미 수단이 있다: `--bg-base(#1e1e1e) → card(#2b2b2b) → elevated(#333)` 3단 명도 + `--shadow-raised/panel/pop/overlay` 4단(`globals.css:54-60`), 그리고 "떠 있는 정도 = 표면 명도 + 그림자 함께 오른다"는 짝 규칙. → **보더 단독 구분을 표면 명도 상승 + shadow 짝으로 교체**(카드=raised, 패널=panel, 플로팅 바=pop, 모달=overlay). 버튼·호버 affordance도 filled/ghost 위계로 명확히. §3 CSS는 이미 이 짝(`box-shadow:var(--shadow-*)`)을 반영해 뒀다.

**[HIGH] 승인/거절 액션 위계 중복.** 캡처 7에서 "거절/승인"이 **패널 헤더**와 **하단 플로팅 바** 두 곳에 동시 노출 → 어느 것이 정본 CTA인지 모호. `button.md` "filled는 한 영역 1개 권장" 위반 소지. → 하단 바를 정본으로 두고 헤더 중복 제거, 또는 역할 분리(헤더=현재 항목, 바=일괄/페이저).

**[MED] 태그 삭제 X 터치 타깃.** 캡처의 태그 안 ✕는 시각상 ≈16px로 WCAG 2.5.8(최소 24px) 미달 추정. → §3a에서 히트영역 20–24px 확보(`.tag-x` min 20px, 권장 24px).

**[MED] 중요도 미터가 색 단독 지시.** 캡처 막대는 분홍색만으로 값 전달 — 색맹 접근성 취약. → 우리 `PriorityBars`처럼 **채움 개수 + aria-label**(`Badges.tsx:110-117`)로 이중화. 복제 금지.

**[MED] 포커스 링 가시성.** 캡처 5의 포커스 인풋은 퍼플 보더로 명확 — 좋은 신호. 다크 재매핑 시 `--brand` 2px outline으로 동등 가시성 유지 필요(§3a `.tag-field:focus-visible`).

**[LOW] 상태 dot 대비.** "시작전" 회색 dot은 다크 표면에서 대비 확보 필요 → `--text-muted`(card 위 ≈4.7:1, `globals.css:18` AA 충족)로 매핑.

**[LOW] 탭 구분자 "···" 의미 전달.** 순서 의존성을 시각화하나 스크린리더엔 무의미 → `role="tablist"` + 순서는 DOM 순으로 전달, "···"는 aria-hidden.

---

## 6. 제안 티켓

각 제안은 `roadmap-milestones.md`의 파트별 100%(P1~P9)에 매핑. 현재 열린 파트는 P9(배포, 유보)뿐이고 P8(디자인)은 **닫힘이나 "신규 표면 추가 시 그 표면만" 재개 조건**이 있다(`roadmap-milestones.md:160`). 2026-07-09 방향 재정의("기능별 명세+UI+UX 고도화", 같은 파일 :186)가 이 캡처들의 상위 근거다.

- **T1 · TagInput 공용 컴포넌트 신설** — 칩+X+추가 인풋을 `src/components/ui/TagInput.tsx`로(§3a). *왜:* PRD 속성 설정의 사용자 역할·기기에서 2회 반복인데 공용 컴포넌트 부재(Grep 0건), 하드코딩 반복 위험. → **P8 재개(신규 표면 컴포넌트)** / P3(읽기 각도 — PRD 편집 표면 고도화).
- **T2 · 캡처 시안 다크+블루 재매핑 확정** — 라이트/퍼플 시안을 §3 토큰 매핑으로 구현. ✅ **퍼플 세컨더리 신설 안 함 확정(2026-07-11 창업자 판정) — 블루 단일.** *왜:* 확정 DS와 충돌하는 시안을 방치하면 구현 단계에서 원칙 위반이 새어든다. → **P8(디자인 기계적 정합·시각 승인)**.
- **T3 · 상세 패널 승인/거절 위계 정리** — 헤더·하단 바 중복 CTA 단일화. *왜:* filled 1영역 1개 원칙 위반·CTA 모호(§5 HIGH). → **P8(인지 진단 HIGH 해소)**.
- **T4 · 중요도 미터·상태 배지 접근성 이중화 확인** — `PriorityBars`/`StatusPill`이 캡처를 대체하며 색+개수+aria 이중화 유지 검증. *왜:* 캡처는 색 단독 지시(§5 MED). → **P8(진단 HIGH 해소)** / P3.
- **T5(조건부) · ProgressBar 공용 추출** — 진행률 바가 PRD 외 탭에서도 쓰이면 공용화, 아니면 보류. *왜:* 재사용 2회 미확인 시 YAGNI(`file-structure.md`). → **P8**. *(선편성 금지 — 재사용 근거 확인 후.)*
- **T6 · 빌더 표면 입체화(명도+그림자) 패스** — 빌더 내부(패널·카드·리스트·플로팅)를 선-단독 구분에서 `bg-card/elevated + shadow 4단` 짝으로 전환, 버튼 affordance(filled/ghost) 명확화. *왜:* 현 UI가 평면적·비효율적(창업자 2026-07-11), Stitch·Claude식 입체감 요구. DS에 수단(명도 3단·그림자 4단) 이미 있어 토큰 신설 없이 적용 가능. → **P8(신규 표면 재개 조건)**.

> 백로그 소진용 제안은 넣지 않았다. T1·T3·T4는 P8 재개 조건에 직접 기여, T2는 시각 승인 갱신, T5는 조건부.

---

## 7. 미확인

- **정확 색값(hex):** 퍼플 액센트·★ 주황·분홍 막대·라벤더 콜아웃 배경의 정확 hex는 캡처만으로 확정 불가 → 지어내지 않음. §3은 전부 우리 토큰으로 대체.
- **원 출처 제품:** 신규 방향 프로토타입인지 경쟁사(manyfast/Manifest) 캡처인지 캡처만으로 미확인(상단 주의).
- **hover/active/disabled 상태:** 태그·버튼·옵션의 인터랙션 상태는 정적 캡처라 미관찰 → §3 CSS는 우리 관례(hover=브랜드)로 채운 제안값.
- **드래그 핸들 아이콘 실존:** `src/components/ui/icons.tsx`에 6-dot 핸들 존재 여부 미확인(본 조사에서 icons.tsx 미열람).
- **PRD 진행률 바 공용화 실태:** `ProductRequirementView.module.css`에 진행률 스타일 존재(Grep 매치)까지만 확인, 공용 컴포넌트 추출 여부·타 탭 재사용은 미확인.
- **반응형·전환 애니메이션·패널 리사이즈:** 캡처 밖.
- **Select 옵션 pill variant:** 캡처는 옵션마다 아웃라인 pill인데 우리 `Select`는 평문 행 — pill 옵션 지원 필요 여부(디자인 확정) 미확정.
- **정확 치수(±):** §2의 px는 2x 스크린샷 추정 환산 근사, 실측 아님.
