# Tickets — Assembler (리셋 후 새 트랙: ASM-XXX)

> 2026-06 백지 리셋으로 옛 ASS-2XX 트랙 폐기. 이 파일이 새 단일 출처.
> 상태: `Backlog` → `In Progress` → `Done`. 세션 시작/마감 시 자동 갱신(/initiate·/checkout).

> 웨이브 편성 기준 = `docs/specs/roadmap-milestones.md` 탈출 조건. 백로그 소진은 목표가 아니다.

## In Progress

(없음 — 8차 웨이브 2차 통합 완료, push·시각 승인 대기. 다음: 9차 = M1-F [ASM-050·048·051].)

## Backlog

### ASM-015 · 경로 B — 코드 연결 온보딩 (T6·T7·T8 묶음)
- **출처:** 온보딩 진단 리포트 B 묶음
- **내용:** 랜딩 "이미 코드가 있어요" 진입(연결 기능 출시 전엔 가이드 안내만 — 거짓 버튼 금지), 싱크-인 성공 시 "메인" 워크스페이스 자동 생성 + file_generated activity, 연결 온보딩 UX.
- **전제:** MCP 코드 연결 기능 자체가 미구현 — 기능 결정 후 착수.

### M1-B~E 대기 (순차 착수 — roadmap-milestones.md 2026-07-03 개정)

> ASM-032(M1-B)·ASM-035(M1-D 당김)는 6차로, ASM-042·033·034(M1-C)는 7차로, ASM-036(M1-D)·ASM-037(M1-E)은 8차 웨이브로 승격 → In Progress/Done 참조.

### M2 대기 (배포 — **아크 2 뒤로 후순위**, roadmap 2026-07-06 개정)

#### ASM-011 · v1 배포 (Vercel) — M2 핵심
- **출처:** 2026-07-02 리전 점검 — assembler는 Vercel 미배포 상태 확인. 2026-07-02 M2로 승격(도그푸딩 전제).
- **내용:** Vercel 프로젝트 생성·git 연동, **함수 리전 icn1(서울) 명시**(Supabase ap-northeast-2와 정합 — 왕복 지연 원천 차단), env 셋업, 배포 게이트(tsc·lint·build·e2e). 도그푸딩용 최소 — 공유·온보딩 고도화 제외.

#### ASM-031 · 도그푸딩 시나리오·지표 기록 — M2
- **출처:** 2026-07-02 로드맵 확정 — 북극성 지표가 한 번도 측정된 적 없음
- **내용:** 텔레메트리 인프라 없이 수동 측정. 시나리오 문서(기능 1개 추가 + 변경 3건 반영)를 배포 URL에서 수행, 변경 반영 소요 시간·변경 1건당 수정 지점 수 기록. asm_activity 델타가 보조 증거. 산출: `docs/specs/dogfooding-scenario.md` + 지표 기록 1세트.

### ASM-021 · PATCH design 동시 편집 버전 토큰
- **출처:** 2026-07-02 레인 1 범위 밖 발견
- **내용:** 컬렉션 통째 PATCH라 동시 편집 완전 차단엔 `expectedUpdatedAt` 류 클라이언트 버전 토큰 필요. FE는 최신본 재적용으로 창 최소화해 둔 상태 — BE 계약 확장 + FE 배선.

