작업 내용을 분석해서 트랙과 에이전트를 결정하고 실행 계획을 출력한다.

## Step 1 — 트랙 판단

아래 기준으로 **Full Cycle** 또는 **Fast Track** 중 하나를 결정한다.

### Full Cycle (PM→design→FE/BE→QA)

아래 중 하나라도 해당하면 Full Cycle:

- 새 기능 또는 새 페이지
- 사용자 플로우/UX가 바뀜
- DB 스키마 변경 필요
- 비즈니스 정책 결정 필요
- 영향 범위 3개 파일 초과 예상
- 보안/결제(FEATURE.md) 관련

### Fast Track (FE/BE → QA 선택)

아래 조건 **모두** 해당하면 Fast Track:

- 기존 기능 내 개선 (UX 흐름 변경 없음)
- 영향 범위 1~3개 파일
- 정책 결정 불필요
- 텍스트, 스타일, 버그 수정, 성능 개선

---

## Step 2 — 트랙별 실행 계획 출력

### Full Cycle 출력 형식

```
트랙: Full Cycle

① howcloud-pm — [할 일]
② howcloud-design + ui-ux-designer — UX 검증, 상태 정의, 인터랙션 명세
   └─ /ui-ux-pro-max 로 레퍼런스 패턴 확인
③ howcloud-fe — [할 일]
   └─ /frontend-design 으로 컴포넌트 구현 (howcloud 디자인 시스템 기반)
   └─ design-tokens.ts COLOR 토큰 필수
③ howcloud-be — [할 일] (FE와 병렬 가능 시 동시 실행)
④ howcloud-qa — [검증 범위]
```

### Fast Track 출력 형식

```
트랙: Fast Track

① howcloud-fe — [할 일]
   └─ /frontend-design 으로 구현 (디자인 시스템 준수)
① howcloud-be — [할 일] (FE와 병렬 가능 시 동시 실행)
② howcloud-qa — 선택 (이유: [판단 근거])
```

### 디자인 시스템 체크리스트 (FE 단계 필수)

모든 FE 작업에서 아래를 지킨다:

- `COLOR.*` 토큰만 사용 — 하드코딩 `#hex` 절대 금지
- `TYPOGRAPHY.*` 토큰은 일반 페이지에만 적용 (어드민·빌더 등 도구 화면은 Tailwind 유틸 직접 조합)
- 루트 엘리먼트 semantic class 필수 (`_wrap`, `_area`, `_header` 등)
- 버튼 텍스트 "~하기" 형태

---

### 구현 실행 (FE/BE 단계)

계획 승인 후 FE/BE 구현은 `/multi-team HC-{id}` 로 실행한다 — 순차 릴레이(기본), 고위험(보안·FEATURE.md 결제·RLS/스키마·P1)은 병렬 3팀. Full Cycle은 multi-team 진입 전 `howcloud-design` UX 검증을 먼저 한다.

---

## Step 3 — 즉시 실행 여부 확인

계획 출력 후: "이 계획으로 진행할까요?"

YES면 첫 번째 에이전트부터 순서대로 실행.
NO면 사용자 피드백 반영 후 재계획.

---

## 에이전트 역할표

| 에이전트         | 역할                                           |
| ---------------- | ---------------------------------------------- |
| `howcloud-pm`        | 업무 할당, 기능 정의, 정책 결정, PRD           |
| `howcloud-design`    | UX 검증, 상태 정의, 인터랙션 명세              |
| `ui-ux-designer` | howcloud-design 보조 — 레퍼런스, 접근성, 시각 패턴 |
| `howcloud-fe`        | React, Tailwind, zustand 구현                  |
| `howcloud-be`        | Supabase 스키마, API routes, RLS               |
| `howcloud-qa`        | 버그 진단, 테스트 케이스, regression 검증      |
| `prompt-engineer`| AI 프롬프트 최적화 (`/improve-prompt`)         |
| `code-reviewer`  | 보안·품질 종합 리뷰 (보안 전용 에이전트는 TODO) |

작업 내용: $ARGUMENTS
