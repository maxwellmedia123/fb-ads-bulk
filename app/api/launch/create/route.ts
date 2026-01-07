import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import {
  uploadImage,
  uploadVideo,
  getVideoThumbnail,
  waitForVideoReady,
  createAdCreative,
  createAd,
  getAdSetDetails,
  createDynamicCreativeAdSet,
} from "@/lib/facebook";
import { getPresignedUrl } from "@/lib/r2";

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
      primaryTexts,
      headlines,
      description,
      link,
      displayLink,
      urlTags,
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

    if (!primaryTexts?.length || !headlines?.length || !link) {
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
      originalAdSetId?: string;  // The ad set user selected (when DC ad set was created)
      createdDcAdSetId?: string | null;  // The DC ad set we created (if any)
      adSetName?: string;
      success: boolean;
      adId?: string;
      error?: string;
      hasMultipleTexts?: boolean;
    }[] = [];

    // Process each ad set
    for (const adSetId of adSetIds) {
      try {
        // Upload media to Facebook if not already uploaded
        const mediaAsset = mediaAssets[0]; // Use first media for now
        let imageHash: string | undefined;
        let videoId: string | undefined;
        let videoThumbnailUrl: string | undefined;

        if (mediaAsset.type === "IMAGE") {
          if (mediaAsset.fbImageHash) {
            imageHash = mediaAsset.fbImageHash;
          } else {
            // Generate a fresh presigned URL for Facebook to fetch
            const presignedImageUrl = await getPresignedUrl(mediaAsset.r2Key, 3600);

            const uploadResult = await uploadImage(
              account.fbAccountId,
              presignedImageUrl,
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
            console.log(`[Launch] Using cached video ID: ${videoId}`);

            // Fetch thumbnail for cached video
            videoThumbnailUrl = await getVideoThumbnail(videoId, account.accessToken);
          } else {
            // Generate a fresh presigned URL for Facebook to fetch
            const presignedVideoUrl = await getPresignedUrl(mediaAsset.r2Key, 3600);

            const uploadResult = await uploadVideo(
              account.fbAccountId,
              presignedVideoUrl,
              account.accessToken
            );
            videoId = uploadResult.video_id;
            videoThumbnailUrl = uploadResult.thumbnail_url;

            // Update media asset with FB video ID
            await prisma.mediaAsset.update({
              where: { id: mediaAsset.id },
              data: { fbVideoId: videoId },
            });
          }

          // Wait for video to be ready before creating ad
          const isReady = await waitForVideoReady(videoId, account.accessToken, 120000);
          if (!isReady) {
            throw new Error("Video is still processing. Please try again in a few minutes.");
          }
        }

        // Create ad creative
        // Only pass Instagram ID if it's a valid non-empty string
        const validInstagramId = instagramAccountId && instagramAccountId.trim() !== ""
          ? instagramAccountId
          : undefined;

        console.log(`[Launch] Creating creative with pageId: ${pageId}, instagramActorId: ${validInstagramId || 'none'}`);

        // Use media filename as ad name if no custom name provided
        const adName = customName || mediaAsset.name;

        // Handle multiple text variations by creating a Dynamic Creative ad set
        const hasMultipleTexts = primaryTexts.length > 1 || headlines.length > 1;
        let targetAdSetId = adSetId;
        let createdDcAdSetId: string | null = null;

        if (hasMultipleTexts) {
          // For multiple text variations, we need to create a new Dynamic Creative ad set
          // because DC ad sets only allow 1 ad each, and we can't add DC ads to regular ad sets
          console.log(`[Launch] Multiple texts detected (${primaryTexts.length} texts, ${headlines.length} headlines) - creating DC ad set`);

          // Get the original ad set's details to copy settings
          const originalAdSetDetails = await getAdSetDetails(adSetId, account.accessToken);
          console.log(`[Launch] Original ad set campaign: ${originalAdSetDetails.campaign_id}`);

          // Create a new Dynamic Creative ad set in the same campaign
          const dcAdSet = await createDynamicCreativeAdSet({
            adAccountId: account.fbAccountId,
            name: `${adName} - DC`,
            campaignId: originalAdSetDetails.campaign_id,
            targetingFromAdSet: originalAdSetDetails,
            status: launchPaused ? "PAUSED" : "ACTIVE",
            accessToken: account.accessToken,
          });

          targetAdSetId = dcAdSet.id;
          createdDcAdSetId = dcAdSet.id;
          console.log(`[Launch] Created DC ad set: ${targetAdSetId}`);
        }

        // Create the creative
        // useDynamicCreative is true when we have multiple texts (we'll use asset_feed_spec)
        const creative = await createAdCreative({
          adAccountId: account.fbAccountId,
          name: `${adName} - Creative`,
          pageId,
          instagramActorId: validInstagramId,
          imageHash,
          videoId,
          videoThumbnailUrl,
          primaryTexts,
          headlines,
          description,
          link,
          urlTags,
          callToAction: callToAction || "LEARN_MORE",
          accessToken: pageAccessToken,
          useDynamicCreative: hasMultipleTexts,
        });

        // Create ad in the target ad set (either original or the new DC ad set)
        const ad = await createAd({
          adAccountId: account.fbAccountId,
          name: adName,
          adSetId: targetAdSetId,
          creativeId: creative.id,
          status: launchPaused ? "PAUSED" : "ACTIVE",
          accessToken: account.accessToken,
        });

        // Save to database
        await prisma.launchedAd.create({
          data: {
            adAccountId: accountId,
            fbAdId: ad.id,
            fbAdSetId: targetAdSetId,  // Use the actual ad set (could be the new DC ad set)
            fbAdSetName: createdDcAdSetId ? `${adName} - DC` : undefined,
            customName,
            primaryText: primaryTexts[0],
            headline: headlines[0],
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
          adSetId: targetAdSetId,
          originalAdSetId: adSetId,  // The ad set user selected
          createdDcAdSetId,  // The DC ad set we created (if any)
          success: true,
          adId: ad.id,
          hasMultipleTexts,
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
            primaryText: primaryTexts[0],
            headline: headlines[0],
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
