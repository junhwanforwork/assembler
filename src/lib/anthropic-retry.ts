/**
 * callAnthropic 지수 백오프 재시도 래퍼 (ASS-020).
 * 재시도 대상은 일시적 서버 오류(429/500/529)만 — 키없음·refusal·400/401/403 등은 즉시 throw(재시도 무의미).
 * 카피 변환은 라우트가 담당 — 여기서는 분류·재시도만.
 */

import { AnthropicApiError, callAnthropic, type AnthropicResult } from "@/lib/anthropic";

type CallParams = Parameters<typeof callAnthropic>[0];

const RETRYABLE_STATUS = new Set([429, 500, 529]);
const DEFAULT_MAX_RETRIES = 2;
const BASE_DELAY_MS = 500;

function isRetryable(error: unknown): boolean {
  return error instanceof AnthropicApiError && RETRYABLE_STATUS.has(error.status);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 일시적 오류면 지수 백오프(500ms·1s)로 최대 maxRetries 회 재시도.
 * 마지막 시도까지 실패하면 마지막 에러를 그대로 던진다(라우트가 해요체 변환).
 */
export async function callAnthropicWithRetry(
  params: CallParams,
  maxRetries: number = DEFAULT_MAX_RETRIES,
): Promise<AnthropicResult> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await callAnthropic(params);
    } catch (error) {
      lastError = error;
      if (!isRetryable(error) || attempt === maxRetries) throw error;
      await delay(BASE_DELAY_MS * 2 ** attempt);
    }
  }
  throw lastError;
}
