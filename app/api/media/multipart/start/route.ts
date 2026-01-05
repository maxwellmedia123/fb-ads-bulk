import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { generateMediaKey, initiateMultipartUpload, getPresignedPartUrl } from "@/lib/r2";

// 10MB chunks (minimum for S3/R2 is 5MB, except last part)
const CHUNK_SIZE = 10 * 1024 * 1024;

// POST - Start a multipart upload
export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { accountId, fileName, contentType, fileSize } = body;

    if (!accountId || !fileName || !contentType || !fileSize) {
      return NextResponse.json(
        { error: "accountId, fileName, contentType, and fileSize are required" },
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

    // Generate R2 key
    const r2Key = generateMediaKey(
      account.name,
      fileName,
      isVideo ? "videos" : "images"
    );

    // Calculate number of parts
    const numParts = Math.ceil(fileSize / CHUNK_SIZE);
    console.log(`[Multipart] Starting upload: ${fileName}, ${fileSize} bytes, ${numParts} parts`);

    // Initiate multipart upload
    const uploadId = await initiateMultipartUpload(r2Key, contentType);
    console.log(`[Multipart] Upload ID: ${uploadId}`);

    // Generate presigned URLs for all parts
    const partUrls: { partNumber: number; url: string }[] = [];
    for (let i = 1; i <= numParts; i++) {
      const url = await getPresignedPartUrl(r2Key, uploadId, i);
      partUrls.push({ partNumber: i, url });
    }

    return NextResponse.json({
      uploadId,
      r2Key,
      type,
      partUrls,
      chunkSize: CHUNK_SIZE,
    });
  } catch (error) {
    console.error("Error starting multipart upload:", error);
    return NextResponse.json(
      { error: "Failed to start multipart upload" },
      { status: 500 }
    );
  }
}
