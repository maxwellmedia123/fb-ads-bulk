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

  if (!accountId) {
    return NextResponse.json(
      { error: "Account ID required" },
      { status: 400 }
    );
  }

  try {
    const pages = await prisma.facebookPage.findMany({
      where: { adAccountId: accountId },
    });

    const instagramAccounts = await prisma.instagramAccount.findMany({
      where: { adAccountId: accountId },
    });

    return NextResponse.json({ pages, instagramAccounts });
  } catch (error) {
    console.error("Error fetching pages:", error);
    return NextResponse.json(
      { error: "Failed to fetch pages" },
      { status: 500 }
    );
  }
}
