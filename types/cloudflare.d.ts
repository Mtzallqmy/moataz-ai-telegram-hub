interface Fetcher { fetch(input:RequestInfo|URL,init?:RequestInit):Promise<Response>; }
interface D1Database { readonly preparedStatementBrand?: unique symbol; }
declare module "cloudflare:workers" { export const env:{DB?:D1Database}; }
