import { z } from "zod";
const contentPart=z.discriminatedUnion("type",[
 z.object({type:z.literal("text"),text:z.string().min(1).max(100_000)}),
 z.object({type:z.literal("image"),url:z.url(),mimeType:z.string().optional(),detail:z.enum(["auto","low","high"]).optional()}),
 z.object({type:z.literal("audio"),url:z.url(),mimeType:z.string(),transcript:z.string().max(100_000).optional()}),
 z.object({type:z.literal("video"),url:z.url(),mimeType:z.string()}),
 z.object({type:z.literal("document"),fileId:z.uuid(),name:z.string().max(255),mimeType:z.string(),extractedText:z.string().max(500_000).optional()}),
 z.object({type:z.literal("tool-result"),toolCallId:z.string(),result:z.unknown()})
]);
export const chatRequestSchema=z.object({conversationId:z.uuid().optional(),modelId:z.uuid(),message:z.string().trim().min(1).max(100_000),contentParts:z.array(contentPart).max(20).default([]),parentMessageId:z.uuid().optional(),temperature:z.number().min(0).max(2).optional(),maxOutputTokens:z.number().int().positive().max(128_000).optional(),idempotencyKey:z.string().uuid().optional()});
export type ChatRequestInput=z.infer<typeof chatRequestSchema>;
