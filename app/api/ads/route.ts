import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get("accountId");
  const status = searchParams.get("status");
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = parseInt(searchParams.get("offset") || "0");

  if (!accountId) {
    return NextResponse.json(
      { error: "Account ID required" },
      { status: 400 }
    );
  }

  try {
    const where: {
      adAccountId: string;
      status?: "PENDING" | "LAUNCHED" | "FAILED" | "PAUSED";
    } = { adAccountId: accountId };

    if (status && ["PENDING", "LAUNCHED", "FAILED", "PAUSED"].includes(status)) {
      where.status = status as "PENDING" | "LAUNCHED" | "FAILED" | "PAUSED";
    }

    const [ads, total] = await Promise.all([
      prisma.launchedAd.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.launchedAd.count({ where }),
    ]);

    // Fetch media assets for these ads
    const mediaAssetIds = ads.flatMap((ad) => ad.mediaAssetIds);
    const mediaAssets = await prisma.mediaAsset.findMany({
      where: { id: { in: mediaAssetIds } },
      select: { id: true, name: true, type: true, r2Url: true },
    });

    const mediaMap = new Map(mediaAssets.map((m) => [m.id, m]));

    const adsWithMedia = ads.map((ad) => ({
      ...ad,
      media: ad.mediaAssetIds
        .map((id) => mediaMap.get(id))
        .filter(Boolean),
    }));

    return NextResponse.json({
      ads: adsWithMedia,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + ads.length < total,
      },
    });
  } catch (error) {
    console.error("Error fetching ads:", error);
    return NextResponse.json(
      { error: "Failed to fetch ads" },
      { status: 500 }
    );
  }
}
