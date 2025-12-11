import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

const FACEBOOK_GRAPH_URL = "https://graph.facebook.com/v21.0";

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { accountId, adIds } = body;

    if (!accountId || !adIds?.length) {
      return NextResponse.json(
        { error: "Account ID and ad IDs required" },
        { status: 400 }
      );
    }

    const account = await prisma.adAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    const results: { adId: string; success: boolean; error?: string }[] = [];

    // Delete each ad
    for (const adId of adIds) {
      try {
        const response = await fetch(
          `${FACEBOOK_GRAPH_URL}/${adId}?access_token=${account.accessToken}`,
          { method: "DELETE" }
        );

        if (!response.ok) {
          const error = await response.json();
          results.push({
            adId,
            success: false,
            error: error.error?.message || "Delete failed",
          });
        } else {
          results.push({ adId, success: true });
        }
      } catch (err) {
        results.push({
          adId,
          success: false,
          error: err instanceof Error ? err.message : "Delete failed",
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: results.length,
        deleted: successCount,
        failed: failCount,
      },
    });
  } catch (error) {
    console.error("Error deleting ads:", error);
    return NextResponse.json(
      { error: "Failed to delete ads" },
      { status: 500 }
    );
  }
}
