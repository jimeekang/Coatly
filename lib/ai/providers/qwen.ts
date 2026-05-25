import 'server-only';

import {
  AIProviderError,
  type AIProvider,
  type AIProviderGenerateRequest,
  type AIProviderGenerateResult,
  type AIProviderUsage,
} from '@/lib/ai/providers/types';

export const DEFAULT_QWEN_MODEL = 'qwen3-vl-flash';
export const DEFAULT_QWEN_BASE_URL =
  'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';

export interface QwenProviderOptions {
  env?: Partial<
    Pick<NodeJS.ProcessEnv, 'QWEN_API_KEY' | 'QWEN_MODEL' | 'QWEN_BASE_URL'>
  >;
  fetch?: typeof fetch;
}

interface QwenChatCompletionsPayload {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content:
      | string
      | Array<
          | { type: 'text'; text: string }
          | { type: 'image_url'; image_url: { url: string } }
        >;
  }>;
  response_format: {
    type: 'json_object';
  };
  temperature?: number;
  max_tokens?: number;
}

function isRetryableStatus(status: number) {
  return status === 408 || status === 429 || (status >= 500 && status <= 599);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function readFiniteNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function readUsage(responseJson: unknown): AIProviderUsage {
  if (!isRecord(responseJson) || !isRecord(responseJson.usage)) {
    return {};
  }

  const inputTokens =
    readFiniteNumber(responseJson.usage.prompt_tokens) ??
    readFiniteNumber(responseJson.usage.input_tokens);
  const outputTokens =
    readFiniteNumber(responseJson.usage.completion_tokens) ??
    readFiniteNumber(responseJson.usage.output_tokens);
  const totalTokens =
    readFiniteNumber(responseJson.usage.total_tokens) ??
    (inputTokens !== undefined && outputTokens !== undefined
      ? inputTokens + outputTokens
      : undefined);

  return {
    ...(inputTokens !== undefined ? { inputTokens } : {}),
    ...(outputTokens !== undefined ? { outputTokens } : {}),
    ...(totalTokens !== undefined ? { totalTokens } : {}),
  };
}

function readFirstMessageContent(responseJson: unknown) {
  if (!isRecord(responseJson) || !Array.isArray(responseJson.choices)) {
    return null;
  }

  const [firstChoice] = responseJson.choices;
  if (!isRecord(firstChoice) || !isRecord(firstChoice.message)) {
    return null;
  }

  return typeof firstChoice.message.content === 'string'
    ? firstChoice.message.content
    : null;
}

function buildMessages(request: AIProviderGenerateRequest): QwenChatCompletionsPayload['messages'] {
  if (!request.images?.length) {
    return request.messages;
  }

  let lastUserMessageIndex = -1;
  for (let index = request.messages.length - 1; index >= 0; index -= 1) {
    if (request.messages[index]?.role === 'user') {
      lastUserMessageIndex = index;
      break;
    }
  }

  return request.messages.map((message, index) => {
    if (index !== lastUserMessageIndex) {
      return message;
    }

    return {
      role: message.role,
      content: [
        { type: 'text', text: message.content },
        ...request.images!.map((image) => ({
          type: 'image_url' as const,
          image_url: { url: image.url },
        })),
      ],
    };
  });
}

export function createQwenProvider(options: QwenProviderOptions = {}): AIProvider {
  const env = options.env ?? process.env;
  const apiKey = env.QWEN_API_KEY?.trim() ?? '';
  const model = env.QWEN_MODEL?.trim() || DEFAULT_QWEN_MODEL;
  const endpoint = env.QWEN_BASE_URL?.trim() || DEFAULT_QWEN_BASE_URL;
  const fetchClient = options.fetch ?? fetch;

  return {
    info: {
      provider: 'qwen',
      model,
      configured: apiKey.length > 0,
    },
    async generate<TOutput = unknown>(
      request: AIProviderGenerateRequest
    ): Promise<AIProviderGenerateResult<TOutput>> {
      if (!apiKey) {
        throw new AIProviderError({
          provider: 'qwen',
          code: 'unconfigured',
          message: 'Qwen provider is not configured: QWEN_API_KEY is missing.',
          retryable: false,
          metadata: {
            model,
          },
        });
      }

      const payload: QwenChatCompletionsPayload = {
        model,
        messages: buildMessages(request),
        response_format: {
          type: 'json_object',
        },
        ...(request.temperature !== undefined
          ? { temperature: request.temperature }
          : {}),
        ...(request.maxOutputTokens !== undefined
          ? { max_tokens: request.maxOutputTokens }
          : {}),
      };

      let response: Response;
      try {
        response = await fetchClient(endpoint, {
          method: 'POST',
          headers: {
            authorization: `Bearer ${apiKey}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
      } catch {
        throw new AIProviderError({
          provider: 'qwen',
          code: 'network_error',
          message: 'Qwen request failed before receiving a response.',
          retryable: true,
          metadata: {
            model,
          },
        });
      }

      if (!response.ok) {
        throw new AIProviderError({
          provider: 'qwen',
          code: 'http_error',
          message: `Qwen request failed with HTTP ${response.status}.`,
          status: response.status,
          retryable: isRetryableStatus(response.status),
          metadata: {
            model,
            status: response.status,
          },
        });
      }

      let responseJson: unknown;
      try {
        responseJson = (await response.json()) as unknown;
      } catch {
        throw new AIProviderError({
          provider: 'qwen',
          code: 'invalid_response',
          message: 'Qwen returned a response that was not valid JSON.',
          retryable: false,
          metadata: {
            model,
          },
        });
      }

      const text = readFirstMessageContent(responseJson);
      if (!text) {
        throw new AIProviderError({
          provider: 'qwen',
          code: 'invalid_response',
          message: 'Qwen response did not include choices[0].message.content.',
          retryable: false,
          metadata: {
            model,
          },
        });
      }

      let output: TOutput;
      try {
        output = JSON.parse(text) as TOutput;
      } catch {
        throw new AIProviderError({
          provider: 'qwen',
          code: 'invalid_response',
          message: 'Qwen message content was not valid JSON.',
          retryable: false,
          metadata: {
            model,
          },
        });
      }

      return {
        provider: 'qwen',
        model,
        output,
        text,
        usage: readUsage(responseJson),
        metadata: {
          endpoint,
        },
      };
    },
  };
}
