import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { getPresignedUrl } from "@/lib/r2";
import { uploadImage, uploadVideo } from "@/lib/facebook";

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

    // Verify account exists and get FB credentials
    const account = await prisma.adAccount.findUnique({
      where: { id: accountId },
      select: { id: true, fbAccountId: true, accessToken: true },
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

    // Upload to Facebook in background (don't block the response)
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
        // Don't fail - FB upload can be retried at launch time
      }
    })();

    return NextResponse.json({ media: mediaAsset });
  } catch (error) {
    console.error("Error completing upload:", error);
    return NextResponse.json(
      { error: "Failed to complete upload" },
      { status: 500 }
    );
  }
}
