import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { fetchAdSets } from "@/lib/facebook";

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

    const rawAdSets = await fetchAdSets(
      account.fbAccountId,
      account.accessToken,
      ["ACTIVE", "PAUSED"]
    );

    // Transform to include spend_7d
    const adSets = rawAdSets.map((adSet) => ({
      id: adSet.id,
      name: adSet.name,
      status: adSet.status,
      campaign: adSet.campaign,
      created_time: adSet.created_time,
      spend_7d: adSet.insights?.data?.[0]?.spend
        ? parseFloat(adSet.insights.data[0].spend)
        : 0,
    }));

    return NextResponse.json({ adSets });
  } catch (error) {
    console.error("Error fetching ad sets:", error);
    return NextResponse.json(
      { error: "Failed to fetch ad sets" },
      { status: 500 }
    );
  }
}
