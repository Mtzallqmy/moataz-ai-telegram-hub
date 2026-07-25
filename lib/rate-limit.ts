export type RateLimitDecision = { allowed:boolean; limit:number; remaining:number; resetAt:Date };
export interface RateLimiter { consume(key:string,options:{limit:number;windowMs:number}):Promise<RateLimitDecision>; }
export class UnconfiguredRateLimiter implements RateLimiter { async consume():Promise<RateLimitDecision>{ throw new Error("A distributed rate limiter must be configured before enabling write APIs"); } }
