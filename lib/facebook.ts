// Facebook Marketing API client
// Note: In production, you'd use facebook-nodejs-business-sdk
// For simplicity, we're using direct API calls with fetch

const FACEBOOK_API_VERSION = "v21.0";
const FACEBOOK_GRAPH_URL = `https://graph.facebook.com/${FACEBOOK_API_VERSION}`;

export interface FacebookAdAccount {
  id: string;
  account_id: string;
  name: string;
  business?: {
    id: string;
    name: string;
  };
}

export interface FacebookPage {
  id: string;
  name: string;
  access_token?: string;
  picture?: {
    data: {
      url: string;
    };
  };
}

export interface InstagramAccount {
  id: string;
  username: string;
  profile_picture_url?: string;
}

export interface FacebookAdSet {
  id: string;
  name: string;
  status: string;
  campaign: {
    id: string;
    name: string;
  };
  created_time?: string;
  insights?: {
    data: Array<{
      spend: string;
    }>;
  };
}

export interface FacebookCampaign {
  id: string;
  name: string;
  status: string;
  objective: string;
}

/**
 * Exchange short-lived token for long-lived token
 */
export async function exchangeForLongLivedToken(
  shortLivedToken: string
): Promise<{ access_token: string; expires_in: number }> {
  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: process.env.FACEBOOK_APP_ID!,
    client_secret: process.env.FACEBOOK_APP_SECRET!,
    fb_exchange_token: shortLivedToken,
  });

  const response = await fetch(
    `${FACEBOOK_GRAPH_URL}/oauth/access_token?${params}`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Failed to exchange token");
  }

  return response.json();
}

/**
 * Fetch ad accounts accessible by the user
 */
export async function fetchAdAccounts(
  accessToken: string
): Promise<FacebookAdAccount[]> {
  const response = await fetch(
    `${FACEBOOK_GRAPH_URL}/me/adaccounts?fields=id,account_id,name,business{id,name}&access_token=${accessToken}`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Failed to fetch ad accounts");
  }

  const data = await response.json();
  return data.data || [];
}

/**
 * Fetch pages owned by the user or their business
 */
export async function fetchPages(
  accessToken: string,
  adAccountId: string
): Promise<FacebookPage[]> {
  // First get pages for the ad account
  const response = await fetch(
    `${FACEBOOK_GRAPH_URL}/act_${adAccountId}/promote_pages?fields=id,name,access_token,picture{url}&access_token=${accessToken}`
  );

  if (!response.ok) {
    // Fallback to user's pages
    const userPagesResponse = await fetch(
      `${FACEBOOK_GRAPH_URL}/me/accounts?fields=id,name,access_token,picture{url}&access_token=${accessToken}`
    );

    if (!userPagesResponse.ok) {
      const error = await userPagesResponse.json();
      throw new Error(error.error?.message || "Failed to fetch pages");
    }

    const data = await userPagesResponse.json();
    return data.data || [];
  }

  const data = await response.json();
  return data.data || [];
}

/**
 * Fetch Instagram accounts linked to a page
 */
export async function fetchInstagramAccounts(
  pageId: string,
  pageAccessToken: string
): Promise<InstagramAccount[]> {
  const response = await fetch(
    `${FACEBOOK_GRAPH_URL}/${pageId}/instagram_accounts?fields=id,username,profile_picture_url&access_token=${pageAccessToken}`
  );

  if (!response.ok) {
    // Try the business discovery method
    const bizResponse = await fetch(
      `${FACEBOOK_GRAPH_URL}/${pageId}?fields=instagram_business_account{id,username,profile_picture_url}&access_token=${pageAccessToken}`
    );

    if (!bizResponse.ok) {
      return [];
    }

    const bizData = await bizResponse.json();
    if (bizData.instagram_business_account) {
      return [bizData.instagram_business_account];
    }
    return [];
  }

  const data = await response.json();
  return data.data || [];
}

/**
 * Fetch ad sets for an ad account
 */
