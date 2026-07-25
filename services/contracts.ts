import type { ChatCompletionRequest, ChatCompletionResponse, ProviderConfiguration } from "@/providers/types";

export interface AuthenticationService { signInWithOAuth(provider:"google"|"github", redirectTo:string):Promise<{url:string}>; signOut():Promise<void>; }
export interface UserService { getById(id:string):Promise<unknown|null>; updateProfile(id:string,input:unknown):Promise<unknown>; }
export interface ProviderService { list():Promise<ProviderConfiguration[]>; create(input:ProviderConfiguration):Promise<ProviderConfiguration>; test(id:string):Promise<{ok:boolean;latencyMs:number}>; }
export interface ChatService { complete(userId:string, providerId:string, request:ChatCompletionRequest):Promise<ChatCompletionResponse>; }
export interface ContentService { listPublished(type:"article"|"book"|"post"):Promise<unknown[]>; }
export interface FileService { register(userId:string,input:unknown):Promise<unknown>; }
export interface StorageService { createUploadUrl(userId:string,path:string):Promise<string>; }
export interface NotificationService { send(channel:"email"|"telegram",input:unknown):Promise<void>; }
export interface AuditLogService { record(event:{actorId?:string;action:string;resource:string;metadata?:Record<string,unknown>}):Promise<void>; }
export interface SchedulingService { schedule(input:{contentId:string;publishAt:Date}):Promise<void>; }
