/**
 * Anthropic API 호출 wrapper.
 * SDK 의존성 없이 fetch 로 직접 호출 — 추후 `@anthropic-ai/sdk` 도입 시 교체 가능(스펙 결정: SDK 무의존 유지).
 *
 * 환경변수: ANTHROPIC_API_KEY 필요 (.env.local — .env.example 참고).
 *   - 키 없으면 호출 시점에 명확한 에러 던짐 (API 라우트가 503 변환).
 *
 * 기본 모델: claude-haiku-4-5 (빠르고 저렴). 그래프 생성은 opus(claude-opus-4-8).
 *
 * 현 모델(Opus 4.8) 제약 (docs/specs/ai-prompt-generation.md):
 *   - temperature/top_p/budget_tokens 전송 시 400 — 보내지 않는다.
 *   - JSON 강제는 프리필이 아니라 structured outputs(output_config.format)로.
 *   - thinking 은 adaptive 만(+ output_config.effort). cache_control 로 정적 system 캐싱.
 *   - 응답은 stop_reason "refusal" 가드를 content 읽기 전에.
 */

export const ANTHROPIC_MODELS = {
  haiku: "claude-haiku-4-5",
  sonnet: "claude-sonnet-4-6",
  opus: "claude-opus-4-8",
} as const;

export type AnthropicModelKey = keyof typeof ANTHROPIC_MODELS;

interface AnthropicMessage {
  role: "user" | "assistant";
  content: string;
}

interface AnthropicCallParams {
  system: string;
  messages: AnthropicMessage[];
  model?: AnthropicModelKey;
  maxTokens?: number;
  /** structured outputs JSON schema. 있으면 output_config.format 로 유효 JSON 강제(프리필 금지). */
  outputSchema?: Record<string, unknown>;
  /** true면 정적 system 을 cache_control 블록으로 보내 반복 호출 비용↓ (최소 prefix 4096토큰 미만이면 미적용·에러 아님). */
  cacheSystem?: boolean;
  /** "adaptive"면 thinking:{type:"adaptive"} + output_config.effort:"high"(그래프 생성 권장). */
  thinking?: "adaptive";
}

/** 토큰 사용량 — 캐시 적중(cache_read)·비용 추적·eval 검증용(ai-prompt-generation.md §3). */
export interface AnthropicUsage {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number;
  cache_creation_input_tokens?: number;
}

export interface AnthropicResult {
  text: string;
  usage?: AnthropicUsage;
}

export class AnthropicKeyMissingError extends Error {
  constructor() {
    super("ANTHROPIC_API_KEY is not set in .env.local");
    this.name = "AnthropicKeyMissingError";
  }
}

export class AnthropicApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "AnthropicApiError";
    this.status = status;
  }
}

/** 안전 분류기가 요청을 거부 — content 읽기 전 가드. 라우트가 422 해요체로 변환. */
export class AnthropicRefusalError extends Error {
  constructor() {
    super("Anthropic declined this request (stop_reason: refusal)");
    this.name = "AnthropicRefusalError";
  }
}

interface AnthropicSystemBlock {
  type: "text";
  text: string;
  cache_control?: { type: "ephemeral" };
}

interface AnthropicApiResponse {
  content: Array<{ type: string; text?: string }>;
  stop_reason: string;
  usage?: AnthropicUsage;
}

/**
 * 메시지 호출 → 응답 text(첫 text 블록) + usage 반환.
 * 비스트리밍 단일 경로(maxTokens 기본 16000). >16K 스트리밍이 필요한 소비자(ASS-068)는 범위 밖.
 */
export async function callAnthropic(params: AnthropicCallParams): Promise<AnthropicResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new AnthropicKeyMissingError();

  const model = ANTHROPIC_MODELS[params.model ?? "haiku"];

  // cacheSystem 시 system 을 cache_control 블록 배열로 — 가변값 인터폴레이션 금지(캐시 prefix 안정).
  const system: string | AnthropicSystemBlock[] = params.cacheSystem
    ? [{ type: "text", text: params.system, cache_control: { type: "ephemeral" } }]
    : params.system;

  // output_config 는 effort(thinking)·format(structured outputs)을 한 객체로 병합.
  const outputConfig: Record<string, unknown> = {};
  if (params.thinking === "adaptive") outputConfig.effort = "high";
  if (params.outputSchema) {
    outputConfig.format = { type: "json_schema", schema: params.outputSchema };
  }

  const body: Record<string, unknown> = {
    model,
    max_tokens: params.maxTokens ?? 16000,
    system,
    messages: params.messages,
  };
  if (params.thinking === "adaptive") body.thinking = { type: "adaptive" };
  if (Object.keys(outputConfig).length > 0) body.output_config = outputConfig;

  // 비스트리밍 opus 단건은 수십 초까지 걸릴 수 있음 — 무한 대기·플랫폼 타임아웃 방지로 상한을 둔다.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000);
  let res: Response;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new AnthropicApiError(504, "Anthropic 응답 시간이 초과됐어요");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new AnthropicApiError(res.status, errorText.slice(0, 500));
  }

  const data = (await res.json()) as AnthropicApiResponse;

  // refusal 은 HTTP 200으로 와도 content 가 비거나 부분이다 — 읽기 전에 가드.
  if (data.stop_reason === "refusal") throw new AnthropicRefusalError();

  const textBlock = data.content.find((b) => b.type === "text");
  if (!textBlock?.text) {
    throw new AnthropicApiError(500, "Anthropic 응답에 text 블록이 없어요");
  }
  return { text: textBlock.text, usage: data.usage };
}
