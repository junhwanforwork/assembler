# 와이어프레임 UX 레퍼런스 최종 리포트

> 2026-06-20. Balsamiq · manyfast 레퍼런스 분석 → Assembler 화면(와이어프레임) UX 방향 검증.
> 계기: 화면을 literal 1920×1080으로 고정하니 줌아웃해야 보임 → "가장 좋은 구조"를 두 레퍼런스로 확인.

---

## 1. 레퍼런스 핵심

### Balsamiq (와이어프레임 툴 원조)
- **의도적 low-fi.** 3단계 스타일(Draft=fat marker 발상 / Sketch=프로 와이어프레임 / Presentation=이해관계자용). 비주얼 폴리시가 아니라 **구조 결정에 집중**시키는 게 철학.
- **싱글 스크린 단위 편집** — 무한 캔버스 아님. "Single pages, to entire products" — 화면 단위로 관리.
- **드래그앤드롭 UI 컴포넌트 라이브러리** + **재사용 컴포넌트(Symbols)**: 메뉴·버튼 등을 마스터로 만들어 여러 화면에서 재사용 → **= 사용자가 말한 GNB/SNB 공통 컴포넌트 개념.**
- **화면 링크 → 클릭 프로토타입**(유저플로우 시연).
- 코멘트·리액션·실시간 협업.

### manyfast (AI 기획, builder-layout 핵심 레퍼런스)
- docs 인용: *"'무한 캔버스'가 아니라, 유저플로우의 '선택된 페이지(화면)' 단위로 보여주는 뷰어."*
- 디바이스 고정 프레임 fit · 내용 길면 프레임 안 스크롤 · 하단 `< >` 페이지 이동 · 좌하단 줌 · 우측 페이지 목록.
- 상단 단계 탭(요구사항/기능명세서/유저플로우/와이어프레임).

---

## 2. 두 툴의 공통 패턴 (= 신뢰할 만한 정답)
1. **화면 단위 포커스** — 둘 다 인피니트 캔버스를 와이어프레임 "편집/뷰"에 안 씀. → Assembler **ASS-081 포커스 뷰어로 채택 완료.**
2. **의도적 low-fi** — 구조 우선. → ASS-075 적용 완료.
3. **재사용/공통 컴포넌트** — Balsamiq Symbols. → GNB/SNB (사용자 제기, 후속).
4. **화면 간 링크 = 유저플로우** — Balsamiq 클릭 프로토 / manyfast 유저플로우. → 흐름 탭 + UserFlow edge.

---

## 3. Assembler 현재 상태 매핑

| 차원 | Balsamiq | manyfast | Assembler (현재) |
|---|---|---|---|
| 캔버스 모델 | 싱글 스크린 | 페이지 단위 뷰어 | ✅ ASS-081 포커스 뷰어 (디바이스 fit) |
| 충실도 | low-fi 3단계 | low-fi | ✅ 단일 low-fi (ASS-075) |
| 화면+스펙 같이 | 코멘트/노트 | "페이지 정보" | ✅✅ **번호 어노테이션 + Description 패널** (ASS-076/078) — 더 강함 |
| 컴포넌트 라이브러리 | Symbols(재사용) | — | ⏳ GNB/SNB 공통 컴포넌트 (데이터 주도, 후속) |
| 화면 링크/플로우 | 클릭 프로토 | 유저플로우 | ✅ 흐름 탭 + UserFlow edge |
| 페이지 이동 | 프로젝트 네비 | `< >`·페이지 목록 | ✅ PageNav `← N/M →` + 트리 |
| API·데이터 | 없음 | 없음 | ✅✅ **API 카탈로그 테이블** (ASS-080) — 우리 고유 |

---

## 4. Assembler 차별점 (두 레퍼런스에 **없는** 것)
- **매핑 그래프**: 각 UI 요소의 `Action → API → DB → Result` 연결 + 번호 Description. (Balsamiq=그림, manyfast=문서 — 우리는 연결된 스펙)
- **API 카탈로그 테이블**: 비개발자가 읽는 API 운영 표.
- **연결된 객체 그래프**: 요구→기능→화면→요소→API→DB가 id로 엮인 단일 그래프 (글로벌+화면 트리).

→ "그림 그리는 와이어프레임"(Balsamiq)도 "문서 뽑는 기획"(manyfast)도 아닌, **연결 그래프 위의 와이어프레임**이 Assembler의 자리.

---

## 5. 권장 (다음 단계)
1. **화면 뷰 보강(소)**: 줌 컨트롤(옵션 — 둘 다 있음) · 디바이스 토글(desktop/mobile 전환) · 좁은 화면 Description 접기. ASS-081 후속.
2. **공통 컴포넌트(GNB/SNB)** = **Balsamiq Symbols 패턴**: "마스터 컴포넌트"를 한 번 정의 → 여러 화면이 참조(있으면 렌더, 없으면 안 보임). 사용자가 정확히 이걸 직관했음. **모델 확장 필요 → 별도 에픽**(SharedComponent 객체 + 화면 참조 + 렌더 + 생성).
3. **low-fi 스타일 단계(Draft/Sketch/Presentation)는 도입 안 함** — 우리 규모엔 과함. 단일 깔끔한 low-fi 유지.

---

## 결론
ASS-081(포커스 단일 페이지 뷰어)는 **Balsamiq·manyfast 둘 다와 정렬** — 방향이 맞다. "1920 고정→안 보임" 문제의 근본 해법이 화면 단위 포커스였고, 두 원조 툴이 같은 답을 쓴다.
우리 고유 강점(매핑 Description · API 카탈로그 · 연결 그래프)을 유지하면서, **공통 컴포넌트(GNB/SNB)는 Balsamiq Symbols 패턴으로 후속 에픽**에서 제대로 도입하면 된다.

출처: [balsamiq.com/wireframes](https://balsamiq.com/wireframes/) · [docs.manyfast.io](https://docs.manyfast.io/) · [manyfast.io](https://manyfast.io/en/)
