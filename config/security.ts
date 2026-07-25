export const protectedPrefixes = ["/chat", "/account"] as const;
export const adminPrefix = "/admin";
export const supportedOrigins = (process.env.ALLOWED_ORIGINS ?? "https://moatazai26.chatgpt.site").split(",").map((origin) => origin.trim());
