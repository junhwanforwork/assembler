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
  /** 응답 상한(ms). 기본 60s — opus+thinking+대용량 출력(그래프 생성)은 더 길게 둔다. */
  timeoutMs?: number;
  /**
   * 스트림 전용 wall-clock 백스톱(ms). idle 캡(timeoutMs)은 핑·델타가 오면 계속 리셋되므로
   * "이벤트만 오고 끝나지 않는" stall 은 못 끊는다 — 총 시간 상한이 필요하면 지정(미지정 시 없음).
   * callAnthropic(비스트림)에서는 무시된다(timeoutMs 가 이미 wall-clock).
   */
  wallMs?: number;
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

// 요청 헤더 — x-api-key 는 호출 시점에 주입.
function anthropicHeaders(apiKey: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
  };
}

// 요청 바디 구성 — 비스트림·스트림 공유(스트림은 stream:true 만 덧붙임).
// thinking adaptive + output_config.effort:"high" + cache_control(system) 동작 동일.
function buildRequestBody(params: AnthropicCallParams): Record<string, unknown> {
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
  return body;
}

/**
 * 메시지 호출 → 응답 text(첫 text 블록) + usage 반환.
 * 비스트리밍 단일 경로(maxTokens 기본 16000). 스트리밍은 streamAnthropic(ASS-204).
 */
export async function callAnthropic(params: AnthropicCallParams): Promise<AnthropicResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new AnthropicKeyMissingError();

  const body = buildRequestBody(params);

  // 비스트리밍 opus 단건은 수십 초~수분까지 걸릴 수 있음 — 무한 대기 방지로 상한을 둔다(호출별 조절 가능).
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), params.timeoutMs ?? 60000);
  let res: Response;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: anthropicHeaders(apiKey),
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

  // 200이어도 content 가 누락/비배열인 변형 응답이면 TypeError 대신 API 에러로 — 소비처 ai_error 매핑에 태운다.
  if (!Array.isArray(data.content)) {
    throw new AnthropicApiError(500, "Anthropic 응답 content가 배열이 아니에요");
  }

  const textBlock = data.content.find((b) => b.type === "text");
  if (!textBlock?.text) {
    throw new AnthropicApiError(500, "Anthropic 응답에 text 블록이 없어요");
  }
  return { text: textBlock.text, usage: data.usage };
}

/**
 * 스트리밍 호출 (ASS-204) — SSE 토큰을 읽어 text_delta 마다 onText(delta) 호출, 최종 usage 반환.
 * 비스트림과 동일 바디(adaptive thinking + effort + system 캐시). refusal 은 message_delta 에서 가드.
 * timeoutMs 는 wall-clock 이 아니라 idle(무토큰) 상한 — 청크가 오면 리셋된다. wallMs 는 총 상한(옵션).
 * abort 는 어느 단계(fetch·본문 read)에서 나든 AnthropicApiError 504 로 분류한다(ASM-042).
 */
export async function streamAnthropic(
  params: AnthropicCallParams,
  onText: (delta: string) => void,
): Promise<AnthropicUsage | undefined> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new AnthropicKeyMissingError();

  const body = buildRequestBody(params);
  body.stream = true;

  const controller = new AbortController();
  const idleMs = params.timeoutMs ?? 60000;
  let idle = setTimeout(() => controller.abort(), idleMs);
  const wall = params.wallMs !== undefined ? setTimeout(() => controller.abort(), params.wallMs) : undefined;
  const clearTimers = () => {
    clearTimeout(idle);
    clearTimeout(wall);
  };
  const bump = () => {
    clearTimeout(idle);
    idle = setTimeout(() => controller.abort(), idleMs);
  };

  let res: Response;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: anthropicHeaders(apiKey),
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimers();
    if (err instanceof Error && err.name === "AbortError") {
      throw new AnthropicApiError(504, "Anthropic 응답 시간이 초과됐어요");
    }
    throw err;
  }

  if (!res.ok) {
    clearTimers();
    const errorText = await res.text().catch(() => "");
    throw new AnthropicApiError(res.status, errorText.slice(0, 500));
  }
  if (!res.body) {
    clearTimers();
    throw new AnthropicApiError(500, "Anthropic 스트림 본문이 없어요");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let usage: AnthropicUsage | undefined;

  try {
    for (;;) {
      // idle/wall abort 는 read() 거부(AbortError)로 도달한다 — fetch 단계와 동일하게 504 로 분류.
      let chunk: ReadableStreamReadResult<Uint8Array>;
      try {
        chunk = await reader.read();
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          throw new AnthropicApiError(504, "Anthropic 응답 시간이 초과됐어요");
        }
        throw err;
      }
      const { done, value } = chunk;
      if (done) break;
      bump();
      buffer += decoder.decode(value, { stream: true });
      let nl: number;
      // SSE 프레임은 줄 단위 — "data: <json>" 줄만 처리(event:/ping/빈 줄 무시).
      while ((nl = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (!line.startsWith("data:")) continue;
        const json = line.slice(5).trim();
        if (!json) continue;
        let ev: Record<string, unknown>;
        try {
          ev = JSON.parse(json) as Record<string, unknown>;
        } catch {
          continue; // 손상·미완 프레임 한 줄 — 스킵(정상 SSE는 완성 줄만 도달).
        }
        const type = ev.type;
        if (type === "content_block_delta") {
          const delta = ev.delta as { type?: string; text?: string } | undefined;
          if (delta?.type === "text_delta" && delta.text) onText(delta.text);
        } else if (type === "message_start") {
          const u = (ev.message as { usage?: AnthropicUsage } | undefined)?.usage;
          if (u) usage = { ...u };
        } else if (type === "message_delta") {
          const stopReason = (ev.delta as { stop_reason?: string } | undefined)?.stop_reason;
          // refusal 은 스트림 중간에도 올 수 있다 — 부분 출력 폐기하고 가드.
          if (stopReason === "refusal") throw new AnthropicRefusalError();
          const out = (ev.usage as { output_tokens?: number } | undefined)?.output_tokens;
          if (out !== undefined && usage) usage.output_tokens = out;
        } else if (type === "error") {
          const message = (ev.error as { message?: string } | undefined)?.message ?? "stream error";
          throw new AnthropicApiError(500, message.slice(0, 500));
        }
      }
    }
  } finally {
    clearTimers();
    reader.releaseLock();
    // refusal·error 이벤트로 throw 하는 경로에서 남은 바디가 소켓을 점유하지 않게 연결을 닫는다.
    // 정상 완료(done) 후의 abort 는 무해하다.
    controller.abort();
  }

  return usage;
}