export async function fetchAdSets(
  adAccountId: string,
  accessToken: string,
  status?: string[]
): Promise<FacebookAdSet[]> {
  const statusFilter = status?.length
    ? `&filtering=[{"field":"effective_status","operator":"IN","value":${JSON.stringify(status)}}]`
    : "";

  // Get date range for last 7 days
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);
  const dateRange = `{'since':'${startDate.toISOString().split('T')[0]}','until':'${endDate.toISOString().split('T')[0]}'}`;

  const response = await fetch(
    `${FACEBOOK_GRAPH_URL}/act_${adAccountId}/adsets?fields=id,name,status,created_time,campaign{id,name},insights.date_preset(last_7d){spend}&limit=500${statusFilter}&access_token=${accessToken}`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Failed to fetch ad sets");
  }

  const data = await response.json();
  return data.data || [];
}

/**
 * Fetch campaigns for an ad account
 */
export async function fetchCampaigns(
  adAccountId: string,
  accessToken: string
): Promise<FacebookCampaign[]> {
  const response = await fetch(
    `${FACEBOOK_GRAPH_URL}/act_${adAccountId}/campaigns?fields=id,name,status,objective&limit=500&access_token=${accessToken}`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Failed to fetch campaigns");
  }

  const data = await response.json();
  return data.data || [];
}

/**
 * Upload an image to the ad account
 */
