import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AIProviderError } from '@/lib/ai/providers/types';
import { createQwenProvider } from '@/lib/ai/providers/qwen';

const qwenEnv = {
  QWEN_API_KEY: 'qwen-secret-test-key',
};

function createMockFetch(response: Response) {
  return vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(
    async () => response
  );
}

function createSuccessResponse(content: unknown) {
  return new Response(
    JSON.stringify({
      id: 'chatcmpl-test',
      choices: [
        {
          message: {
            content: JSON.stringify(content),
          },
        },
      ],
      usage: {
        prompt_tokens: 11,
        completion_tokens: 17,
        total_tokens: 28,
      },
    }),
    {
      status: 200,
      headers: {
        'content-type': 'application/json',
      },
    }
  );
}

describe('createQwenProvider', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('reports an unconfigured state when QWEN_API_KEY is missing', async () => {
    const fetchMock = createMockFetch(createSuccessResponse({ ok: true }));
    const provider = createQwenProvider({
      env: {},
      fetch: fetchMock,
    });

    await expect(
      provider.generate({
        messages: [{ role: 'user', content: 'Draft a repaint scope.' }],
      })
    ).rejects.toMatchObject({
      code: 'unconfigured',
      provider: 'qwen',
      retryable: false,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends a chat-completions compatible request with the default Qwen model', async () => {
    const fetchMock = createMockFetch(createSuccessResponse({ sections: [] }));
    const provider = createQwenProvider({
      env: qwenEnv,
      fetch: fetchMock,
    });

    await provider.generate({
      messages: [
        { role: 'system', content: 'Return JSON only.' },
        { role: 'user', content: 'Draft a repaint scope.' },
      ],
      temperature: 0.1,
      maxOutputTokens: 400,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          authorization: 'Bearer qwen-secret-test-key',
          'content-type': 'application/json',
        }),
      })
    );

    const [, init] = fetchMock.mock.calls[0];
    const payload = JSON.parse(String(init?.body)) as {
      model: string;
      messages: Array<{ role: string; content: string }>;
      temperature: number;
      max_tokens: number;
      response_format: { type: string };
    };

    expect(payload).toEqual({
      model: 'qwen3-vl-flash',
      messages: [
        { role: 'system', content: 'Return JSON only.' },
        { role: 'user', content: 'Draft a repaint scope.' },
      ],
      temperature: 0.1,
      max_tokens: 400,
      response_format: { type: 'json_object' },
    });
  });

  it('classifies retryable HTTP errors without leaking API keys', async () => {
    const fetchMock = createMockFetch(
      new Response(JSON.stringify({ error: 'rate limited' }), { status: 429 })
    );
    const provider = createQwenProvider({
      env: qwenEnv,
      fetch: fetchMock,
    });

    try {
      await provider.generate({
        messages: [{ role: 'user', content: 'Draft a repaint scope.' }],
      });
      throw new Error('Expected provider.generate to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(AIProviderError);
      const providerError = error as AIProviderError;
      expect(providerError.code).toBe('http_error');
      expect(providerError.status).toBe(429);
      expect(providerError.retryable).toBe(true);
      expect(providerError.message).not.toContain(qwenEnv.QWEN_API_KEY);
      expect(JSON.stringify(providerError.metadata)).not.toContain(
        qwenEnv.QWEN_API_KEY
      );
    }
  });

  it('classifies fetch failures as retryable without leaking API keys', async () => {
    const fetchMock = vi.fn<
      (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
    >(async () => {
      throw new TypeError('network unavailable for qwen-secret-test-key');
    });
    const provider = createQwenProvider({
      env: qwenEnv,
      fetch: fetchMock,
    });

    try {
      await provider.generate({
        messages: [{ role: 'user', content: 'Draft a repaint scope.' }],
      });
      throw new Error('Expected provider.generate to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(AIProviderError);
      const providerError = error as AIProviderError;
      expect(providerError.code).toBe('network_error');
      expect(providerError.retryable).toBe(true);
      expect(providerError.message).not.toContain(qwenEnv.QWEN_API_KEY);
      expect(JSON.stringify(providerError.metadata)).not.toContain(
        qwenEnv.QWEN_API_KEY
      );
    }
  });

  it('parses JSON content and maps token usage into provider-neutral output', async () => {
    const fetchMock = createMockFetch(
      createSuccessResponse({
        job_type: 'interior',
        scope_sections: [{ title: 'Walls', body: 'Prepare and repaint walls.' }],
      })
    );
    const provider = createQwenProvider({
      env: {
        QWEN_API_KEY: 'qwen-secret-test-key',
        QWEN_MODEL: 'qwen-custom-model',
        QWEN_BASE_URL: 'https://example.test/chat/completions',
      },
      fetch: fetchMock,
    });

    const result = await provider.generate({
      messages: [{ role: 'user', content: 'Draft a repaint scope.' }],
    });

    expect(result).toEqual({
      provider: 'qwen',
      model: 'qwen-custom-model',
      output: {
        job_type: 'interior',
        scope_sections: [{ title: 'Walls', body: 'Prepare and repaint walls.' }],
      },
      text: JSON.stringify({
        job_type: 'interior',
        scope_sections: [{ title: 'Walls', body: 'Prepare and repaint walls.' }],
      }),
      usage: {
        inputTokens: 11,
        outputTokens: 17,
        totalTokens: 28,
      },
      metadata: {
        endpoint: 'https://example.test/chat/completions',
      },
    });
  });
});
