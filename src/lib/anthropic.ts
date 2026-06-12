/**
 * Anthropic API 호출 wrapper.
 * SDK 의존성 없이 fetch 로 직접 호출 — 추후 `@anthropic-ai/sdk` 도입 시 교체 가능.
 *
 * 환경변수: ANTHROPIC_API_KEY 필요 (.env.local).
 *   - 키 없으면 호출 시점에 명확한 에러 던짐 (API 라우트가 503 변환).
 *
 * 기본 모델: claude-haiku-4-5-20251001 (빠르고 저렴). 추후 옵션:
 *   - claude-sonnet-4-6 (더 깊은 추론, 비쌈)
 *   - claude-opus-4-7 (최고 품질)
 */

export const ANTHROPIC_MODELS = {
  haiku: "claude-haiku-4-5-20251001",
  sonnet: "claude-sonnet-4-6",
  opus: "claude-opus-4-7",
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
  temperature?: number;
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

interface AnthropicApiResponse {
  content: Array<{ type: string; text?: string }>;
  stop_reason: string;
}

/**
 * 메시지 호출 → 응답 text(첫 text 블록) 반환.
 */
export async function callAnthropic(params: AnthropicCallParams): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new AnthropicKeyMissingError();

  const model = ANTHROPIC_MODELS[params.model ?? "haiku"];

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: params.maxTokens ?? 4096,
      temperature: params.temperature ?? 0.7,
      system: params.system,
      messages: params.messages,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new AnthropicApiError(res.status, errorText.slice(0, 500));
  }

  const data = (await res.json()) as AnthropicApiResponse;
  const textBlock = data.content.find((b) => b.type === "text");
  if (!textBlock?.text) {
    throw new AnthropicApiError(500, "Anthropic 응답에 text 블록이 없어요");
  }
  return textBlock.text;
}
