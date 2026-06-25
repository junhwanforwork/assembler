# /goal 플레이북 — assembler에서 목표 기반 자율 실행

`/goal`(Claude Code v2.1.139+)로 완료 조건을 걸면, 매 턴 후 작은 모델(Haiku)이 조건 충족을 판정하고
충족 전까지 사람 프롬프트 없이 다음 턴을 잇는다. assembler에서 이걸 **기능별 QA 시나리오 통과**와
**피그마급 perf 바**에 쓰기 위한 규칙·템플릿·안전 레일을 정의한다.

설계 맥락·근거: `~/.claude/plans/`의 perf/goal 도입 플랜. 관련 스펙: `automation-cycle.md`(autopilot),
`health-sweep.md`(회귀 델타), `acceptance/`(수용 시나리오 포맷).

---

## 철칙 — 트랜스크립트 증거 규칙 (이걸 어기면 goal이 무의미)

> **평가자는 "대화 트랜스크립트에 이미 드러난 것"만 판정한다. 스스로 명령을 실행하거나 파일을 읽지 않는다.**
> ([docs](https://code.claude.com/docs/en/goal))

따라서 모든 조건은 **Claude가 트랜스크립트로 찍어내는 증거**로 표현한다.

- ✅ `e2e/ASS-NNN.spec.ts → N passed 0 failed` (실행 출력이 트랜스크립트에 남음)
- ✅ `npm run perf → flow-drag PASS, 회귀 0` (perf 스펙 표가 stdout)
- ✅ `tsc·lint·build ✅` · `tickets.md에서 ASS-NNN [x]`
- ❌ "성능이 빨라졌다" · "버그가 없다" (측정·실행 출력 없는 주관)

---

## 4종 세트 조건 (End + Verification + Constraints + Turn limit)

목표는 항상 이 네 조각으로 쓴다. 빠지면 헛돌거나 무한 루프 난다.

| 조각 | 내용 |
|---|---|
| **End(측정 가능한 최종 상태)** | 티켓 `[x]`, 테스트 green, 예산 PASS, 큐 비움 |
| **Verification(입증 방법)** | 어떤 명령 출력으로 입증하는가 — `npm run e2e`·`npm run perf`·`tsc·lint·build` |
| **Constraints(불변)** | 그 과정에서 바뀌면 안 되는 것 — "티켓 범위 밖 파일·다른 테스트 미수정" |
| **Turn limit(상한)** | 무한 루프 방지 — "30턴 또는 빌드/QA 2회 연속 실패 시 중단 보고" |

---

## 재사용 goal 문구

### 기능 완료 (수용 시나리오 기반)
`acceptance/ASS-NNN.md`의 DoD를 그대로 조건으로 쓴다.
```
/goal ASS-NNN done: e2e/ASS-NNN.spec.ts 전부 통과(N passed 0 failed 출력) AND
(perf 닿으면) npm run perf 닿는 인터랙션 PASS+회귀0 AND tsc·lint·build 전부 ✅ AND
tickets.md에서 ASS-NNN이 [x]+날짜. 제약: 티켓 범위 밖 파일·다른 테스트 미수정.
30턴 또는 빌드/QA 2회 연속 실패 시 중단 보고.
```

### Perf 단독 (피그마급 바)
```
/goal npm run perf 출력에서 닿는 인터랙션(flow-drag·inspector-commit·wireframe-load) 모두
예산 PASS, longFrames 0, baseline 대비 회귀 0. 제약: 동작 변경 없는 perf 변경만. 20턴 후 중단.
```

### Autopilot 무인 자율 (전체 사이클)
`automation-cycle.md` 사이클을 한 조건으로. perf 게이트 포함.
```
/goal 다음 todo 티켓을 구현→tsc·lint·build→/cross-check QA→npm run perf 게이트 전부 green,
tickets.md [x]+날짜, PR 생성까지. 제약: 한 번에 한 티켓·클린 git 유지·티켓 범위 밖 미수정.
빌드/QA/ perf 2회 연속 실패 시 중단 보고.
```

---

## Perf 바 — 하이브리드 (핵심 4종 RAIL 절대 + 그 외 회귀 가드)

[RAIL](https://marcradziwill.com/blog/web-performance-rail-model/) 기준. e2e 게이트는 **헤드리스 보정 예산**,
괄호는 프로덕션 목표(React DevTools Profiler로 수동 측정 — `perf-diagnosis.md`).

| 인터랙션 | 헤드리스 예산 | prod 목표 | 측정 |
|---|---|---|---|
| flow-drag 프레임 | p95 ≤ 40ms | 16.7ms(60fps), longFrames 0 | `/perf?surface=flow` RAF 프로브 |
| inspector-commit | ≤ 120ms | 50ms | `/perf` 커밋→다음 프레임 measure |
| wireframe-load TTI | ≤ 2000ms | 2000ms | `/perf` 콜드 네비 월클럭 |
| 그 외 전역 | baseline 회귀 0 | — | health-sweep 델타 |
| ⏸ canvas-pan | deferred | — | InfiniteCanvas 미배포(ASS-033/034) |

증거 회로는 `/perf` 하네스(`src/app/(builder)/perf`) + `src/lib/perf`(no-op 게이트) + `e2e/perf.spec.ts`.

---

## 안전 레일 (community 권고 — 어기면 사고)

- **첫 이터레이션 감시.** 초기 해석이 전체를 좌우 → 어긋나면 즉시 중단·교정·재시작.
- **클린 git = 롤백 보장.** goal은 수십 파일을 자율 수정 → 사이클 간 트리 클린 강제.
- **턴 예산 내장.** 조건에 `N턴/2회 실패` 절을 항상 넣는다.
- **승인 게이트.** commit·push·PR은 무인 자율 회로가 검증된 뒤에만 켠다(검증 전엔 사람 승인).

---

## 현재 deferred (정직하게 기록 — silent cap 금지)

- **canvas-pan perf** — InfiniteCanvas 미배포. 계측 코드는 보존, 배포(ASS-033/034) 시 `/perf`에 surface 추가.
- **perf-baseline.json 회귀 델타** — 현재 게이트는 예산 기반(예산 초과만 잡음). 예산 내 회귀 추적은 후속.
- **번들 사이즈 가드** — Next16 Turbopack에서 `@next/bundle-analyzer` 적용 불확실 → 보류.
