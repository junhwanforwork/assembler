# AI Prompt 대화 UX (Assembler)

AI Prompt 패널(아이디어→제품 그래프 생성)의 **대화 상호작용 형식** 단일 출처.
Epic **ASS-E03**의 구현 근거. LLM 파이프라인은 `ai-prompt-generation.md`(ASS-E01), 레이아웃은 `builder-layout.md` §1·§4.

확정일: 2026-06-14. 사용자 확정: **모호할 때만 되묻기**(Lovable식 빠른 생성) · **번호 답변 = 칩 클릭 + 번호 타이핑 + 자유입력**(Claude AskUserQuestion + Other).

---

## Origin

현 `PromptPanel.tsx`는 `{role,text}` 평문 로그뿐 — 되묻기·선택지·번호 답변·생성 진행·요약이 전부 미구현.
"Lovable급 대화 + Claude식 번호 선택"을 만들려면 대화를 **구조화 블록**으로 표현하고, AI가 *언제* 되묻고 *어떻게* 생성을 보여줄지 고정해야 한다. 이 문서가 그 형식을 박는다.

---

## A. 대화 메시지 모델 (구조화 블록)

`src/lib/types/chat.ts`(ASS-065). PromptPanel 로컬 `type Line` 대체.

```ts
type ChatMessage =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "assistant"; blocks: AssistantBlock[] }

type AssistantBlock =
  | { kind: "text"; text: string }
  | { kind: "clarify"; question: string; options: ClarifyOption[]; multiSelect?: boolean; answeredOptionIds?: string[] }
  | { kind: "progress"; steps: ProgressStep[] }
  | { kind: "summary"; text: string; needsReviewCount?: number; suggestions?: ClarifyOption[] }

type ClarifyOption = { id: string; label: string }                 // 번호는 UI에서 index+1 파생 (데이터에 저장 안 함)
type ProgressStep = { label: string; status: "pending" | "running" | "done"; count?: number }
```

- 어시스턴트 메시지는 **블록 배열** — 텍스트 + clarify/progress/summary를 한 턴에 섞을 수 있다.
- 옵션 번호는 **렌더 파생**(Claude식). 데이터엔 `id`만.
- MVP 대화 로그는 그래프 store 인메모리. 프로젝트 영속은 후속(§D-7).

---

## B. 대화 흐름 (turn 구조)

```
사용자 아이디어/답변
  → [라우터 턴]  haiku + structured output: { kind: "clarify" | "generate" }
       ├ clarify  (정보 치명적 부족 시에만, ≤1 라운드)
       │     → clarify 블록(질문 1 + 옵션 2~4) → 사용자 번호 답변 → 다시 라우터
       └ generate
             → [생성 턴]  opus + structured outputs → ProjectGraph (ai-prompt-generation.md)
             → progress 블록(체인 순서 스켈레톤) → 그래프 store 반영
             → summary 블록(1줄 요약 + "확인 필요" + 다음 단계 제안)
```

- **기본은 바로 generate.** clarify는 "누가 쓰는지/핵심 기능이 통째로 비었는지" 같은 치명적 모호함에만. 빠른 맛(Lovable) 유지, 되묻기 ≤1 라운드.
- 라우터=haiku(저비용 판정), 생성=opus(품질). 모델 라우팅은 `ai-prompt-generation.md` §1.
- 편집 턴("이 버튼 색 바꿔")은 부분 수정 — 전체 재생성 X (ASS-037/038).

---

## C. 형식 3종 (요청 핵심)

### ① AI 답변 형식 (해요체 — `ux-writing.md`)
- 행동 먼저·간결. 기술 용어·합쇼체 금지.
- **clarify**: 질문 1개 + 번호 옵션 2~4 + "직접 입력도 가능" 힌트.
- **생성 중**: progress 스켈레톤(스피너 X).
- **완료**: 1줄 요약("로그인·예약·마이페이지 3화면을 만들었어요") + 다음 단계 번호 제안.
- **에러**: 해요체 + 재시도 안내 (ASS-020). `stop_reason: refusal` 가드.

### ② 생성 형식 (`builder-layout.md` §1 B)
- progress 블록이 **체인 순서**로 차오름: `Requirement → Feature → Page → UIElement → Api → Database`. 캔버스 스켈레톤이 같은 순서로 채워짐.
- **MVP**: 응답 완료 시 단계별 `count` 표시(거친 진행). **진짜 객체별 스트리밍**(부분 JSON 파싱)은 후속 — anthropic.ts 스트리밍(ASS-060) 선행.

```
AI: 만들게요. 잠시만요…
  ✓ Requirement 3
  ✓ Feature 4
  ○ Page 생성 중…
  · UIElement
  · Api / Database
```

### ③ 사용자 번호 답변 형식 (Claude식 + Lovable급)
- clarify 옵션을 **칩**으로 렌더 — `[1. 시간대 선택] [2. 인원수] [3. 둘 다]` + "직접 입력도 가능" 힌트.
- 답하는 3경로 (전부 허용):
  1. **칩 클릭** → 해당 옵션 선택.
  2. **번호 타이핑** → 입력창에 `"2"` → 옵션 index 매핑.
  3. **자유 텍스트** → 그대로 모델에 전달(= Claude의 Other).
- **멀티선택**(`multiSelect`) 지원. 답하면 선택 칩이 고정 상태(`answeredOptionIds`)로 잠김.
- AskUserQuestion 패턴 흡수: 옵션 2~4개, "Other" = 자유 입력.

---

## D. 필요한 것 (gaps)

1. **anthropic.ts 스트리밍** — 스켈레톤 스트리밍 전제. ASS-060에 추가.
2. **대화 라우터 턴** — clarify vs generate 판정. ASS-067.
3. **편집·수정 턴** — 부분 수정(전체 재생성 X). ASS-037/038, 대화 모델이 edit 턴 수용.
4. **"확인 필요" 표면화** — 생성 그래프의 ASS-019 마커를 summary에서 안내 + 번호 점프. `isMappingComplete`(`src/lib/graph/selectors.ts`) 재사용.
5. **빈 상태(A) 진입** — 토픽 추천 칩 + 파일 업로드 = ASS-059, 대화 칩 형식(ASS-066) 공유.
6. **생성 취소/중단** — 스트리밍 중 stop. 후속.
7. **대화 영속** — 프로젝트별 로그 저장 여부. 후속 결정.

---

## 구현 티켓 (Epic ASS-E03)

ASS-065(메시지 모델) → ASS-066(번호 선택 UI) → ASS-067(라우터 턴) → ASS-068(생성 진행) → ASS-069(완료 답변).
선행: ASS-060(스트리밍·structured outputs) · ASS-018(/api/generate) · ASS-019(검증·"확인 필요" 마커). 각 티켓 `/multi-team` + 빌드 게이트.
