import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  fetchAdAccounts,
  fetchPages,
  fetchInstagramAccounts,
} from "@/lib/facebook";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.redirect(new URL("/auth/signin", request.url));
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // Check for OAuth errors
  if (error) {
    console.error("Facebook OAuth error:", error, errorDescription);
    return NextResponse.redirect(
      new URL(`/accounts?error=${encodeURIComponent(errorDescription || error)}`, request.url)
    );
  }

  // Verify state parameter
  const savedState = request.cookies.get("fb_oauth_state")?.value;
  if (!state || state !== savedState) {
    return NextResponse.redirect(
      new URL("/accounts?error=Invalid state parameter", request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/accounts?error=No authorization code", request.url)
    );
  }

  try {
    const baseUrl = process.env.NEXTAUTH_URL || request.nextUrl.origin;
    const redirectUri = `${baseUrl}/api/auth/facebook/callback`;

    // Exchange code for short-lived token
    const tokenData = await exchangeCodeForToken(code, redirectUri);

    // Exchange for long-lived token
    const longLivedToken = await exchangeForLongLivedToken(tokenData.access_token);

    // Fetch ad accounts
    const adAccounts = await fetchAdAccounts(longLivedToken.access_token);

    if (adAccounts.length === 0) {
      return NextResponse.redirect(
        new URL("/accounts?error=No ad accounts found", request.url)
      );
    }

    // Store all ad accounts
    const expiresAt = new Date(Date.now() + longLivedToken.expires_in * 1000);

    for (const account of adAccounts) {
      const existingAccount = await prisma.adAccount.findUnique({
        where: { fbAccountId: account.account_id },
      });

      if (existingAccount) {
        // Update existing account
        await prisma.adAccount.update({
          where: { id: existingAccount.id },
          data: {
            accessToken: longLivedToken.access_token,
            tokenExpiresAt: expiresAt,
            isActive: true,
            name: account.name,
            businessManagerId: account.business?.id,
          },
        });
      } else {
        // Create new account
        const newAccount = await prisma.adAccount.create({
          data: {
            fbAccountId: account.account_id,
            name: account.name,
            businessManagerId: account.business?.id,
            accessToken: longLivedToken.access_token,
            tokenExpiresAt: expiresAt,
          },
        });

        // Fetch and store pages
        try {
          const pages = await fetchPages(longLivedToken.access_token, account.account_id);
          for (const page of pages) {
            await prisma.facebookPage.upsert({
              where: {
                fbPageId_adAccountId: {
                  fbPageId: page.id,
                  adAccountId: newAccount.id,
                },
              },
              create: {
                fbPageId: page.id,
                name: page.name,
                accessToken: page.access_token,
                adAccountId: newAccount.id,
              },
              update: {
                name: page.name,
                accessToken: page.access_token,
              },
            });

            // Fetch Instagram accounts for this page
            if (page.access_token) {
              try {
                const igAccounts = await fetchInstagramAccounts(page.id, page.access_token);
                for (const ig of igAccounts) {
                  await prisma.instagramAccount.upsert({
                    where: {
                      igAccountId_adAccountId: {
                        igAccountId: ig.id,
                        adAccountId: newAccount.id,
                      },
                    },
                    create: {
                      igAccountId: ig.id,
                      username: ig.username,
                      adAccountId: newAccount.id,
                    },
                    update: {
                      username: ig.username,
                    },
                  });
                }
              } catch (igError) {
                console.warn("Failed to fetch Instagram accounts for page:", page.id, igError);
              }
            }
          }
        } catch (pageError) {
          console.warn("Failed to fetch pages for account:", account.account_id, pageError);
        }
      }
    }

    // Clear the state cookie and redirect to accounts page
    const response = NextResponse.redirect(
      new URL("/accounts?success=true", request.url)
    );
    response.cookies.delete("fb_oauth_state");

    return response;
  } catch (err) {
    console.error("Facebook OAuth callback error:", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.redirect(
      new URL(`/accounts?error=${encodeURIComponent(errorMessage)}`, request.url)
    );
  }
}
