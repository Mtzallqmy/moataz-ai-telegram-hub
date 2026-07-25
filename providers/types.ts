export type ChatRole = "system" | "user" | "assistant" | "tool";
export type ProviderErrorCode = "INVALID_CONFIGURATION" | "AUTHENTICATION_FAILED" | "RATE_LIMITED" | "TIMEOUT" | "ABORTED" | "MODEL_NOT_FOUND" | "MODEL_UNAVAILABLE" | "CAPABILITY_UNSUPPORTED" | "CONTENT_FILTERED" | "PROVIDER_UNAVAILABLE" | "INVALID_RESPONSE" | "NETWORK_ERROR" | "UNKNOWN";

export type TextContentPart = { type: "text"; text: string };
export type ImageContentPart = { type: "image"; url: string; mimeType?: string; detail?: "auto" | "low" | "high" };
export type AudioContentPart = { type: "audio"; url: string; mimeType: string; transcript?: string };
export type VideoContentPart = { type: "video"; url: string; mimeType: string };
export type DocumentContentPart = { type: "document"; fileId: string; name: string; mimeType: string; extractedText?: string };
export type ToolResult = { type: "tool-result"; toolCallId: string; result: unknown };
export type UnifiedContentPart = TextContentPart | ImageContentPart | AudioContentPart | VideoContentPart | DocumentContentPart | ToolResult;
export type ToolCall = { id: string; name: string; arguments: Record<string, unknown> };
export type UnifiedChatMessage = { id?: string; role: ChatRole; content: string | UnifiedContentPart[]; name?: string; toolCallId?: string; toolCalls?: ToolCall[] };

export type ModelCapabilities = { text: boolean; vision: boolean; audio: boolean; video: boolean; documents: boolean; tools: boolean; structuredOutput: boolean; embeddings: boolean; streaming: boolean; contextWindow?: number; maxOutputTokens?: number };
export type ProviderCapabilities = { modelDiscovery: boolean; streaming: boolean; tools: boolean; vision: boolean; audio: boolean; video: boolean; documents: boolean; embeddings: boolean };
export type ProviderCredential = { id?: string; secret: string; authType?: "bearer" | "api_key_header" | "query" | "basic" | "custom_headers" | "none"; headerName?: string; queryName?: string; username?: string; customHeaders?: Record<string, string> };
export type ProviderConfiguration = { id: string; type: string; name: string; baseUrl: string; chatEndpoint?: string; modelsEndpoint?: string; apiVersion?: string; enabled: boolean; timeoutMs?: number; retryCount?: number; headers?: Record<string,string>; credential?: ProviderCredential; defaultModel?: string };
export type ProviderRequestContext = { requestId: string; userId?: string; signal?: AbortSignal; timeoutMs?: number; attempt?: number };
export type ProviderUsage = { inputTokens?: number; outputTokens?: number; totalTokens?: number; cachedTokens?: number };
export type ProviderLatency = { totalMs: number; firstTokenMs?: number };
export type UnifiedChatRequest = { model: string; messages: UnifiedChatMessage[]; temperature?: number; maxOutputTokens?: number; tools?: Array<{ name: string; description?: string; parameters: Record<string, unknown> }>; responseFormat?: "text" | "json"; stream?: boolean; metadata?: Record<string,string> };
export type UnifiedChatResponse = { id: string; model: string; content: string; toolCalls?: ToolCall[]; finishReason?: string; usage?: ProviderUsage; latency?: ProviderLatency; providerRequestId?: string };
export type StreamingEvent = { type: "start" | "delta" | "tool-call" | "usage" | "error" | "done"; content?: string; toolCall?: ToolCall; usage?: ProviderUsage; error?: { code: ProviderErrorCode; message: string; errorId: string } };
export type StreamingResponse = AsyncIterable<StreamingEvent>;
export type ProviderModel = { id: string; name?: string; capabilities: ModelCapabilities };
export type ProviderHealth = { ok: boolean; latencyMs: number; checkedAt: string; errorCode?: ProviderErrorCode };

export class ProviderError extends Error {
  readonly errorId = crypto.randomUUID();
  constructor(message: string, public readonly code: ProviderErrorCode, public readonly retryable = false, public readonly status = 502, public readonly safeDetails?: Record<string, unknown>) { super(message); this.name = "ProviderError"; }
}

export interface AIProviderAdapter {
  readonly type: string;
  readonly capabilities: ProviderCapabilities;
  validateConfiguration(configuration: ProviderConfiguration): Promise<void>;
  testConnection(configuration: ProviderConfiguration, context: ProviderRequestContext): Promise<ProviderHealth>;
  listModels(configuration: ProviderConfiguration, context: ProviderRequestContext): Promise<ProviderModel[]>;
  complete(configuration: ProviderConfiguration, request: UnifiedChatRequest, context: ProviderRequestContext): Promise<UnifiedChatResponse>;
  stream(configuration: ProviderConfiguration, request: UnifiedChatRequest, context: ProviderRequestContext): StreamingResponse;
}

// Compatibility aliases for stage-one consumers.
export type ChatMessage = UnifiedChatMessage;
export type ChatCompletionRequest = UnifiedChatRequest;
export type ChatCompletionResponse = UnifiedChatResponse;
export type UsageMetadata = ProviderUsage & { providerRequestId?: string; latencyMs?: number };
