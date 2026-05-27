---
paths:
  - "src/app/api/**"
---

# HowCloud API Rules

`src/app/api/**` 에 적용.

---

## 기본 규칙

- Supabase only — no alternative DB
- `SELECT *` 금지
- 에러 응답: `{ error: 'snake_case_reason' }` + HTTP status
- 인증 필요 엔드포인트: `createServerClient` + session 검증
- 어드민 전용: 별도 미들웨어 또는 role 체크

## 엔드포인트 목록

| 경로 | Method | 설명 | 인증 |
|------|--------|------|------|
| `/api/implementations` | GET | 피드용 구현 목록 (필터, 페이지네이션) | 불필요 |
| `/api/implementations/[id]` | GET | 구현 상세 | 불필요 |
| `/api/saved` | GET/POST/DELETE | 저장 목록 관리 | session_id or user |
| `/api/share` | POST | 워크스페이스 공유 링크 생성 | 불필요 |
| `/api/share/[slug]` | GET | 공유 링크 조회 | 불필요 |
| `/api/admin/implementations` | GET/POST/PATCH | 콘텐츠 관리 | admin only |

## 저장 API 특이사항

- 비로그인: `session_id` (localStorage UUID) 헤더로 전달
- 로그인 시: session_id → user_id 마이그레이션 처리
- 중복 저장 (같은 feature_type): 기존 항목 반환 + `duplicate: true` 플래그
