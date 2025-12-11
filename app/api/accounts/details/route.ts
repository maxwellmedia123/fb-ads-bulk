import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const accounts = await prisma.adAccount.findMany({
      where: { isActive: true },
      include: {
        facebookPages: {
          select: {
            id: true,
            fbPageId: true,
            name: true,
          },
        },
        instagramAccounts: {
          select: {
            id: true,
            igAccountId: true,
            username: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ accounts });
  } catch (error) {
    console.error("Error fetching account details:", error);
    return NextResponse.json(
      { error: "Failed to fetch account details" },
      { status: 500 }
    );
  }
}
