import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migration=await readFile(new URL("../supabase/migrations/202607220001_initial_auth_rbac.sql",import.meta.url),"utf8");
const redirects=await readFile(new URL("../lib/safe-redirect.ts",import.meta.url),"utf8");
const ownerFlow=await readFile(new URL("../lib/supabase/admin.ts",import.meta.url),"utf8");
const loginPage=await readFile(new URL("../app/login/page.tsx",import.meta.url),"utf8");
const loginForm=await readFile(new URL("../components/login-form.tsx",import.meta.url),"utf8");
test("all sensitive tables enable RLS",()=>{for(const table of ["profiles","user_roles","audit_logs","login_events","user_api_keys","platform_settings"])assert.match(migration,new RegExp(`alter table public\\.${table} enable row level security`));});
test("new users receive profile settings and user role",()=>{assert.match(migration,/create or replace function public\.handle_new_user/);assert.match(migration,/where name='user'/);assert.match(migration,/on conflict do nothing/);});
test("API keys have no client policy",()=>{assert.doesNotMatch(migration,/create policy [^;]+ on public\.user_api_keys/i);});
test("last owner is protected",()=>{assert.match(migration,/cannot_remove_last_owner/);});
test("redirect helper rejects protocol-relative and backslash paths",()=>{assert.match(redirects,/startsWith\("\/\/"\)/);assert.match(redirects,/includes\("\\\\"\)/);});
test("owner assignment is server-side and allowlisted",()=>{assert.match(ownerFlow,/server-only/);assert.match(ownerFlow,/ownerEmails\.has\(email\)/);assert.match(ownerFlow,/supabaseAdminKey/);});
test("OAuth runtime configuration reaches the browser safely",()=>{assert.match(loginPage,/requireSupabasePublicEnv/);assert.match(loginPage,/configuration=\{\{url:env\.NEXT_PUBLIC_SUPABASE_URL,publishableKey:env\.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY\}\}/);assert.doesNotMatch(loginForm,/SUPABASE_SECRET_KEY|SERVICE_ROLE/);assert.match(loginForm,/createSupabaseBrowserClient\(configuration\)/);});
