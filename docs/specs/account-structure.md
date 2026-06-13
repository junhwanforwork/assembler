# Account Structure — 계정·멤버십 스펙 (ASS-045)

Assembler 계정 계층·MemberType·권한 매트릭스의 단일 출처.
Phase 9(ASS-046~055) 전 티켓이 이 문서에서 파생된다. 확정일: 2026-06-12.

## Origin

현재는 완전 비로그인 — localStorage UUID → `x-session-id` 헤더 → `wf_projects.session_id` RLS
(+ 앱 레벨 `.eq("session_id")` 이중 가드, b1951e8). 공유 링크(ASS-040)·협업 아바타(ASS-041)가
들어오면 "누가 무엇을 할 수 있는가"를 매번 즉흥 판단하게 되므로, 구현 전에 계층과 권한 표를
먼저 고정한다. UI 가드와 API 가드가 서로 다른 기준으로 갈라지는 사고를 막는 게 목적이다.

---

## 계층 구조 — 개인 + 팀 2단 (GitHub식)

```
User (개인 계정)                Team "우리회사"
├── 내 프로젝트 A               ├── 멤버: 나(owner), 동료(editor)
└── 내 프로젝트 B               ├── 팀 프로젝트 C
                                └── 팀 프로젝트 D
```

- 프로젝트는 **개인 또는 팀 중 정확히 하나**에 소속된다 (네임스페이스).
- 팀은 여러 개 만들 수 있고, 한 User는 여러 팀에 속할 수 있다.
- 개인 프로젝트는 생성자가 owner. 팀 프로젝트는 팀 멤버 역할이 상속된다.

## MemberType (4종)

| MemberType | 정의 |
| --- | --- |
| `owner` | 모든 권한 + 삭제·소유권 이전. 팀·프로젝트당 항상 1명 이상 — 마지막 owner는 강등·제거 불가 |
| `admin` | 멤버 초대·관리, 공유 링크 관리 가능. 삭제·소유권 이전은 불가 |
| `editor` | 객체 편집·AI 생성 가능. 관리 권한 없음 |
| `viewer` | 읽기 전용 — 그래프 탐색만 |

- 멤버가 아니면 어떤 권한도 없다 (기본 거부 — deny by default).

## 권한 매트릭스

| 행위 (PermissionAction) | owner | admin | editor | viewer |
| --- | :-: | :-: | :-: | :-: |
| `viewProject` — 그래프 보기·탐색 | ✅ | ✅ | ✅ | ✅ |
| `editObjects` — 객체 생성·수정·삭제 (Requirement/Feature/Page/UIElement/Mapping…) | ✅ | ✅ | ✅ | ❌ |
| `runGeneration` — AI 생성 실행 (비용 발생) | ✅ | ✅ | ✅ | ❌ |
| `manageShareLink` — 공유 링크 생성·끄기 | ✅ | ✅ | ❌ | ❌ |
| `manageMembers` — 멤버 초대·역할 변경·제거 | ✅ | ✅ | ❌ | ❌ |
| `deleteProject` / `transferOwnership` — 삭제·소유권 이전 | ✅ | ❌ | ❌ | ❌ |

판단 기준: **그래프 내용을 바꾸는 행위는 editor까지, 사람·노출을 관리하는 행위는 admin까지,
프로젝트의 운명을 바꾸는 행위는 owner만.** 객체 단위 세분 권한(예: Feature만 편집)은 만들지
않는다 — 객체는 전부 연결돼 있어 부분 편집 권한은 그래프 무결성을 깬다(카디널 룰 1).

이 표가 단일 출처다 — 추후 `src/lib/types/member.ts`의 `MEMBER_PERMISSIONS`(ASS-051)가
이 표에서 파생되고, UI 가드·API 가드 모두 그 매트릭스 하나만 참조한다.

## 역할 적용 레벨 (Figma식 2레벨)

- **팀 레벨:** 팀 멤버 역할이 팀 소속 모든 프로젝트에 상속된다.
- **프로젝트 레벨:** 팀 밖 사람도 프로젝트 단위로 직접 초대 가능 (`project_members`).
- 두 레벨이 충돌하면 **높은 권한 우선** (팀 editor + 프로젝트 admin → admin).

## 가드 원칙

- **API/RLS가 정본, UI는 편의.** UI에서 버튼을 숨기는 것은 UX이고, 실제 차단은 API 라우트와
  RLS에서 한다 (b1951e8 이중 가드 패턴 계승).
- 모든 가드는 권한 매트릭스에서 파생 — 라우트별 즉흥 조건문 금지.
- 권한 오류 카피(해요체, `ux-writing.md` 권한 템플릿 `"[이유]로 이용할 수 없어요. [대안]해 주세요."`):
  - viewer가 편집 시도: `"보기 전용으로 공유된 프로젝트예요. 편집하려면 소유자에게 요청해 주세요."`
  - 비멤버 접근: `"접근할 수 없는 프로젝트예요. 공유 링크를 다시 확인해 주세요."`

## 인증 단계

1. **ASS-046 이메일 매직링크** (Supabase Auth) — 첫 로그인 수단.
2. **ASS-047 OAuth** — Google·GitHub 추가.

## 세션 → 계정 마이그레이션 (ASS-050)

- 로그인 성공 시 localStorage `session_id` 소유 데이터를 user 귀속으로 이전 —
  대상 3곳: `wf_projects` · `saved_items` · `workspace_shares` (모두 동일 session_id 패턴).
- 이전 후에도 비로그인 사용은 유지 (세션 = 임시 개인 공간, 로그인하면 흡수).
- RLS는 `x-session-id` 기반 → `auth.uid()` + MemberType 기반으로 재설계 (ASS-049).

## 공유 링크 통합 (ASS-040 ↔ ASS-054)

- 공유 링크 접속자(비멤버) = **`viewer` 권한 경로** — `viewProject`만 통과.
- 별도 권한 체계를 만들지 않고 같은 매트릭스의 viewer 행으로 처리한다.

## 고위험 구간

teams·team_members·project_members 스키마(ASS-048)와 RLS 재설계(ASS-049)는
**보안·RLS/스키마 영역 → `/multi-team` 병렬 3팀** 대상. 테이블 컬럼·인덱스 상세는
로그인 방식 구현(ASS-046) 후 해당 티켓에서 확정한다 — 여기서 미리 고정하지 않는다.
