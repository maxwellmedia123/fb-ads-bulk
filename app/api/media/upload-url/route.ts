import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { generateMediaKey, getPresignedUploadUrl } from "@/lib/r2";

// POST - Get a presigned URL for direct upload to R2
export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { accountId, fileName, contentType, fileSize } = body;

    if (!accountId || !fileName || !contentType) {
      return NextResponse.json(
        { error: "accountId, fileName, and contentType are required" },
        { status: 400 }
      );
    }

    // Verify account exists and get name
    const account = await prisma.adAccount.findUnique({
      where: { id: accountId },
      select: { id: true, name: true },
    });

    if (!account) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 }
      );
    }

    // Check for duplicate filename
    const displayName = fileName.replace(/\.[^/.]+$/, "");
    const existingMedia = await prisma.mediaAsset.findFirst({
      where: {
        adAccountId: accountId,
        name: displayName,
      },
    });

    if (existingMedia) {
      return NextResponse.json(
        { error: `File "${displayName}" already exists. Please rename the file or delete the existing one.` },
        { status: 409 }
      );
    }

    // Determine media type
    const isVideo = contentType.startsWith("video/");
    const type = isVideo ? "VIDEO" : "IMAGE";

    // Generate R2 key using account name for readable paths
    const r2Key = generateMediaKey(
      account.name,
      fileName,
      isVideo ? "videos" : "images"
    );

    // Get presigned upload URL
    const uploadUrl = await getPresignedUploadUrl(r2Key, contentType);

    // Return the presigned URL and metadata
    return NextResponse.json({
      uploadUrl,
      r2Key,
      type,
      fileName,
      contentType,
      fileSize,
    });
  } catch (error) {
    console.error("Error generating upload URL:", error);
    return NextResponse.json(
      { error: "Failed to generate upload URL" },
      { status: 500 }
    );
  }
}
