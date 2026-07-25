import "server-only";
import { serverEnv } from "@/config/env.server";
export type SecretContext={providerId:string;credentialId:string};
export interface SecretCrypto{encrypt(plaintext:string,context:SecretContext):Promise<string>;decrypt(ciphertext:string,context:SecretContext):Promise<string>;}
const encoder=new TextEncoder();
function decodeKey(value:string){const bytes=Uint8Array.from(atob(value),c=>c.charCodeAt(0));if(bytes.byteLength!==32)throw new Error("PROVIDER_ENCRYPTION_KEY must decode to exactly 32 bytes");return bytes;}
export class AesGcmSecretCrypto implements SecretCrypto{
 private async key(){if(!serverEnv.PROVIDER_ENCRYPTION_KEY)throw new Error("Provider encryption is not configured");return crypto.subtle.importKey("raw",decodeKey(serverEnv.PROVIDER_ENCRYPTION_KEY),"AES-GCM",false,["encrypt","decrypt"]);}
 private aad(c:SecretContext){return encoder.encode(`provider:${c.providerId}:credential:${c.credentialId}:v1`);}
 async encrypt(plaintext:string,c:SecretContext){const iv=crypto.getRandomValues(new Uint8Array(12));const encrypted=new Uint8Array(await crypto.subtle.encrypt({name:"AES-GCM",iv,additionalData:this.aad(c)},await this.key(),encoder.encode(plaintext)));return`v1.${toBase64(iv)}.${toBase64(encrypted)}`;}
 async decrypt(ciphertext:string,c:SecretContext){const [version,iv,data]=ciphertext.split(".");if(version!=="v1"||!iv||!data)throw new Error("Unsupported encrypted secret format");const clear=await crypto.subtle.decrypt({name:"AES-GCM",iv:fromBase64(iv),additionalData:this.aad(c)},await this.key(),fromBase64(data));return new TextDecoder().decode(clear);}
}
function toBase64(bytes:Uint8Array){return btoa(String.fromCharCode(...bytes));}
function fromBase64(value:string){return Uint8Array.from(atob(value),c=>c.charCodeAt(0));}
export const secretCrypto:SecretCrypto=new AesGcmSecretCrypto();