### M3 판정 대기 (자동 착수 금지 — 도그푸딩 신호가 지목할 때만 부활)
- 스펙 N:M 교차 연결 그래프 뷰(B-1) · #44 플로우 노드 선택 · 와이어 실렌더·편집(읽기 구조 렌더는 ASM-034로 승격됨) · ASM-015 잔여(연결 온보딩 UX 고도화)
- (2026-07-03 승격: 패턴 프리미티브 정리→ASM-035[M1-D], #46 읽기 렌더→ASM-034[M1-C])

### ASM-039 · ASM-030 후속 (내보내기 모달 폴리시) — 비차단
- **출처:** 2026-07-03 레인 3 이월
- **내용:** ui/Modal width prop 미지원(ExportModal이 인라인 스타일로 우회) · ExportModal 포털화(스택 컨텍스트) · 재사용/신규 판정에 DB 신규 채널 부재(현재 status 기준 해석 — 문서화된 편차)

> ASM-045·044는 8차 웨이브로 승격(P2 마감 기여, 같은 파일 묶음) → In Progress 참조. 스모크 잔여물 참고: "G-1 스모크 (삭제 가능)" 빈 프로덕트 1행(SQL 정리는 권한 정책상 보류).

> ASM-046·047(진단 HIGH)은 8차 웨이브에 즉시 편입(2026-07-05 승인) → In Progress 참조.

### M1-F 대기 (9차 편성 예정 — 1차 목표 "로컬 기능 QA", roadmap 2026-07-06 개정)

#### ASM-050 · 생성 planned API 제안 [9차 예정]
- **출처:** 2026-07-06 1차 목표 갭 확인 — 생성 컬렉션 6종에 apis 없음(`validate.ts:47`), API=싱크-인 전용 채널이라 아이디어 단독 제품은 API 0(환각 살균이 코드 밖 참조 제거까지).
- **내용:** 생성이 계획(planned) API까지 제안 — 프롬프트+파서 확장, planned/코드-진실 살균 규칙 분리, asm_apis 저장 채널(status=planned 기존 값 활용), 추정 정직 표시(planned 배지), 코드 연결 시 실제 대조. **생성 계약 변경 — prompt-evaluator 골든셋 게이트 필수.** 8차 ASM-045 관측 로그가 회귀 감시 보조.

#### ASM-048 · suggestions 유료 자동 호출 정책 통일 [9차 예정] (진단 V-09/X-04, MED→승격: QA 비용 방어)
- **출처:** ASM-036 진단 V-09/X-04. 8차 통합에서 여정 e2e 실누수로 실증(챗 인풋 포커스=유료 1건) — 로컬 QA 시작 전 필수로 승격(2026-07-06).
- **내용:** 같은 `POST /suggestions`를 SuggestionsCard는 명시 버튼, ChatDock은 **인풋 포커스만으로 자동 발사**(`ChatDock.tsx` onFocus→expand→ensureSuggestions) — 정책 모순+2회 과금 가능+결과 캐시 비공유. 포커스 발화 제거(명시 트리거로)·결과 공유, 장기 한 집 수렴.
- **보강(8차 2차 발견):** ① 늦은 타 워크스페이스 챗 응답이 옛 도크 클로저의 expand()로 유료 suggestions를 1회 발사(결과 폐기)하는 경로도 이 티켓이 함께 닫는다 ② 8차에서 `.dockInput`에 포커스 어포던스가 신설돼 유도 트래픽 증가 — 9차 최우선 유지 근거.

#### ASM-051 · 로컬 기능 QA 시나리오·체크리스트 [9차 예정]
- **내용:** 1차 목표 완주 각본 — 아이디어 1개→생성→5각도+planned API 확인→편집→전파→내보내기, 체크리스트+기록 양식. ASM-031(배포 도그푸딩 시나리오)의 로컬 선행판 — 도달 즉시 사용자 QA 착수용.

### 아크 2 대기 (코드 연결 v1 — 2차 목표, 1차 QA 시작 후 착수)
- 깃 링크 ingestion(공개 GitHub) → TS/Next 파서 1종(자기 레포 기준) → 자동 싱크-인 매핑 → 비개발자 이해 레이어(db-learning 원칙). 웨이브 2~3, 티켓 분해는 착수 시. ASM-015(경로 B 온보딩)가 이 아크에 흡수 예정.

### ASM-049 · 8차 크로스체크·보안 LOW 잔여 묶음 (비차단)
- **출처:** 2026-07-05~06 8차 1·2차 통합 크로스체크·보안 리뷰 — 전부 LOW(중단 규칙 2).
- **1차분:** ① 재시도 잔여 예산 플로어 부재 — 수 ms 잔여로 유료 시도 발사→즉시 504(input 과금 1회 낭비, MIN_ATTEMPT_MS 검토) ② `stop_reason`이 usage 없는 message_start면 미캡처(관측 갭 — usage 독립 캡처) ③ usage.stop_reason API 응답 노출 스트립 여부 판단 ④ refusal·키 미설정도 error 레벨 로그(노이즈) ⑤ journey env 가드가 .env.local 파일 존재만 체크(빈 파일이면 불명확 실패) ⑥ E2E_SEED_SESSION_ID 전환 시 구 세션 시드 잔류(cleanup 자기 세션 한정) ⑦ seed CLI 에러 cause 소실 + Node ≥22.6 전제 engines 미선언.
- **2차분(2026-07-06):** ⑧ prio 꺼진 막대 사실상 비가시(surface-tint 6% — border급 상향 검토) ⑨ ui/Avatar 고아 컴포넌트(auth 배선 때 재사용 or 삭제) ⑩ Button `[aria-disabled]` 시각만 — 핸들러 있는 버튼에 재사용 시 클릭 가드 필요 ⑪ 플로우·와이어 레일 뱃지 동수 노출(단위 통일의 부작용, 기록) ⑫ beforeunload가 에디터 라우트 밖 이탈은 미방어(전역 리스너 검토) ⑬ pending 덮어쓰기 확인 카피에 계획 제목 미표기 ⑭ resetAll 프로덕션 호출처 0 잔존 ⑮ beforeunload returnValue 미설정(구형 호환) ⑯ enum 한글 라벨 4곳 산재(Badges·SpecView·SpecBulkBar·planDiff — 공용 상수 추출) ⑰ diff의 apiIds·dbTableIds 개수 렌더 절충(이름까지는 카드에 apis/dbTables 전달 필요).

### ASM-043 · 7차 크로스체크 LOW 잔여 묶음 (비차단)
- **출처:** 2026-07-05 7차 크로스체크·보안 리뷰 — 전부 LOW(중단 규칙 2, 현 웨이브 미편입). MAJOR/MED급(dedupe·wall 280s 등 8건)은 통합 정정으로 이미 해소.
- **내용:** ① DocView 수용 기준 빈 문자열 `<li>` 렌더(정상 경로 유입 차단돼 있음) ② 빈 title TOC 접근명 부재 ③ TOC smooth 스크롤 prefers-reduced-motion 미고려 ④ 스트림 중간 네트워크 절단이 ai_error 아닌 server_error로 표면화(비스트림 관례와 일관이라 실해 없음) ⑤ ErDiagram duplicate key 콘솔 경고(기존 부채, 7차 무관 발견) ⑥ SSE buffer 라인 길이 상한 부재(신뢰 경계 안 — 방어 심층화용 1MB 캡) ⑦ `!res.ok` 경로 `res.text()` 무기한 대기(기존 callAnthropic 패턴과 동일) ⑧ ~~runGenerate catch 서버 로그 부재~~(8차 ASM-045로 해소 — logStreamFailure).

### ASM-040 · check_rate_limit RPC 키 오염 방어 (보안 MEDIUM — 기존 벡터)
- **출처:** 2026-07-05 5차 통합 보안 리뷰. 벡터 자체는 20260702000002부터 존재(이번 sync 추가로 스코프 +1) — 현 웨이브 비차단.
- **내용:** RPC가 anon 키로 직접 호출 가능하고 키 가드는 접미사만 강제 → 공격자가 `ip:<피해자IP>:<scope>:m` 키를 직접 호출해 타인 IP 버킷을 오염(표적 429 DoS, NAT 단위). 세션 키는 UUID라 안전. 방안: 서버 시크릿 HMAC 키 파생 또는 RPC 전용 role 제한.

### ASM-041 · workspaces "메인" 서버측 유니크 제약 (LOW)
- **출처:** 2026-07-05 5차 통합 보안 리뷰 — ASM-027 ifNone은 클라 GET→POST 창만 닫음, 서버측 listWorkspaces→createWorkspace 비원자 잔여(동시 POST 2건이면 "메인" 2개 가능, 실사용 희박).
- **내용:** `(product_id, name)` 유니크 제약 또는 is_main partial unique index + 409 처리.

### ASM-007 · ASM-005 잔여 (auth 종속·정의 대기)
- **출처:** 2026-07-02 ASM-005 마감 시 분리
- **내용:**
  - 아바타 실제 사용자 이니셜 배선 — 에디터·대시보드 TopBar 둘 다 "J" 하드코딩, auth 배선 필요
  - EditorTopBar "＋새 작업 파일" — 버튼 아닌 드롭다운 div, editor-interactions.md #4 정의 확정 후 처리
  - 리셋으로 사라진 표면(preview·project·perf) e2e 재작성 — 기존 스펙 3개는 skip 처리됨(e2e/*.spec.ts 주석 참조)

## Done

### 8차 웨이브 · 2차 통합 (2026-07-06) — 통합 브랜치 integrate/wave-8b, 크로스체크 6/6+재검증 3/3·보안 리뷰 APPROVE(HIGH 1=통합 정정으로 해소)
- **ASM-036** · 디자인 인지 진단→선별 실행(M1-D) — 진단 27건(HIGH 6) 리포트 + **top-19 승인 실행**: 토큰 4신설(micro 10px·edge 0.28·z-float 55·duration-flash)+muted #949494(AA), font-weight 47·duration 22·z-index 기계 치환(하드코딩 0), 읽기 본문 7셀렉터 13→14.5px, 인스펙터 제목 17px 통일, TopBar filled 역전 해소(내보내기 승격·공유하기 ghost+사유 툴팁), PriorityBars 개수 인코딩, 접근성(aria-expanded·불릿 전환·Avatar "J" 제거). 이월 2·3은 현행 유지 승인 종결. **치환 델타 4종 명기(값 불변 아님)**: 0.16s→200ms×2·docpFlash 150→120ms·easing ease→ease-standard 일괄·opBadge 16%→soft 14%. 머지 42f0816. **잔여 관문 = 사용자 시각 승인(8군데 목록)**
- **ASM-046** · 변경 계획 생존 신호(X-02 HIGH) — store 승격(receivePlan 대체 확인·접힘 "계획 대기" 뱃지·enterWorkspace 생존 범위·조건부 beforeunload) + **QA 정정 3건**(planSeq 카드 리마운트·clearActivePlan identity 가드·소유 렌더 필터, red 6→green) + **통합 정정**(보안 리뷰 HIGH: 늦은 타 워크스페이스 응답의 쓰기 측 드랍 — currentWorkspaceId 가드, red→green). 재검증 APPROVE. 머지 cfe08db
- **ASM-047** · 승인 diff 한글화(X-03 HIGH) — designNames 신규(id→이름·dangling 해요체 카피)+FIELD_SPECS 유한 맵(미지 필드 raw 폴백 — 침묵 실종 금지)+ChangePlanCard raw id 노출 제거 + **크로스체크 정정**(from 접두사 파싱[HIGH — 픽스처 자작 green 적발]·enum 정본 정렬[작성중/승인됨/중단됨·중간·중요도]·전방 참조 pending Map) + **통합 정정**(공백 이름 정규화·.diffField 죽은 CSS 제거). 재검증 APPROVE(서버 실산출 포맷 전수 커버 실증). 머지 9edcfa4
- 통합: editor.module.css EOF 마커 블록 충돌 1건(046·047 양쪽 append — 기계적 양쪽 유지, 원본 바이트 일치 검증) · editor-interactions 4행 갱신(#6·8·54 aria, #38 불릿 대체 정정) · **레인 실수노트→lane-logs 수집(신규 규약 첫 적용, 3파일)** · 게이트 tsc·lint·vitest **414/414**·build·e2e **21p/8s/0f**(.next 선삭제 후)·hex 0. DB 마이그레이션 없음. LOW 잔여 → ASM-049 확장. **자동 깨어남 프로토콜 첫 실전: 레인 2·3 재작업 왕복 2회 무타이핑 성공**

### 8차 웨이브 · 1차 통합 (2026-07-05) — 통합 브랜치 integrate/wave-8, 크로스체크 4/4·보안 리뷰 APPROVE(CRITICAL/HIGH 0)
- **ASM-037** · 시드 스크립트 + 실 DB 여정 e2e(M1-E 레인 몫) — scripts/seed-e2e(API 경유 RLS 관통·id 리매핑 61참조/30id 100%·멱등·--cleanup, service_role 무사용) + 여정 e2e 2벌(저장 PATCH·전파 적용·내보내기·싱크-인 실 관통, AI 호출 0, afterAll 잔류 0). TDD red(모듈 부재)→green. 머지 907f739
- **ASM-045** · 생성 invalid_json 관측·여유 — 파싱 실패/스트림 예외 `[api:generate]` 관측 로그(textLen·output_tokens·stop_reason·tail 300캡, ASM-043 ⑧ 겸 해소) + 스트림 stop_reason 캡처(additive) + GENERATE_MAX_TOKENS 16000→24000(실측 12,663톤 근거, 24K≈200s<wall 280s). 머지 0df8477
- **ASM-044** · 생성 재시도 총 데드라인 — wallMs를 전 시도 공유 예산으로 재해석(deadline 고정·시도별 잔여 주입·백오프 차감·소진 즉시 504). 불변 계약 4종(504 비재시도·첫 토큰 후 금지·429/500/529만·응답 매핑) 테스트 유지. **편차 승인:** 신규 파라미터 대신 wallMs 재해석(호출부 의도 일치·run.test 무변경). 머지 0df8477
- **통합 정정(70e3e8b·1건 후속):** ① **여정 e2e 유료 누수 차단** — 챗 인풋 포커스(onFocus→expand)만으로 suggestions 실발사(여정 1회=유료 1건, 크로스체크 MED "잠재"→실측 활성 상향) → blockAiRoutes 5/5+테스트2 적용 ② 시드 원격 가드(로컬 전용 강제, 보안 리뷰 MEDIUM 반영=값 기준 기본 UUID 거부) ③ journey retries 0 ④ 리매핑 조용한 폴백 제거 ⑤ 관측 로그 주석 정확화
- 게이트: tsc·lint·vitest 375/375·build·e2e **21p/8s/0f**(여정 2 포함)·hex 0. DB 마이그레이션 없음. LOW 잔여 → ASM-049. **레인 1(036)·레인 2(046)·레인 3(047)은 진행 중 — 2차 통합에서 마감**

### 7차 웨이브 (2026-07-05 통합) — M1-C 갭 마감, 통합 브랜치 integrate/wave-7 · 크로스체크 6/6 통과(blocker 0)
- **ASM-042** · 생성 120s 타임아웃 해소(HIGH G-1) — 기구현 `streamAnthropic` 배선(서버 내부 누적 전용, 응답 계약 불변) → 하드캡을 **idle 60s + wall 280s**(maxDuration 300과 마진 확보, 통합 정정)로 전환. 재시도 정책 불변(504 비재시도 = 이중 과금 방지, 테스트 고정). 진단 중 발견 버그 수정: read 루프 abort 누출→504 분류(red 증명). `ai_timeout` 전용 카피 + G-5 e2e(대기 안내→실패 카피→아이디어 보존→재활성). TDD red 10→green, 신규 15케이스
- **ASM-033** · DocView 읽기 투사 — `docProjection.ts` 순수 투사(TDD 12: 역참조 순서·N:N·unlinked 분류·유령 섹션 방지) + PRD 렌더(TOC #23 점프+강조·상태 pill·중요도 바·수용 기준·unlinked 말미 섹션). #21/#24는 프리셋 단일이라 정적 라벨(거짓 버튼 금지). 시그니처 `{design}` 불변 — CenterView 무접촉
- **ASM-034** · WireframeView 구조 렌더 + #46 — `wireframeUtils.ts`(TDD 11+정정 2: orphan·dangling·중복 방어) + 페이지→요소 스택 렌더(정직 표시 3종) + store element 선택(additive) + ElementInspector 신규(dangling은 개수만, raw id 미노출). 라이브 프로브 쓰기 요청 0건(읽기 전용 실증)
- 통합: 충돌 0(CSS 구역 분리 전략 성공) · **정정 8건**(중복 id dedupe[MAJOR]·wall 300→280s[MED]·isFlashed·useMemo·border-width 토큰·refusal 경로 controller.abort·e2e delayMs 2000·aria-current) + 회귀 테스트 2 · editor-interactions #21·23·24·46 구현 반영 · 게이트 tsc·lint·**vitest 366/366**·build·e2e 19p/8s/0f·hex 0. DB 마이그레이션 없음. LOW 잔여 → ASM-043. push 완료 ef3d550(2026-07-05)
- **G-1 유료 재현 스모크(push 후, 사용자 승인):** 코드-진실 API 25·테이블 7 + 상세 아이디어 440자 × 2회 — ① 170s 422 invalid_json ② **138.6s 200 완주**(req 8·feat 8·pages 11·wireframes 11·elements 35, output 12,663톤). **타임아웃 해소 실증**(두 런 모두 옛 120s 캡 초과 생존). 확률 실패 1/2 → ASM-045 신설

### 6차 웨이브 (2026-07-05 통합) — 머지 1dd0b90(레인2)·6d5d1fc(레인3)·220223f(레인1), 통합 브랜치 integrate/wave-6 · **레인=인세션 에이전트 첫 적용**
- **ASM-032** · 기능 총점검(M1-B) — assembler 자기 스펙 시드(실 DB, "(시드)" 보존·재시드=m1-seed-design.json) → 여정×5각도 실측 매트릭스 → `diagnosis/m1-feature-audit.md`(CRITICAL 0·**HIGH 1=G-1 생성 120s 타임아웃→ASM-042 편입**·MED 4·LOW 3, 미점검 셀 전부 사유 병기) + ux-audit 5건 닫음(C-6·A-2·B-10·C-7·A-6, 실측 근거). 크로스체크: 인용 7건 전수 일치 APPROVE
- **ASM-038** · 영향 범위 하드닝 — e2e update op 시나리오 + LOW 4건(applying 칩 차단·orphan 폴백·op 간 dedup·`useSpecJump` 훅으로 #39 가드 **3벌** 단일화, 선택 항목 InspectorSpecPanels 포함). TDD red 증거 확보. 크로스체크 APPROVE+QA PASS(엣지 프로브 7/7)
- **ASM-035** · 디자인 기계 부채(M1-D 당김) — TYPOGRAPHY CSS var 8단(caption 11px 신설)+weight 4단 노출·TS 미러 var() 전환 · font-size **134건**+TSX 2건 치환(±0.5px, 전량 기계 검증·보류 8건=ASM-036 입력) · ui/Segmented로 세그 3벌→1벌(aria-pressed) · 스피너 1벌·죽은 챗 CSS 175줄 삭제 · ER 툴팁 ui/Tooltip 흡수. 크로스체크 APPROVE+QA PASS(시각 스모크 18/18)
- 통합: 충돌 0 · 정정 4건(갭 리포트 링크·orphan 칩 카피 "이름 없는 와이어프레임"·매핑 문서 dbviewBar 편차·치환 수치 137→134 정정 기록) · editor-interactions 상태 열 5행(#1·7·16·62 구현 실측, #65 부분) · 게이트 tsc·lint·vitest 321/321·build·e2e 18p/0f·hex 0·font-size 잔여 8(보류 일치). DB 마이그레이션 없음. 시각 승인: 스크린샷 2장 사용자 확인(2026-07-05)

### 5차 웨이브 (2026-07-05 통합) — 머지 214122d(레인1)·97e3ebb(레인3)·fbc49c9(레인2), 통합 브랜치 integrate/wave-5
- **ASM-029** · 변경 전파 시각화 — `impact.ts` 역참조 BFS 워커(TDD 10) + `planImpact.ts` 칩 모델(4) + ImpactSection(영향 0건 숨김, req/feature 칩 #39 가드 점프) + ChangePlanCard 배선. 크로스체크 PASS blocker 0. 후속 하드닝 → ASM-038
- **ASM-030** · 내보내기 모달 — `exportContext.ts` 구현 컨텍스트 패키징(TDD 15) + ExportModal(미리보기·복사/다운로드, Confluence·Figma "곧" 비활성) + SpecBulkBar #34 프리셀렉트·TopBar #9 진입. **편차 승인:** 재사용/신규 판정=status 기준(DB 신규 채널 부재 — ASM-039) · SpecView.tsx 1줄(checkedIds prop 관통, 소유 밖 — 무해 확인) · e2e E2E_PORT=3130. 후속 → ASM-039
- **ASM-027** · 4차 잔여 Low 묶음 — validate-sync endpoint 트림 · `--font-mono` 토큰(globals.css, **TS 미러 불필요 판정**: 소비 전부 CSS var 경유·design-tokens.ts에 폰트 카테고리 없음·TS 소비처 0) · "메인" TOCTOU=ifNone 조건부 생성(**편차 승인:** 유니크 제약 대신 ifNone 방식) · 인라인 추가 포커스 복원·Select placeholder · CodeConnectModal 크기 사전 컷 · design-patch refs 런타임 가드 · activity 중복 기록 스킵 · editor-interactions 상태 열 갱신(통합 커밋, #30·32·34·37·42·64)
- **ASM-028** · 싱크-인 rate limit 배선 — RateLimitRoute "sync"(20/분·120/시, IP 백스톱 3배) + apis·db-tables POST 배선(검증 후·쓰기 전) + 마이그레이션 20260703000001. **실 DB 스모크(2026-07-05):** 적용 전 22연타 전부 200(fail-open 실증) → 적용 후 20×200 + 21번째 429·Retry-After 55 + db-tables 공유 카운터 즉시 429. 스모크 데이터 정리 완료(잔여 0)
- 통합: lane-1.md add/add 충돌 해소(스캐폴드+실기록 병합). 게이트 tsc·lint·vitest 313/313·build·e2e 17p/8s·hex 0. 보안 리뷰 CRITICAL 0·APPROVE(HIGH=적용 게이트 자체, 이행됨 / MEDIUM·LOW→ASM-040·041)

### 4차 웨이브 (2026-07-02) — 머지 405c8ed·8348cbe·90021a2
- **ASM-023** · suggestions 인스펙터 카드 — RightPanel 상주(분기 전환에 유료 분석 결과 보존), 타깃 점프(requirement/feature만, 나머지 비링크), dismiss 로컬, in-flight 가드. 유틸 TDD 7건
- **ASM-024** · activity 타임라인 — TopBar 기록(#7) → 슬라이드오버, 델타→해요체 카피(truncated=개수 요약), 미지 type 폴백. 유틸 TDD 13건
- **ASM-025** · 편집성 인터랙션 1차 — #30·#32·#34·#37·#42 + `patchDesignScoped` 공용 헬퍼(409 자동 재시도·dangling 상세) 단일 저장 경로, ChangePlanCard도 이관. e2e 신규
- **ASM-022** · files 생성 경로 검증 — 진단 결과 경계 이미 존재(parseGeneratedDesign→parseDesign), 중복 id 거부 회귀 테스트로 고정
- **ASM-026** · 수동 싱크-인 UI — CodeConnectModal(붙여넣기/업로드·행 피드백·부분 실패 안내), 싱크 성공+스펙 0개→"메인" 자동 생성. **T7 편차 승인:** activity는 file_generated 아닌 workspace_created 유지(생성된 파일이 없는데 생성 기록을 찍는 건 "BE는 사실만 기록" 위반 — 레인 판단 채택)
- 통합: InspectorSpecPanels·RightPanel 충돌 해소(레인 1 빈 상태 통합 구조 + 레인 2 SaveCtx 관통), 싱크-인 라우트 거짓 주석 2줄 정정, 실 DB 스모크(PATCH 200/409 dangling·싱크-인 200) 통과

### 3차 웨이브 (2026-07-02) — 머지 c96a8ec·7a16b1b·b17794b
- **ASM-017** · 레이아웃 재편 — 우패널 공용 인스펙터(InspectorSpecPanels)·트리뷰 숨김·"제품 구조" 레일·git 라벨 스윕·로고 복귀·스코프=스펙 전환·store 리셋
- **ASM-018** · 챗+변경 계획 도크 — 하단 도크·자동 오픈·PATCH 적용(409/dangling UX)·payload diff·suggestions 칩. DoD: 입력→적용 2 인터랙션, e2e 고정 (ASM-006 잔여 흡수 종결)
- **ASM-019** · 변경 델타 기록 — diffDesign(멀티셋·16KB 캡·O(n))·activity metadata 델타화. TDD 22테스트
- **ASM-020** · 대시보드 언어·정직화 — "스펙" 개명·빈 파일 카드 제거·카피 조건화(useCodeTruth)·ui/Modal(+z 토큰, TS 미러는 오케스트레이터 추가)


### ASM-016 · UX 진단·전략 수립 — 2026-07-02
- 진단 3렌즈(여정·위계/중복·일관성/전략 정합) + 레퍼런스 3종(claude.ai·NotebookLM·manyfast) 병렬 → 질의응답 3턴 전부 확정.
- 산출: `docs/specs/ux-audit.md`·`ux-references.md`·`ux-strategy.md`, editor-interactions ⚠협의 28행→1행(#57), v1-spec diff 분리 편입.
- ASM-006 잔여는 ASM-018로 흡수(챗 BE는 2차에서 완료).


### 2차 웨이브 (2026-07-02) — 레인 3개 + 모션, 머지 e3a6755·bc92534·87a67ae·eb046d1
- **ASM-008** · 에디터 셸 Layer 2 — TopBar/LeftRail/CenterView/RightPanel 재구성, ui 프리미티브 이관, 유저플로우 캔버스(flow-view-pattern·TDD 12건)
- **ASM-009** · 기능명세서 인터랙션 — #27 필터(role 동적)·#29 검색·#31 승격·#35·#39 점프(필터 해제 가드)·#41 트리뷰, 선택 상태 store 단일 공유
- **ASM-010** · 편집 파이프라인 — PATCH design(스코프드 부분 저장+머지), dangling 409, CAS 동시성(updated_at), 중복 id 거부
- **ASM-012~014** · 온보딩 경로 C — Composer 항상 활성, 만들기 모달(아이디어 보존), 1회 입력+1회 이름→에디터 DoD e2e 고정
- **모션 시스템(무티켓, 브랜딩 세션)** · 모션 토큰 + ui/motion 3종(BrandSpark·AssemblyLoader·EmptyStateArt) + prefers-reduced-motion — 통합 시 셸 개명·온보딩 재작성과 충돌 해소(eb046d1)
- **통합 발견 버그 수정** · 챗 rate limit 무력화(RPC 허용 목록에 chat 부재 → fail-open) — 마이그레이션 20260702000003 (170d87e)

### ASM-001 · AI 엔드포인트 rate limit — 2026-07-02
- **결정:** Supabase RPC 기반(신규 인프라 0) + 교체 가능 모듈(`src/lib/api/rate-limit.ts`만 갈면 Upstash 전환). 세션 2윈도 + IP 백스톱 3배 한도, RPC 장애 시 fail-open.
- **커밋:** 9278dac. ⚠ 마이그레이션 `20260702000002` DB 적용(supabase db push) 전까지 fail-open 동작.

### ASM-002 · 에디터 인터랙티브 요소 접근성 — 2026-07-02
- role="button"+tabIndex+Enter/Space(중첩 체크박스 때문에 button 전환 대신 role 패턴, 자식 버블 키 가드), ER 노드·체크박스 aria-label. 커밋: 21c56c0.

### ASM-003 · DashboardClient toast 타이머 정리 — 2026-07-02
- toastTimer ref clear + 언마운트 cleanup. 커밋: 21c56c0.

### ASM-004 · design jsonb·sync 배열 크기 상한 — 2026-07-02
- 컬렉션 캡(design 300·apis 300·tables 200·컬럼 100) + 바이트 캡(1MB/512KB) + Content-Length 413 게이트. 커밋: 740466c.

### ASM-005 · 리뷰 Low 묶음 — 2026-07-02
- key 안정화·Avatar 재사용·죽은 버튼 disabled(21c56c0) / 주석 정정·note 404 정합·마이그레이션 멱등화·anthropic 가드·note 동시성 가드·에러 카피 26종(740466c). 잔여는 ASM-007로 분리.
