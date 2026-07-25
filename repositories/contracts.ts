export interface Repository<TEntity, TCreate> { findById(id:string):Promise<TEntity|null>; list():Promise<TEntity[]>; create(input:TCreate):Promise<TEntity>; }
export interface ConversationRepository { assertOwnership(conversationId:string,userId:string):Promise<boolean>; }
export interface ProviderRepository { getDecryptedConfiguration(id:string):Promise<unknown|null>; }
export interface AuditLogRepository { append(event:unknown):Promise<void>; }