export async function uploadImage(
  adAccountId: string,
  imageUrl: string,
  accessToken: string
): Promise<{ hash: string; url: string }> {
  const response = await fetch(
    `${FACEBOOK_GRAPH_URL}/act_${adAccountId}/adimages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: imageUrl,
        access_token: accessToken,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Failed to upload image");
  }

  const data = await response.json();
  const imageData = Object.values(data.images)[0] as {
    hash: string;
    url: string;
  };
  return imageData;
}

/**
 * Upload a video to the ad account
 */
export async function uploadVideo(
  adAccountId: string,
  videoUrl: string,
  accessToken: string
): Promise<{ video_id: string; thumbnail_url?: string }> {
  console.log(`[FB Video] Uploading video from URL: ${videoUrl.substring(0, 100)}...`);

  const response = await fetch(
    `${FACEBOOK_GRAPH_URL}/act_${adAccountId}/advideos`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        file_url: videoUrl,
        access_token: accessToken,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error(`[FB Video] Error:`, JSON.stringify(data, null, 2));
    throw new Error(data.error?.message || "Failed to upload video");
  }

  console.log(`[FB Video] Success - video_id: ${data.id}`);

  // Poll for video thumbnail (video needs time to process)
  let thumbnailUrl: string | undefined;
  const maxAttempts = 10;
  const delayMs = 3000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`[FB Video] Waiting for thumbnail (attempt ${attempt}/${maxAttempts})...`);
    await new Promise((resolve) => setTimeout(resolve, delayMs));

    try {
      // Try to get video thumbnail/picture
      const videoDetailsRes = await fetch(
        `${FACEBOOK_GRAPH_URL}/${data.id}?fields=thumbnails,picture&access_token=${accessToken}`
      );
      const videoDetails = await videoDetailsRes.json();

      // Check thumbnails first
      if (videoDetails.thumbnails?.data?.[0]?.uri) {
        thumbnailUrl = videoDetails.thumbnails.data[0].uri;
        console.log(`[FB Video] Got thumbnail from thumbnails: ${thumbnailUrl}`);
        break;
      }

      // Fallback to picture field
      if (videoDetails.picture) {
        thumbnailUrl = videoDetails.picture;
        console.log(`[FB Video] Got thumbnail from picture: ${thumbnailUrl}`);
        break;
      }

      console.log(`[FB Video] Thumbnail not ready yet...`);
    } catch (err) {
      console.error(`[FB Video] Error fetching thumbnail:`, err);
    }
  }

  if (!thumbnailUrl) {
    console.log(`[FB Video] Warning: Could not get thumbnail after ${maxAttempts} attempts`);
  }

  return { video_id: data.id, thumbnail_url: thumbnailUrl };
}

/**
 * Get thumbnail URL for an existing video
 */
export async function getVideoThumbnail(
  videoId: string,
  accessToken: string
): Promise<string | undefined> {
  console.log(`[FB Video] Fetching thumbnail for video: ${videoId}`);

  try {
    const response = await fetch(
      `${FACEBOOK_GRAPH_URL}/${videoId}?fields=thumbnails,picture&access_token=${accessToken}`
    );
    const data = await response.json();

    if (data.thumbnails?.data?.[0]?.uri) {
      console.log(`[FB Video] Got thumbnail from thumbnails`);
      return data.thumbnails.data[0].uri;
    }

    if (data.picture) {
      console.log(`[FB Video] Got thumbnail from picture`);
      return data.picture;
    }

    console.log(`[FB Video] No thumbnail found for video`);
    return undefined;
  } catch (err) {
    console.error(`[FB Video] Error fetching thumbnail:`, err);
    return undefined;
  }
}

/**
 * Wait for video to be ready for use in ads
 */
export async function waitForVideoReady(
  videoId: string,
  accessToken: string,
  maxWaitMs: number = 120000
): Promise<boolean> {
  const startTime = Date.now();
  const pollInterval = 5000; // 5 seconds

  console.log(`[FB Video] Waiting for video ${videoId} to be ready...`);

  while (Date.now() - startTime < maxWaitMs) {
    try {
      const response = await fetch(
        `${FACEBOOK_GRAPH_URL}/${videoId}?fields=status&access_token=${accessToken}`
      );
      const data = await response.json();

      console.log(`[FB Video] Status: ${JSON.stringify(data.status)}`);

      // Check if video is ready
      if (data.status?.video_status === "ready") {
        console.log(`[FB Video] Video is ready!`);
        return true;
      }

      // Check for processing states
      if (data.status?.video_status === "processing" ||
          data.status?.processing_phase?.status === "in_progress") {
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        console.log(`[FB Video] Still processing... (${elapsed}s elapsed)`);
      }

      // Check for error states
      if (data.status?.video_status === "error") {
        console.error(`[FB Video] Video processing failed`);
        return false;
      }

    } catch (err) {
      console.error(`[FB Video] Error checking status:`, err);
    }

    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  console.log(`[FB Video] Timeout waiting for video to be ready`);
  return false;
}

export interface CreateAdCreativeParams {
  adAccountId: string;
  name: string;
  pageId: string;
  instagramActorId?: string;
  imageHash?: string;
  videoId?: string;
  videoThumbnailUrl?: string;
  primaryTexts: string[];
  headlines: string[];
  description?: string;
  link: string;
  urlTags?: string;
  callToAction: string;
  accessToken: string;
}

/**
 * Create an ad creative
 */
export async function createAdCreative(
  params: CreateAdCreativeParams
): Promise<{ id: string }> {
  const {
    adAccountId,
    name,
    pageId,
    instagramActorId,
    imageHash,
    videoId,
    videoThumbnailUrl,
    primaryTexts,
    headlines,
    description,
    link,
    urlTags,
    callToAction,
    accessToken,
  } = params;

  const hasMultipleTexts = primaryTexts.length > 1 || headlines.length > 1;

  // Build base object_story_spec (required for both standard and dynamic creatives)
  const message = primaryTexts[0];
  const headline = headlines[0];

  const objectStorySpec: Record<string, unknown> = {
    page_id: pageId,
  };

  if (instagramActorId) {
    console.log(`[FB Creative] Instagram ID being used: ${instagramActorId}`);
    objectStorySpec.instagram_user_id = instagramActorId;
  }

  if (imageHash) {
    objectStorySpec.link_data = {
      message,
      link,
      name: headline,
      description,
      image_hash: imageHash,
      call_to_action: {
        type: callToAction,
        value: { link },
      },
    };
  } else if (videoId) {
    objectStorySpec.video_data = {
      video_id: videoId,
      message,
      title: headline,
      link_description: description,
      image_url: videoThumbnailUrl,
      call_to_action: {
        type: callToAction,
        value: { link },
      },
    };
  }

  const requestBody: Record<string, unknown> = {
    name,
    object_story_spec: objectStorySpec,
    access_token: accessToken,
  };

  // Enable standard enhancements for text optimization
  // Note: Multiple text variations require Dynamic Creative ad sets
  // For standard ad sets, only the first text/headline is used
  if (hasMultipleTexts) {
    console.log(`[FB Creative] Multiple texts provided (${primaryTexts.length} texts, ${headlines.length} headlines)`);
    console.log(`[FB Creative] Using first text/headline only - enable Dynamic Creative on ad set for all variations`);
  }

  requestBody.degrees_of_freedom_spec = {
    creative_features_spec: {
      standard_enhancements: { enroll_status: "OPT_IN" },
    },
  };

  if (urlTags) {
    requestBody.url_tags = urlTags;
  }

  console.log(`[FB Creative] Request URL: ${FACEBOOK_GRAPH_URL}/act_${adAccountId}/adcreatives`);
  console.log(`[FB Creative] Request body:`, JSON.stringify(requestBody, null, 2));

  const response = await fetch(
    `${FACEBOOK_GRAPH_URL}/act_${adAccountId}/adcreatives`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    }
  );

  const responseData = await response.json();

  if (!response.ok) {
    console.error(`[FB Creative] Error response:`, JSON.stringify(responseData, null, 2));
    throw new Error(responseData.error?.message || "Failed to create ad creative");
  }

  console.log(`[FB Creative] Success:`, responseData);
  return responseData;
}

export interface CreateAdParams {
  adAccountId: string;
  name: string;
  adSetId: string;
  creativeId: string;
  status: "ACTIVE" | "PAUSED";
  accessToken: string;
}

/**
 * Create an ad
 */
export async function createAd(params: CreateAdParams): Promise<{ id: string }> {
  const { adAccountId, name, adSetId, creativeId, status, accessToken } = params;

  const requestBody = {
    name,
    adset_id: adSetId,
    creative: { creative_id: creativeId },
    status,
    access_token: accessToken,
  };

  console.log(`[FB Ad] Creating ad with body:`, JSON.stringify(requestBody, null, 2));

  const response = await fetch(`${FACEBOOK_GRAPH_URL}/act_${adAccountId}/ads`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error(`[FB Ad] Error response:`, JSON.stringify(data, null, 2));
    throw new Error(data.error?.message || "Failed to create ad");
  }

  console.log(`[FB Ad] Success:`, data);
  return data;
}

/**
 * Fetch existing ads for an ad account
 */
export async function fetchAds(
  adAccountId: string,
  accessToken: string,
  limit = 100
): Promise<unknown[]> {
  const response = await fetch(
    `${FACEBOOK_GRAPH_URL}/act_${adAccountId}/ads?fields=id,name,status,creative{id,name,image_url,thumbnail_url,object_story_spec},adset{id,name},campaign{id,name}&limit=${limit}&access_token=${accessToken}`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Failed to fetch ads");
  }

  const data = await response.json();
  return data.data || [];
}

/**
 * Get Facebook OAuth URL for user authorization
 */
export function getFacebookOAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.FACEBOOK_APP_ID!,
    redirect_uri: redirectUri,
    state,
    scope: "ads_management,ads_read,business_management,pages_read_engagement,pages_show_list",
    response_type: "code",
  });

  return `https://www.facebook.com/${FACEBOOK_API_VERSION}/dialog/oauth?${params}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(
  code: string,
  redirectUri: string
): Promise<{ access_token: string; expires_in: number }> {
  const params = new URLSearchParams({
    client_id: process.env.FACEBOOK_APP_ID!,
    client_secret: process.env.FACEBOOK_APP_SECRET!,
    redirect_uri: redirectUri,
    code,
  });

  const response = await fetch(
    `${FACEBOOK_GRAPH_URL}/oauth/access_token?${params}`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Failed to exchange code for token");
  }

  return response.json();
}
