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
}

export interface InstagramAccount {
  id: string;
  username: string;
}

export interface FacebookAdSet {
  id: string;
  name: string;
  status: string;
  campaign: {
    id: string;
    name: string;
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
    `${FACEBOOK_GRAPH_URL}/act_${adAccountId}/promote_pages?fields=id,name,access_token&access_token=${accessToken}`
  );

  if (!response.ok) {
    // Fallback to user's pages
    const userPagesResponse = await fetch(
      `${FACEBOOK_GRAPH_URL}/me/accounts?fields=id,name,access_token&access_token=${accessToken}`
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
    `${FACEBOOK_GRAPH_URL}/${pageId}/instagram_accounts?fields=id,username&access_token=${pageAccessToken}`
  );

  if (!response.ok) {
    // Try the business discovery method
    const bizResponse = await fetch(
      `${FACEBOOK_GRAPH_URL}/${pageId}?fields=instagram_business_account{id,username}&access_token=${pageAccessToken}`
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

  const response = await fetch(
    `${FACEBOOK_GRAPH_URL}/act_${adAccountId}/adsets?fields=id,name,status,campaign{id,name}&limit=500${statusFilter}&access_token=${accessToken}`
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
): Promise<{ video_id: string }> {
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

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Failed to upload video");
  }

  const data = await response.json();
  return { video_id: data.id };
}

export interface CreateAdCreativeParams {
  adAccountId: string;
  name: string;
  pageId: string;
  instagramActorId?: string;
  imageHash?: string;
  videoId?: string;
  message: string;
  headline: string;
  description?: string;
  link: string;
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
    message,
    headline,
    description,
    link,
    callToAction,
    accessToken,
  } = params;

  const objectStorySpec: Record<string, unknown> = {
    page_id: pageId,
  };

  if (instagramActorId) {
    objectStorySpec.instagram_actor_id = instagramActorId;
  }

  const linkData: Record<string, unknown> = {
    message,
    link,
    name: headline,
    call_to_action: {
      type: callToAction,
      value: { link },
    },
  };

  if (description) {
    linkData.description = description;
  }

  if (imageHash) {
    linkData.image_hash = imageHash;
    objectStorySpec.link_data = linkData;
  } else if (videoId) {
    objectStorySpec.video_data = {
      video_id: videoId,
      message,
      link_description: description,
      call_to_action: {
        type: callToAction,
        value: { link },
      },
      title: headline,
    };
  }

  const response = await fetch(
    `${FACEBOOK_GRAPH_URL}/act_${adAccountId}/adcreatives`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        object_story_spec: objectStorySpec,
        access_token: accessToken,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Failed to create ad creative");
  }

  return response.json();
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

  const response = await fetch(`${FACEBOOK_GRAPH_URL}/act_${adAccountId}/ads`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      adset_id: adSetId,
      creative: { creative_id: creativeId },
      status,
      access_token: accessToken,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Failed to create ad");
  }

  return response.json();
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
    scope: "ads_management,ads_read,business_management,pages_read_engagement,instagram_basic",
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
