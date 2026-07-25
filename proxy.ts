import { NextResponse, type NextRequest } from "next/server";
import { adminPrefix, protectedPrefixes } from "@/config/security";
import { createSupabaseMiddlewareClient } from "@/lib/supabase/server";

function redirectWithSession(request: NextRequest, response: NextResponse, destination: string) {
  const redirect = NextResponse.redirect(new URL(destination, request.url));
  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  redirect.headers.set("Cache-Control", "private, no-store");
  redirect.headers.set("Pragma", "no-cache");
  return redirect;
}

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isProtected = protectedPrefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
  const isAdmin = path === adminPrefix || path.startsWith(`${adminPrefix}/`);
  const response = NextResponse.next({ request });
  response.headers.set("Cache-Control", "private, no-store");

  try {
    const supabase = createSupabaseMiddlewareClient(request, response);
    const { data: { user } } = await supabase.auth.getUser();
    if ((isProtected || isAdmin) && !user) {
      return redirectWithSession(request, response, `/login?returnTo=${encodeURIComponent(path)}`);
    }
    if (isAdmin && user) {
      const { data: allowed, error } = await supabase.rpc("has_permission", { permission_code: "admin.access", target_user: user.id });
      if (error || !allowed) return redirectWithSession(request, response, "/403");
    }
  } catch {
    if (isProtected || isAdmin) return redirectWithSession(request, response, "/login?error=auth_not_configured");
  }
  return response;
}

export const config = { matcher: ["/chat/:path*", "/account/:path*", "/admin/:path*"] };
