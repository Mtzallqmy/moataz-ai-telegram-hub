import { OpenAICompatibleAdapter } from "./openai-compatible-adapter";
import { ProviderError, type AIProviderAdapter, type ProviderHealth, type ProviderModel, type StreamingResponse, type UnifiedChatResponse } from "./types";

export class NamedOpenAIAdapter extends OpenAICompatibleAdapter { constructor(readonly type:string){super();} }
export class BedrockAdapter implements AIProviderAdapter{
  readonly type="amazon-bedrock";readonly capabilities={modelDiscovery:false,streaming:true,tools:true,vision:true,audio:false,video:false,documents:true,embeddings:true};
  private unavailable():never{throw new ProviderError("Amazon Bedrock requires a server-side SigV4 credential provider integration","INVALID_CONFIGURATION",false,501);}
  async validateConfiguration(){this.unavailable();}
  async testConnection():Promise<ProviderHealth>{return this.unavailable();}
  async listModels():Promise<ProviderModel[]>{return this.unavailable();}
  async complete():Promise<UnifiedChatResponse>{return this.unavailable();}
  stream():StreamingResponse{return{[Symbol.asyncIterator]:async function*(){throw new ProviderError("Bedrock is not configured","INVALID_CONFIGURATION",false,501);}};}
}
