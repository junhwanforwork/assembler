# AI Prompt Generation — LLM 설계 (Assembler)

아이디어(자연어) → **연결된 제품 객체 그래프**(`ProjectGraph`) 생성의 LLM 파이프라인 단일 출처.
Epic **ASS-E01 · AI Prompt Tuning**의 구현 근거. RAG는 ASS-E02로 분리·보류(아래 §6).

확정일: 2026-06-14. 스택: 현 custom fetch 래퍼(`src/lib/anthropic.ts`) 유지·확장 (SDK 무의존).

---

## Origin

`src/lib/prompts/assembler.ts`는 시스템 프롬프트·출력 형태를 정의하지만, 실제 생성 경로(`/api/generate`)가
없고 `anthropic.ts` 래퍼는 스트리밍·구조화 출력·캐싱을 지원하지 않는다. 또 "JSON만 반환해" 텍스트 지시에
의존하는데, **프리필(prefill) 기반 JSON 강제는 현재 모델(Opus 4.8/Sonnet 4.6)에서 400으로 막힌다.**
이 문서가 생성 파이프라인의 모델·출력·캐싱·튜닝 결정을 고정해 구현이 갈라지지 않게 한다.

---

## 1. 모델 라우팅

| 용도 | 모델 | 근거 |
| --- | --- | --- |
| 그래프 생성 (품질 핵심) | `claude-opus-4-8` | 최고 품질. 1M 컨텍스트. |
| 대화 라우터(clarify vs generate) | `claude-haiku-4-5` | 저비용 판정 — 대화 형식은 `ai-prompt-conversation.md` (ASS-E03). |
| 단순 보조 (요약·태그·라벨) | `claude-haiku-4-5` | 저비용·빠름. |
| 중간 품질 필요 시 | `claude-sonnet-4-6` | 품질·비용 균형. |

- `anthropic.ts`의 `ANTHROPIC_MODELS.opus`를 `claude-opus-4-7` → **`claude-opus-4-8`**로 갱신 (ASS-060).
- 모델 ID 문자열은 날짜 접미사 없이 그대로 사용. `temperature`/`top_p`/`budget_tokens`는 현 모델에서 400 — **보내지 않는다**.
- thinking이 필요하면 `thinking: { type: "adaptive" }`(+ `output_config.effort`)만. 그래프 생성은 effort `high` 권장.

## 2. JSON 강제 = Structured Outputs (프리필 금지)

- 요청에 **`output_config: { format: { type: "json_schema", schema: <ProjectGraph schema> } }`** 를 실어 유효 JSON을 보장한다.
- 스키마는 `src/lib/types/assembler.ts`의 `ProjectGraph`에서 파생. **재귀 없음 확인**(컬렉션 평면 배열, `nextStepIds`는 `string[]`) → json_schema 표현 가능.
- json_schema 제약 주의: `minimum`/`maxLength`/recursive 미지원 → 길이·범위 제약은 검증 레이어(ASS-019)에서. `additionalProperties: false` 필수.
- 프리필(마지막 assistant 턴) **금지** — 400. `ASSEMBLER_SYSTEM`의 "Return ONLY valid JSON" 지시는 보조로 유지하되 강제는 structured outputs가 담당.
- 첫 요청은 스키마 컴파일 지연 있음(이후 24h 캐시). `max_tokens`는 큰 그래프 대비 넉넉히(스트리밍 시 ~64K, 비스트리밍 ~16K).

## 3. 프롬프트 캐싱

- 정적 `ASSEMBLER_SYSTEM`(+ 출력 형태)에 `cache_control: { type: "ephemeral" }` → 반복 생성 비용↓.
- 렌더 순서 `tools → system → messages`. **가변 콘텐츠(사용자 아이디어, 추후 few-shot 예시)는 캐시 breakpoint 뒤** user 메시지에 둔다 — 시스템 프롬프트에 가변 값 인터폴레이션 금지.
- ⚠ **Opus 4.8 최소 캐시 prefix = 4096 토큰.** 현 시스템 프롬프트가 그보다 짧으면 캐시 미적용(에러 아님, `cache_creation_input_tokens: 0`) — eval에서 `usage`로 확인. few-shot 골든셋(ASS-061)을 시스템/캐시 영역에 넣으면 prefix가 커져 캐시가 살아난다.
- 검증: `usage.cache_read_input_tokens`가 반복 요청에서 0이 아니어야 함.

## 4. 이 서비스 특화 튜닝

1. **few-shot 한국어 골든셋 (ASS-061)** — 한국어 아이디어→그래프 예시 3~5쌍. 생성 품질·`content-style.md` 문체(명사구·관계 명시) 고정. 입력 언어 따름(객체 키/타입명은 영어).
2. **스키마·enum 강제** — structured outputs + ASS-019 검증(`UIElement.type`∈10종, `result.kind`∈5종, `Api.method` 대문자 정규화, dangling/orphan/navigate↔edge 정합).
3. **생성 계약** — `assembler/generation.md`(Page 생성 시 Wireframe+UI Element+Mapping 동반 등) 프롬프트 반영 유지.
4. **eval 하네스 (ASS-062)** — 골든셋 대비 스키마 유효성·연결 무결성·고립 객체 점수로 프롬프트 변경의 회귀 측정.
5. 프롬프트 텍스트 최적화는 `prompt-engineer` 에이전트가 담당(`/improve-prompt`). 아키텍처 자문 필요 시 `vercel:ai-architect`.

## 5. 에러 처리 (ASS-020)

- 키 없음 → `AnthropicKeyMissingError`(이미 있음) → 해요체 사용자 메시지("AI 설정을 확인해 주세요" 류, ux-writing.md).
- 파싱·API 오류 → 재시도(지수 백오프) + 해요체 안내. 기술 코드(`500`·`ERROR`) 노출 금지.
- `stop_reason: "refusal"` 가드 — `content` 읽기 전 확인(현 모델 안전 분류기).

## 6. RAG — 보류 (ASS-E02)

이번 범위 아님. 코퍼스(큐레이션된 예시 그래프 라이브러리 + 사용자 과거 프로젝트)가 쌓이면:
- 임베딩 제공자 선정(ASS-063) — 입력이 한국어라 **다국어 임베딩 품질이 결정 축**(Voyage `voyage-3.5` / OpenAI `text-embedding-3` / Supabase `gte-small`). Anthropic은 임베딩 API 없음.
- pgvector(Supabase) 검색 → top-k 예시를 few-shot으로 §3 캐시 뒤 주입(ASS-064).
- OPINION repo 재사용 스카웃은 로컬 경로 제공 시 ASS-064에 흡수.
- 사용자 RAG 학습 후 착수 — 결정 보류.

---

## 구현 티켓 (Epic ASS-E01)

ASS-060(래퍼 하드닝) → ASS-018(/api/generate) → ASS-019(검증/정규화) → ASS-020(에러) · ASS-021(env) · ASS-061(골든셋) · ASS-062(eval). 각 티켓은 `/multi-team` + 빌드 게이트로 구현.

ASS-021: `ANTHROPIC_API_KEY` 가 필요하다(`.env.local`). 템플릿은 루트 `.env.example` 참고 — 키가 없으면 `/api/generate` 는 503(해요체)으로 응답한다(코드 동작에는 무관, 라이브 생성만 막힘).
