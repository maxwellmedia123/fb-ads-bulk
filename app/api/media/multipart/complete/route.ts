import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { completeMultipartUpload, abortMultipartUpload, getPresignedUrl } from "@/lib/r2";
import { uploadImage, uploadVideo } from "@/lib/facebook";

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

    // Upload to Facebook in background (don't block the response)
    // Get account for access token
    const account = await prisma.adAccount.findUnique({
      where: { id: accountId },
      select: { fbAccountId: true, accessToken: true },
    });

    if (account) {
      // Fire and forget - upload to Facebook
      (async () => {
        try {
          const presignedUrl = await getPresignedUrl(r2Key, 3600);

          if (type === "VIDEO") {
            console.log(`[FB Upload] Starting video upload to Facebook: ${name}`);
            const result = await uploadVideo(account.fbAccountId, presignedUrl, account.accessToken);
            await prisma.mediaAsset.update({
              where: { id: mediaAsset.id },
              data: { fbVideoId: result.video_id },
            });
            console.log(`[FB Upload] Video uploaded: ${result.video_id}`);
          } else {
            console.log(`[FB Upload] Starting image upload to Facebook: ${name}`);
            const result = await uploadImage(account.fbAccountId, presignedUrl, account.accessToken);
            await prisma.mediaAsset.update({
              where: { id: mediaAsset.id },
              data: { fbImageHash: result.hash },
            });
            console.log(`[FB Upload] Image uploaded: ${result.hash}`);
          }
        } catch (err) {
          console.error(`[FB Upload] Error uploading to Facebook:`, err);
          // Don't fail the request - FB upload can be retried at launch time
        }
      })();
    }

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
