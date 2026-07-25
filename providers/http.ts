import { ProviderError, type ProviderConfiguration, type ProviderRequestContext } from "./types";

const retryableStatus = new Set([408, 409, 425, 429, 500, 502, 503, 504]);
export function buildUrl(baseUrl: string, endpoint: string) { return new URL(endpoint.replace(/^\//, ""), baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`); }
export function authHeaders(configuration: ProviderConfiguration) {
  const credential=configuration.credential;
  if (!credential || credential.authType === "none") return { ...configuration.headers };
  if (credential.authType === "api_key_header") return { ...configuration.headers, [credential.headerName ?? "x-api-key"]: credential.secret };
  if (credential.authType === "basic") return { ...configuration.headers, Authorization:`Basic ${btoa(`${credential.username ?? ""}:${credential.secret}`)}` };
  if (credential.authType === "custom_headers") return { ...configuration.headers, ...credential.customHeaders };
  return { ...configuration.headers, Authorization:`Bearer ${credential.secret}` };
}
export async function providerFetch(configuration: ProviderConfiguration, input: URL, init: RequestInit, context: ProviderRequestContext) {
  const attempts=(configuration.retryCount ?? 2)+1;
  for(let attempt=1;attempt<=attempts;attempt++){
    const timeout=AbortSignal.timeout(context.timeoutMs ?? configuration.timeoutMs ?? 90_000);
    const signal=context.signal ? AbortSignal.any([context.signal,timeout]) : timeout;
    try {
      const response=await fetch(input,{...init,signal});
      if(response.ok || !retryableStatus.has(response.status) || attempt===attempts) return response;
    } catch(error) {
      if(context.signal?.aborted) throw new ProviderError("Request cancelled","ABORTED",false,499);
      if(attempt===attempts) throw new ProviderError(error instanceof DOMException && error.name==="TimeoutError" ? "Provider timed out" : "Provider network error", error instanceof DOMException && error.name==="TimeoutError" ? "TIMEOUT" : "NETWORK_ERROR", true,504);
    }
    await new Promise(resolve=>setTimeout(resolve,Math.min(250*2**(attempt-1),2000)+Math.random()*100));
  }
  throw new ProviderError("Provider unavailable","PROVIDER_UNAVAILABLE",true,503);
}
export function normalizedError(status:number, fallback="Provider request failed") {
  if(status===401 || status===403) return new ProviderError("Provider authentication failed","AUTHENTICATION_FAILED",false,status);
  if(status===404) return new ProviderError("Provider model was not found","MODEL_NOT_FOUND",false,status);
  if(status===429) return new ProviderError("Provider rate limit exceeded","RATE_LIMITED",true,status);
  return new ProviderError(fallback,status>=500?"PROVIDER_UNAVAILABLE":"UNKNOWN",status>=500,status);
}

export async function* parseSse(response:Response, map:(value:unknown)=>string | null):AsyncIterable<string>{
  if(!response.body) throw new ProviderError("Provider returned no stream","INVALID_RESPONSE");
  const reader=response.body.pipeThrough(new TextDecoderStream()).getReader(); let buffer="";
  try { while(true){const {value,done}=await reader.read();if(done)break;buffer+=value;const frames=buffer.split(/\r?\n\r?\n/);buffer=frames.pop()??"";for(const frame of frames){for(const line of frame.split(/\r?\n/)){if(!line.startsWith("data:"))continue;const raw=line.slice(5).trim();if(!raw || raw==="[DONE]")continue;try{const delta=map(JSON.parse(raw));if(delta)yield delta;}catch{/* malformed provider event is ignored; final validation still applies */}}}} } finally {reader.releaseLock();}
}
