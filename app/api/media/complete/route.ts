import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

// POST - Complete upload by saving metadata to database
export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { accountId, r2Key, name, type, contentType, fileSize } = body;

    if (!accountId || !r2Key || !name || !type || !contentType) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify account exists
    const account = await prisma.adAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 }
      );
    }

    // Generate the URL
    const r2Url = R2_PUBLIC_URL
      ? `${R2_PUBLIC_URL}/${r2Key}`
      : `https://placeholder.r2.cloudflarestorage.com/${r2Key}`;

    // Save to database
    const mediaAsset = await prisma.mediaAsset.create({
      data: {
        adAccountId: accountId,
        name,
        tags: [],
        type: type as "IMAGE" | "VIDEO",
        r2Key,
        r2Url,
        mimeType: contentType,
        fileSizeBytes: fileSize || 0,
      },
    });

    return NextResponse.json({ media: mediaAsset });
  } catch (error) {
    console.error("Error completing upload:", error);
    return NextResponse.json(
      { error: "Failed to complete upload" },
      { status: 500 }
    );
  }
}
