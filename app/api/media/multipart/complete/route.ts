import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { completeMultipartUpload, abortMultipartUpload } from "@/lib/r2";

const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

// POST - Complete a multipart upload
export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { accountId, r2Key, uploadId, parts, name, type, contentType, fileSize } = body;

    if (!accountId || !r2Key || !uploadId || !parts || !name || !type) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    console.log(`[Multipart] Completing upload: ${r2Key}, ${parts.length} parts`);

    // Complete the multipart upload in R2
    await completeMultipartUpload(r2Key, uploadId, parts);
    console.log(`[Multipart] Upload completed in R2`);

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

    console.log(`[Multipart] Saved to database: ${mediaAsset.id}`);

    return NextResponse.json({ media: mediaAsset });
  } catch (error) {
    console.error("Error completing multipart upload:", error);
    return NextResponse.json(
      { error: "Failed to complete multipart upload" },
      { status: 500 }
    );
  }
}

// DELETE - Abort a multipart upload (cleanup on failure)
export async function DELETE(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { r2Key, uploadId } = body;

    if (!r2Key || !uploadId) {
      return NextResponse.json(
        { error: "r2Key and uploadId are required" },
        { status: 400 }
      );
    }

    await abortMultipartUpload(r2Key, uploadId);
    console.log(`[Multipart] Aborted upload: ${uploadId}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error aborting multipart upload:", error);
    return NextResponse.json(
      { error: "Failed to abort multipart upload" },
      { status: 500 }
    );
  }
}
