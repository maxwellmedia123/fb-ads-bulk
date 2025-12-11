import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getFacebookOAuthUrl } from "@/lib/facebook";
import { randomBytes } from "crypto";

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Generate state parameter for CSRF protection
  const state = randomBytes(32).toString("hex");

  // Get the base URL for the redirect
  const baseUrl = process.env.NEXTAUTH_URL || request.nextUrl.origin;
  const redirectUri = `${baseUrl}/api/auth/facebook/callback`;

  // Store state in a cookie for verification
  const oauthUrl = getFacebookOAuthUrl(redirectUri, state);

  const response = NextResponse.redirect(oauthUrl);
  response.cookies.set("fb_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 minutes
  });

  return response;
}
