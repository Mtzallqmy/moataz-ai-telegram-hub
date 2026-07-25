import type { AIProviderAdapter } from "./types";
import { OpenAICompatibleAdapter } from "./openai-compatible-adapter";
import { AnthropicAdapter } from "./anthropic-adapter";
import { GeminiAdapter } from "./gemini-adapter";
import { CohereAdapter } from "./cohere-adapter";
import { BedrockAdapter, NamedOpenAIAdapter } from "./known-adapters";

export class ProviderRegistry {
  private readonly adapters=new Map<string,AIProviderAdapter>();
  register(adapter:AIProviderAdapter){if(this.adapters.has(adapter.type))throw new Error(`Adapter already registered: ${adapter.type}`);this.adapters.set(adapter.type,adapter);return this;}
  get(type:string){const adapter=this.adapters.get(type);if(!adapter)throw new Error(`Unsupported provider adapter: ${type}`);return adapter;}
  supportedTypes(){return[...this.adapters.keys()];}
}
export const providerRegistry=new ProviderRegistry()
 .register(new OpenAICompatibleAdapter()).register(new NamedOpenAIAdapter("openai"))
 .register(new AnthropicAdapter()).register(new GeminiAdapter()).register(new CohereAdapter())
 .register(new NamedOpenAIAdapter("openrouter")).register(new NamedOpenAIAdapter("groq"))
 .register(new NamedOpenAIAdapter("mistral")).register(new NamedOpenAIAdapter("deepseek"))
 .register(new NamedOpenAIAdapter("xai")).register(new NamedOpenAIAdapter("azure-openai"))
 .register(new BedrockAdapter());
