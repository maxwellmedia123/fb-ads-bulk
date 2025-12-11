import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import {
  uploadImage,
  uploadVideo,
  createAdCreative,
  createAd,
} from "@/lib/facebook";

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      accountId,
      adSetIds,
      mediaAssetIds,
      pageId,
      instagramAccountId,
      customName,
      primaryText,
      headline,
      description,
      link,
      displayLink,
      callToAction,
      launchPaused,
    } = body;

    // Validate required fields
    if (!accountId || !adSetIds?.length || !mediaAssetIds?.length || !pageId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!primaryText || !headline || !link) {
      return NextResponse.json(
        { error: "Missing ad copy fields" },
        { status: 400 }
      );
    }

    // Get account
    const account = await prisma.adAccount.findUnique({
      where: { id: accountId },
      include: { facebookPages: true },
    });

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Get media assets
    const mediaAssets = await prisma.mediaAsset.findMany({
      where: { id: { in: mediaAssetIds } },
    });

    if (mediaAssets.length === 0) {
      return NextResponse.json({ error: "No media found" }, { status: 400 });
    }

    // Get page access token
    const page = account.facebookPages.find((p) => p.fbPageId === pageId);
    const pageAccessToken = page?.accessToken || account.accessToken;

    const results: {
      adSetId: string;
      adSetName?: string;
      success: boolean;
      adId?: string;
      error?: string;
    }[] = [];

    // Process each ad set
    for (const adSetId of adSetIds) {
      try {
        // Upload media to Facebook if not already uploaded
        const mediaAsset = mediaAssets[0]; // Use first media for now
        let imageHash: string | undefined;
        let videoId: string | undefined;

        if (mediaAsset.type === "IMAGE") {
          if (mediaAsset.fbImageHash) {
            imageHash = mediaAsset.fbImageHash;
          } else {
            const uploadResult = await uploadImage(
              account.fbAccountId,
              mediaAsset.r2Url,
              account.accessToken
            );
            imageHash = uploadResult.hash;

            // Update media asset with FB hash
            await prisma.mediaAsset.update({
              where: { id: mediaAsset.id },
              data: { fbImageHash: imageHash },
            });
          }
        } else if (mediaAsset.type === "VIDEO") {
          if (mediaAsset.fbVideoId) {
            videoId = mediaAsset.fbVideoId;
          } else {
            const uploadResult = await uploadVideo(
              account.fbAccountId,
              mediaAsset.r2Url,
              account.accessToken
            );
            videoId = uploadResult.video_id;

            // Update media asset with FB video ID
            await prisma.mediaAsset.update({
              where: { id: mediaAsset.id },
              data: { fbVideoId: videoId },
            });
          }
        }

        // Create ad creative
        const creative = await createAdCreative({
          adAccountId: account.fbAccountId,
          name: customName || `Ad Creative ${Date.now()}`,
          pageId,
          instagramActorId: instagramAccountId,
          imageHash,
          videoId,
          message: primaryText,
          headline,
          description,
          link,
          callToAction: callToAction || "LEARN_MORE",
          accessToken: pageAccessToken,
        });

        // Create ad
        const ad = await createAd({
          adAccountId: account.fbAccountId,
          name: customName || `Ad ${Date.now()}`,
          adSetId,
          creativeId: creative.id,
          status: launchPaused ? "PAUSED" : "ACTIVE",
          accessToken: account.accessToken,
        });

        // Save to database
        await prisma.launchedAd.create({
          data: {
            adAccountId: accountId,
            fbAdId: ad.id,
            fbAdSetId: adSetId,
            customName,
            primaryText,
            headline,
            description,
            link,
            displayLink,
            callToAction: callToAction || "LEARN_MORE",
            mediaAssetIds,
            isCarousel: false,
            fbPageId: pageId,
            igAccountId: instagramAccountId,
            status: "LAUNCHED",
            launchPaused: launchPaused || false,
            launchedAt: new Date(),
          },
        });

        results.push({
          adSetId,
          success: true,
          adId: ad.id,
        });
      } catch (error) {
        console.error(`Error creating ad for ad set ${adSetId}:`, error);
        results.push({
          adSetId,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });

        // Save failed attempt
        await prisma.launchedAd.create({
          data: {
            adAccountId: accountId,
            fbAdSetId: adSetId,
            customName,
            primaryText,
            headline,
            description,
            link,
            displayLink,
            callToAction: callToAction || "LEARN_MORE",
            mediaAssetIds,
            isCarousel: false,
            fbPageId: pageId,
            igAccountId: instagramAccountId,
            status: "FAILED",
            launchPaused: launchPaused || false,
            errorMessage: error instanceof Error ? error.message : "Unknown error",
          },
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
        success: successCount,
        failed: failCount,
      },
    });
  } catch (error) {
    console.error("Error launching ads:", error);
    return NextResponse.json(
      { error: "Failed to launch ads" },
      { status: 500 }
    );
  }
}
