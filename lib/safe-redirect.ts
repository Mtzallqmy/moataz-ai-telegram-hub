export function safeRelativePath(value:string|null|undefined,fallback="/chat"){if(!value||!value.startsWith("/")||value.startsWith("//")||value.includes("\\"))return fallback;return value;}
