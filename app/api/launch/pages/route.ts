import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { fetchPages, fetchInstagramAccounts } from "@/lib/facebook";

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get("accountId");

  if (!accountId) {
    return NextResponse.json(
      { error: "Account ID required" },
      { status: 400 }
    );
  }

  try {
    const account = await prisma.adAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Fetch pages from Facebook API with profile pictures
    const fbPages = await fetchPages(account.accessToken, account.fbAccountId);

    // Transform to include picture URL
    const pages = fbPages.map((page) => ({
      id: page.id,
      fbPageId: page.id,
      name: page.name,
      pictureUrl: page.picture?.data?.url || null,
    }));

    // Fetch Instagram accounts for each page - track which page they belong to
    const instagramAccounts: Array<{
      id: string;
      igAccountId: string;
      username: string;
      pictureUrl: string | null;
      connectedPageId: string; // The Facebook Page this IG account is connected to
    }> = [];

    for (const page of fbPages) {
      if (page.access_token) {
        try {
          const igAccounts = await fetchInstagramAccounts(page.id, page.access_token);
          for (const ig of igAccounts) {
            // Only add if not already in list (avoid duplicates)
            if (!instagramAccounts.find(existing => existing.igAccountId === ig.id)) {
              instagramAccounts.push({
                id: ig.id,
                igAccountId: ig.id,
                username: ig.username,
                pictureUrl: ig.profile_picture_url || null,
                connectedPageId: page.id, // Track which page this IG is connected to
              });
            }
          }
        } catch (err) {
          console.error(`Error fetching IG for page ${page.id}:`, err);
        }
      }
    }

    return NextResponse.json({ pages, instagramAccounts });
  } catch (error) {
    console.error("Error fetching pages:", error);
    return NextResponse.json(
      { error: "Failed to fetch pages" },
      { status: 500 }
    );
  }
}
