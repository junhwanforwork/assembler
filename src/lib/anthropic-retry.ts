/**
 * callAnthropic 지수 백오프 재시도 래퍼 (ASS-020).
 * 재시도 대상은 일시적 서버 오류(429/500/529)만 — 키없음·refusal·400/401/403 등은 즉시 throw(재시도 무의미).
 * 카피 변환은 라우트가 담당 — 여기서는 분류·재시도만.
 */

import {
  AnthropicApiError,
  callAnthropic,
  streamAnthropic,
  type AnthropicResult,
  type AnthropicUsage,
} from "@/lib/anthropic";

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

/**
 * 스트리밍 재시도 래퍼 (ASS-204) — 첫 토큰 전 일시 오류만 재시도한다.
 * 첫 text 토큰이 한 번이라도 나오면(=레이어가 클라로 흘러갈 수 있음) 재시도 금지 — 이중 방출 방지.
 *
 * ASM-044: params.wallMs 는 단일 시도가 아니라 **재시도 전체의 총 예산**이다.
 * 시도마다 남은 예산을 wallMs 로 갱신 주입하고(백오프 대기도 차감), 소진 시 즉시 504 를 던진다
 * (ai_timeout 계약 유지). 시도별 독립 wall 이면 늦은 retryable 실패(429/500/529) 후 재시도가
 * 라우트 maxDuration(300s)을 넘겨 플랫폼 에러 + input 과금 누적이 된다(7차 보안 리뷰 MEDIUM).
 * 첫 시도는 전체 예산을 그대로 받아 단일 시도 동작은 불변. wallMs 미지정이면 기존과 동일(예산 없음).
 */
export async function streamAnthropicWithRetry(
  params: CallParams,
  onText: (delta: string) => void,
  maxRetries: number = DEFAULT_MAX_RETRIES,
): Promise<AnthropicUsage | undefined> {
  const deadline = params.wallMs !== undefined ? Date.now() + params.wallMs : undefined;
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    let attemptParams = params;
    if (deadline !== undefined) {
      const remaining = deadline - Date.now();
      if (remaining <= 0) throw new AnthropicApiError(504, "Anthropic 응답 시간이 초과됐어요");
      attemptParams = { ...params, wallMs: remaining };
    }
    let started = false;
    try {
      return await streamAnthropic(attemptParams, (delta) => {
        started = true;
        onText(delta);
      });
    } catch (error) {
      lastError = error;
      if (started || !isRetryable(error) || attempt === maxRetries) throw error;
      const backoff = BASE_DELAY_MS * 2 ** attempt;
      // 예산을 넘겨 자지 않는다 — 남은 예산까지만 대기하면 다음 시도 진입부에서 504 로 끝난다.
      await delay(deadline !== undefined ? Math.min(backoff, Math.max(0, deadline - Date.now())) : backoff);
    }
  }
  throw lastError;
}
