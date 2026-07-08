export type AIProviderName = string;

export type AIProviderMessageRole = 'system' | 'user' | 'assistant';

export interface AIProviderMessage {
  role: AIProviderMessageRole;
  content: string;
}

export interface AIProviderImageInput {
  url: string;
}

export type AIProviderMetadataValue =
  | string
  | number
  | boolean
  | null
  | undefined;

export type AIProviderMetadataMap = Record<string, AIProviderMetadataValue>;

export interface AIProviderGenerateRequest {
  messages: AIProviderMessage[];
  images?: AIProviderImageInput[];
  temperature?: number;
  maxOutputTokens?: number;
  metadata?: AIProviderMetadataMap;
}

export interface AIProviderUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

export interface AIProviderGenerateResult<TOutput = unknown> {
  provider: AIProviderName;
  model: string;
  output: TOutput;
  text: string;
  usage: AIProviderUsage;
  metadata: AIProviderMetadataMap;
}

export interface AIProviderInfo {
  provider: AIProviderName;
  model: string;
  configured: boolean;
}

export interface AIProvider {
  readonly info: AIProviderInfo;
  generate<TOutput = unknown>(
    request: AIProviderGenerateRequest
  ): Promise<AIProviderGenerateResult<TOutput>>;
}

export type AIProviderErrorCode =
  | 'unconfigured'
  | 'http_error'
  | 'network_error'
  | 'invalid_response';

export interface AIProviderErrorOptions {
  provider: AIProviderName;
  code: AIProviderErrorCode;
  message: string;
  retryable: boolean;
  status?: number;
  metadata?: AIProviderMetadataMap;
}

export class AIProviderError extends Error {
  readonly provider: AIProviderName;
  readonly code: AIProviderErrorCode;
  readonly retryable: boolean;
  readonly status?: number;
  readonly metadata: AIProviderMetadataMap;

  constructor(options: AIProviderErrorOptions) {
    super(options.message);
    this.name = 'AIProviderError';
    this.provider = options.provider;
    this.code = options.code;
    this.retryable = options.retryable;
    this.status = options.status;
    this.metadata = options.metadata ?? {};
  }
}
