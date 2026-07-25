import type { ProviderUsage } from "@/providers/types";
export function calculateEstimatedCost(usage:ProviderUsage,pricing:unknown){const p=(pricing??{}) as Record<string,unknown>;const input=typeof p.inputPerMillion==="number"?p.inputPerMillion:0;const output=typeof p.outputPerMillion==="number"?p.outputPerMillion:0;return((usage.inputTokens??0)*input+(usage.outputTokens??0)*output)/1_000_000;}
