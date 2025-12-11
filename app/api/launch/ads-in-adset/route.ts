import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

const FACEBOOK_GRAPH_URL = "https://graph.facebook.com/v21.0";

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get("accountId");
  const adSetId = searchParams.get("adSetId");

  if (!accountId || !adSetId) {
    return NextResponse.json(
      { error: "Account ID and Ad Set ID required" },
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

    // Fetch ads from the ad set
    const response = await fetch(
      `${FACEBOOK_GRAPH_URL}/${adSetId}/ads?fields=id,name,status&access_token=${account.accessToken}`
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "Failed to fetch ads");
    }

    const data = await response.json();

    return NextResponse.json({ ads: data.data || [] });
  } catch (error) {
    console.error("Error fetching ads:", error);
    return NextResponse.json(
      { error: "Failed to fetch ads" },
      { status: 500 }
    );
  }
}
