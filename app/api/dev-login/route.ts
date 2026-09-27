import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const redirectTo = url.searchParams.get("callbackUrl") || "/dashboard";

  const cookieStore = await cookies();
  cookieStore.set("authjs.session-token", "demo-session-token-persian-openreply", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60,
  });

  return NextResponse.redirect(new URL(redirectTo, request.url));
}
