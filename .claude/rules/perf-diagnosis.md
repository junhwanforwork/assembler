---
paths:
  - "src/**/*.{ts,tsx}"
---

# 성능 진단 — Performance Research Agent

성능이 느리다는 신호가 있을 때 코드를 만지기 **전에** 따르는 절차. 일반 코딩 보조가 아니다.
근거를 먼저 증명하고, 그 근거에 매칭되는 레퍼런스만 읽고, 적용 가능한 패턴만 코드에 옮긴다.

---

## Origin

builder 라운드에서 두 가지 체감 지연을 진단했다 — 플로우 노드 드래그가 `pointermove`마다
글로벌 store를 ~60Hz로 쓰면서 전 구독자·전 엣지를 매 프레임 재렌더했고(`ScreenNode`→`moveScreen`),
Inspector 속성 입력이 키 입력마다 `screens[]→blocks[]→props{}` 3중 클론으로 블록 리스트 전체를
재렌더했다. "느린 것 같다"로 아무 데나 `React.memo`를 뿌리는 대신, **증거→가설→타겟 리서치→패턴 적용**
순서를 규칙으로 고정한다. 진단 기록 예시: `~/.claude/plans/`의 perf 진단 문서.

---

## 핵심 원칙

- **No evidence, no fix.** 코드 근거(파일:라인) 없이 최적화하지 않는다.
- **No bottleneck, no research.** 가설을 세우기 전에 블로그부터 읽지 않는다.
- **No generic best practices.** "React 성능" 같은 광역 검색 금지 — 가설에 정확히 매칭되는 주제만.
- **Vibes 최적화 금지.** 측정으로 확인되지 않은 추정만으로 구조를 바꾸지 않는다.
- **라이브러리 임의 추가 금지.** 이득이 분명하지 않으면 도입하지 않는다.
- **블로그 요약 금지.** 적용 가능한 엔지니어링 패턴만 추출한다. ("React.memo가 빠르다" ❌ /
  "키 입력이 부모 상태를 갱신하면 형제가 전부 재렌더 → 값은 로컬 state, 커밋은 blur/debounce" ✅)
- 디자인 시스템·네이밍·UX 동작은 보존한다(`ds-tokens.md`·`ux-writing.md`).

---

## 7단계 순서 (엄수)

1. **현행 이해** — 폴더/라우팅/컴포넌트 트리/상태 소유/데이터 흐름/리스트 렌더/레이아웃·캔버스 계산.
2. **슬로우 인터랙션 확정** — "타이핑·드래그·스크롤·줌·로드·저장" 중 *실제 체감* 느린 지점만.
3. **코드 근거 가설** — 인터랙션별로 가설(무엇이·어디서·왜 느린가)에 **파일:라인 증거**·검증 방법·확신도.
4. **타겟 리서치** — 가설에 매칭되는 것만. 우선순위: 공식문서 > 프레임워크 메인테이너 >
   제품 엔지니어링 블로그(Figma/Linear/Notion 등) > GitHub 이슈/토론 > 개인 블로그(직접 관련 시).
5. **패턴 대조** — 레퍼런스 패턴을 현행 코드와 대조해 적용 여부·필요 변경·리스크 판단.
6. **백로그(P0~P3)** — Impact/Risk/Scope·파일·QA 방법으로 분류.
7. **작은 단위 실행 + QA** — 한 번에 다 바꾸지 않는다. 단계마다 빌드·프로파일 검증 후 다음.

---

## 출력 포맷

```
## Architecture Overview / Component Tree / State Tree / Data Flow / Potential Bottlenecks
## Root-Cause Hypotheses   (가설 · evidence(파일:라인) · files · verify · confidence · expected impact)
## References / Patterns   (source · 적용 가능성 · 추출 패턴 · 적용 X 항목)
## Improvement Backlog      (P0~P3 · impact · risk · scope · files · QA)
## Execution Plan           (단계별 · rollback · QA checklist)
## QA Result
```

확인은 React DevTools Profiler("highlight updates")로 변경 전/후 커밋 수를 비교해 **증거로 기록**한다.
이 룰은 `/multi-team` 순차 릴레이와 함께 쓴다(A 구현 → B·C 관점 리뷰 → 개선).
