---
description: 티켓 구현 완료 후 code-reviewer + opin-qa가 독립적으로 병렬 크로스체크한다.
---

# /cross-check — 멀티 에이전트 크로스체크

티켓 구현이 끝났을 때 실행한다. 두 에이전트가 독립적으로 같은 변경사항을 검토하고, 결과를 취합해 pass/fail 판정을 내린다.

$ARGUMENTS

---

## Step 1 — 변경 범위 파악

```bash
git diff main...HEAD --stat --name-only
```

변경 없으면 "크로스체크할 변경사항 없음" 출력 후 종료.

변경된 파일 목록에서 다음을 분류한다:

- **API 파일 포함 여부**: `src/app/api/` 하위 파일 존재 시 → `opin-be` 추가
- **프론트 파일 포함 여부**: `src/app/`, `src/components/` 하위 `.tsx` 파일
- **마이그레이션 포함 여부**: `supabase/migrations/` 하위 `.sql` 파일

---

## Step 2 — 병렬 독립 리뷰 (TeamCreate)

아래 에이전트들을 **동시에** 호출한다. 에이전트 간 결과를 공유하지 않는다.

### 에이전트 A: code-reviewer

다음 프롬프트로 `code-reviewer` 에이전트를 호출한다:

```
OPINION 프로젝트 크로스체크 — 코드 품질·보안 리뷰

git diff main...HEAD 결과를 분석해 아래 항목을 검토한다:

1. 보안 취약점
   - RLS 우회 가능성 (adminClient를 user context에서 사용 시)
   - env 노출 (NEXT_PUBLIC_ prefix 없는 키를 클라이언트에서 사용)
   - SQL injection / XSS 가능성

2. TypeScript 타입 안전성
   - `any` 사용
   - 타입 캐스팅 (as unknown as X 패턴)
   - null 체크 누락

3. 에러 핸들링
   - 빈 catch 블록
   - 에러 응답 없는 API 라우트
   - 부동 Promise (void 처리 없는 비동기)

4. OPINION 규칙 준수
   - 하드코딩 색상 (#fff, "#3182f6" 등) — COLOR 토큰 사용 여부
   - 버튼 텍스트 "~하기" 형태 여부
   - SELECT * 사용 금지
   - 제거된 기능 참조 (poll, gifticon, withdrawal)
   - 파일 크기 350줄 초과 여부

5. 로직 정확성
   - 상태 머신 위반 (draft→closed 직행 등)
   - 포인트·보상 정책 이탈

각 항목을 CRITICAL / HIGH / MEDIUM / LOW 심각도로 분류해 리포트한다.

변경된 파일 범위: [Step 1에서 파악한 파일 목록 삽입]
```

### 에이전트 B: opin-qa

다음 프롬프트로 `opin-qa` 에이전트를 호출한다:

```
OPINION 프로젝트 크로스체크 — QA 커버리지 리뷰

git diff main...HEAD 결과를 분석해 아래 항목을 검토한다:

1. 해피 패스 커버리지
   - 변경된 기능의 주요 사용자 플로우가 구현됐는가

2. 엣지케이스 누락
   - 빈 상태 (empty state) 처리
   - 로딩 상태 처리
   - 에러 상태 UI

3. 권한·인증 엣지케이스
   - 비로그인 접근 시 처리
   - 타인 리소스 접근 시 처리 (소유권 체크)

4. 경쟁 조건·중복 제출
   - 이중 클릭 방지
   - 낙관적 업데이트 롤백 처리

5. docs/policy/ 정책 준수
   - 포인트 정책 (points.md)
   - 설문 상태 머신 (survey.md)
   - 어뷰즈 방지 (abuse.md)

6. 회귀 위험
   - 변경이 기존 플로우를 깰 가능성

각 항목을 CRITICAL / HIGH / MEDIUM / LOW 심각도로 분류해 리포트한다.

변경된 파일 범위: [Step 1에서 파악한 파일 목록 삽입]
```

### 에이전트 C: opin-be (API 파일이 있을 때만)

API 또는 마이그레이션 파일이 포함된 경우에만 다음 프롬프트로 `opin-be` 에이전트를 호출한다:

```
OPINION 프로젝트 크로스체크 — 백엔드 / DB 리뷰

git diff main...HEAD 결과에서 API 라우트와 마이그레이션을 분석한다:

1. RLS 정책 일관성
   - 새 테이블 또는 컬럼 추가 시 RLS 정책 작성됐는가
   - admin client 사용이 정당한가 (cron / 서버 전용 경로인가)

2. 쿼리 효율성
   - SELECT * 사용 금지 — 필요한 컬럼만 조회하는가
   - N+1 쿼리 패턴 없는가
   - batch write 대신 단건 write 반복 없는가

3. 트랜잭션 안전성
   - ledger insert + eligibility update 같은 복합 write의 rollback 처리
   - 부분 실패 시나리오 처리

4. API 명세 일치
   - docs/api/ 문서가 구현과 일치하는가
   - 새 endpoint가 문서에 추가됐는가

각 항목을 CRITICAL / HIGH / MEDIUM / LOW 심각도로 분류해 리포트한다.

변경된 파일 범위: [Step 1에서 파악한 파일 목록 삽입]
```

---

## Step 3 — 결과 취합 및 판정

각 에이전트의 리포트를 취합해 아래 형식으로 출력한다.

```
## 크로스체크 결과

### 변경 범위
- 파일 N개: [파일 목록 요약]
- API 변경: 있음 / 없음
- DB 마이그레이션: 있음 / 없음

---

### 🔴 CRITICAL (즉시 수정 필요)
- [에이전트 출처] 항목 설명
  → 수정 방향

### 🟠 HIGH (머지 전 수정 권장)
- ...

### 🟡 MEDIUM (다음 티켓에서 처리 가능)
- ...

### 🟢 통과 항목
- code-reviewer: 보안 ✅ / 타입 ✅ / OPINION 규칙 ✅
- opin-qa: 해피패스 ✅ / 엣지케이스 ✅ / 정책 ✅
- opin-be: RLS ✅ / 쿼리 ✅ / 문서 ✅  (해당 시)

---

### 판정

**✅ PASS** — CRITICAL / HIGH 없음. 머지 가능.
또는
**❌ FAIL** — CRITICAL N개, HIGH N개. 수정 후 재체크.
또는
**⚠️ CONDITIONAL PASS** — CRITICAL 없음, HIGH N개. HIGH 항목 인지 후 머지 가능.
```

CRITICAL 항목이 하나라도 있으면 **FAIL**. 에이전트가 직접 수정 가능한 CRITICAL은 수정 후 재판정한다.
