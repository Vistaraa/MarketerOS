/**
 * Instagram Content Publishing via the Graph API
 *
 * Provides functions for publishing posts, carousels, fetching insights,
 * profile data, recent media, and deleting published content.
 */

const GRAPH_API_VERSION = "v20.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

// --- Types ---

export interface InstagramPublishPostParams {
  accessToken: string;
  igUserId: string;
  imageUrl: string;
  caption: string;
}

export interface InstagramPublishPostResult {
  success: boolean;
  mediaId: string;
  permalink?: string;
  error?: string;
}

export interface InstagramCarouselItem {
  imageUrl: string;
  caption?: string;
}

export interface InstagramPublishCarouselParams {
  accessToken: string;
  igUserId: string;
  items: InstagramCarouselItem[];
  caption: string;
}

export interface InstagramPublishCarouselResult {
  success: boolean;
  mediaId: string;
  error?: string;
}

export interface InstagramInsightsParams {
  accessToken: string;
  igUserId: string;
  metrics?: string[];
  period?: string;
  since?: string;
  until?: string;
}

export interface InstagramInsightValue {
  value: number;
}

export interface InstagramInsightEntry {
  name: string;
  period: string;
  values: InstagramInsightValue[];
  title: string;
  description: string;
}

export interface InstagramInsightsResult {
  success: boolean;
  data: InstagramInsightEntry[];
  error?: string;
}

export interface InstagramMediaInsightsParams {
  accessToken: string;
  mediaId: string;
}

export interface InstagramMediaInsightEntry {
  name: string;
  values: InstagramInsightValue[];
}

export interface InstagramMediaInsightsResult {
  success: boolean;
  data: InstagramMediaInsightEntry[];
  error?: string;
}

export interface InstagramProfileParams {
  accessToken: string;
  igUserId: string;
}

export interface InstagramProfile {
  username: string;
  name: string;
  biography: string;
  followers_count: number;
  follows_count: number;
  media_count: number;
  profile_picture_url: string;
}

export interface InstagramProfileResult {
  success: boolean;
  profile: InstagramProfile | null;
  error?: string;
}

export interface InstagramRecentMediaParams {
  accessToken: string;
  igUserId: string;
  limit?: number;
}

export interface InstagramMediaItem {
  id: string;
  caption: string;
  media_type: string;
  media_url: string;
  permalink: string;
  thumbnail_url?: string;
  timestamp: string;
  like_count: number;
  comments_count: number;
}

export interface InstagramRecentMediaResult {
  success: boolean;
  media: InstagramMediaItem[];
  error?: string;
}

export interface InstagramDeleteMediaParams {
  accessToken: string;
  mediaId: string;
}

export interface InstagramDeleteMediaResult {
  success: boolean;
  error?: string;
}

// --- Helpers ---

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 30000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

function waitForProcessing(seconds: number = 3): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

function buildUrl(base: string, params: Record<string, string>): string {
  const url = new URL(base);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

// --- API Functions ---

export async function publishInstagramPost(
  params: InstagramPublishPostParams
): Promise<InstagramPublishPostResult> {
  const { accessToken, igUserId, imageUrl, caption } = params;

  try {
    // Step 1: Create media container
    const createUrl = buildUrl(`${GRAPH_API_BASE}/${igUserId}/media`, {
      image_url: imageUrl,
      caption: caption,
      access_token: accessToken,
    });

    const createResponse = await fetchWithTimeout(createUrl, {
      method: "POST",
    });
    const createData = await createResponse.json();

    if (createData.error) {
      return {
        success: false,
        mediaId: "",
        error: createData.error.message || "Failed to create media container",
      };
    }

    const creationId = createData.id as string;

    // Step 2: Wait for processing
    await waitForProcessing(2);

    // Step 3: Publish the container
    const publishUrl = buildUrl(`${GRAPH_API_BASE}/${igUserId}/media_publish`, {
      creation_id: creationId,
      access_token: accessToken,
    });

    const publishResponse = await fetchWithTimeout(publishUrl, {
      method: "POST",
    });
    const publishData = await publishResponse.json();

    if (publishData.error) {
      return {
        success: false,
        mediaId: "",
        error: publishData.error.message || "Failed to publish media",
      };
    }

    return {
      success: true,
      mediaId: publishData.id as string,
    };
  } catch (err: any) {
    const message =
      err?.name === "AbortError"
        ? "Request timed out"
        : err?.message || "Unknown error";
    return { success: false, mediaId: "", error: message };
  }
}

export async function publishInstagramCarousel(
  params: InstagramPublishCarouselParams
): Promise<InstagramPublishCarouselResult> {
  const { accessToken, igUserId, items, caption } = params;

  try {
    // Step 1: Create containers for each image
    const childIds: string[] = [];

    for (const item of items) {
      const url = buildUrl(`${GRAPH_API_BASE}/${igUserId}/media`, {
        image_url: item.imageUrl,
        is_carousel_item: "true",
        access_token: accessToken,
      });

      const response = await fetchWithTimeout(url, { method: "POST" });
      const data = await response.json();

      if (data.error) {
        return {
          success: false,
          mediaId: "",
          error:
            data.error.message || `Failed to create carousel item container`,
        };
      }

      childIds.push(data.id as string);
    }

    // Step 2: Create carousel container
    const carouselUrl = buildUrl(`${GRAPH_API_BASE}/${igUserId}/media`, {
      media_type: "CAROUSEL",
      children: childIds.join(","),
      caption: caption,
      access_token: accessToken,
    });

    const carouselResponse = await fetchWithTimeout(carouselUrl, {
      method: "POST",
    });
    const carouselData = await carouselResponse.json();

    if (carouselData.error) {
      return {
        success: false,
        mediaId: "",
        error: carouselData.error.message || "Failed to create carousel container",
      };
    }

    const carouselId = carouselData.id as string;

    // Step 3: Wait for processing then publish
    await waitForProcessing(3);

    const publishUrl = buildUrl(`${GRAPH_API_BASE}/${igUserId}/media_publish`, {
      creation_id: carouselId,
      access_token: accessToken,
    });

    const publishResponse = await fetchWithTimeout(publishUrl, {
      method: "POST",
    });
    const publishData = await publishResponse.json();

    if (publishData.error) {
      return {
        success: false,
        mediaId: "",
        error: publishData.error.message || "Failed to publish carousel",
      };
    }

    return {
      success: true,
      mediaId: publishData.id as string,
    };
  } catch (err: any) {
    const message =
      err?.name === "AbortError"
        ? "Request timed out"
        : err?.message || "Unknown error";
    return { success: false, mediaId: "", error: message };
  }
}

export async function getInstagramInsights(
  params: InstagramInsightsParams
): Promise<InstagramInsightsResult> {
  const {
    accessToken,
    igUserId,
    metrics = [
      "impressions",
      "reach",
      "follower_count",
      "email_contacts",
      "phone_call_clicks",
      "text_message_clicks",
      "get_directions_clicks",
      "website_clicks",
    ],
    period = "day",
    since,
    until,
  } = params;

  try {
    const queryParams: Record<string, string> = {
      metric: metrics.join(","),
      period: period,
      access_token: accessToken,
    };

    if (since) queryParams.since = since;
    if (until) queryParams.until = until;

    const url = buildUrl(
      `${GRAPH_API_BASE}/${igUserId}/insights`,
      queryParams
    );

    const response = await fetchWithTimeout(url);
    const data = await response.json();

    if (data.error) {
      return {
        success: false,
        data: [],
        error: data.error.message || "Failed to fetch insights",
      };
    }

    return {
      success: true,
      data: data.data as InstagramInsightEntry[],
    };
  } catch (err: any) {
    const message =
      err?.name === "AbortError"
        ? "Request timed out"
        : err?.message || "Unknown error";
    return { success: false, data: [], error: message };
  }
}

export async function getInstagramMediaInsights(
  params: InstagramMediaInsightsParams
): Promise<InstagramMediaInsightsResult> {
  const { accessToken, mediaId } = params;

  try {
    const url = buildUrl(`${GRAPH_API_BASE}/${mediaId}/insights`, {
      metric: "impressions,reach,engagement,saved,shares",
      access_token: accessToken,
    });

    const response = await fetchWithTimeout(url);
    const data = await response.json();

    if (data.error) {
      return {
        success: false,
        data: [],
        error: data.error.message || "Failed to fetch media insights",
      };
    }

    return {
      success: true,
      data: data.data as InstagramMediaInsightEntry[],
    };
  } catch (err: any) {
    const message =
      err?.name === "AbortError"
        ? "Request timed out"
        : err?.message || "Unknown error";
    return { success: false, data: [], error: message };
  }
}

export async function getInstagramProfile(
  params: InstagramProfileParams
): Promise<InstagramProfileResult> {
  const { accessToken, igUserId } = params;

  try {
    const url = buildUrl(`${GRAPH_API_BASE}/${igUserId}`, {
      fields:
        "username,name,biography,followers_count,follows_count,media_count,profile_picture_url",
      access_token: accessToken,
    });

    const response = await fetchWithTimeout(url);
    const data = await response.json();

    if (data.error) {
      return {
        success: false,
        profile: null,
        error: data.error.message || "Failed to fetch profile",
      };
    }

    return {
      success: true,
      profile: data as InstagramProfile,
    };
  } catch (err: any) {
    const message =
      err?.name === "AbortError"
        ? "Request timed out"
        : err?.message || "Unknown error";
    return { success: false, profile: null, error: message };
  }
}

export async function getInstagramRecentMedia(
  params: InstagramRecentMediaParams
): Promise<InstagramRecentMediaResult> {
  const { accessToken, igUserId, limit = 25 } = params;

  try {
    const url = buildUrl(`${GRAPH_API_BASE}/${igUserId}/media`, {
      fields:
        "id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,like_count,comments_count",
      limit: String(limit),
      access_token: accessToken,
    });

    const response = await fetchWithTimeout(url);
    const data = await response.json();

    if (data.error) {
      return {
        success: false,
        media: [],
        error: data.error.message || "Failed to fetch recent media",
      };
    }

    return {
      success: true,
      media: (data.data || []) as InstagramMediaItem[],
    };
  } catch (err: any) {
    const message =
      err?.name === "AbortError"
        ? "Request timed out"
        : err?.message || "Unknown error";
    return { success: false, media: [], error: message };
  }
}

export async function deleteInstagramMedia(
  params: InstagramDeleteMediaParams
): Promise<InstagramDeleteMediaResult> {
  const { accessToken, mediaId } = params;

  try {
    const url = buildUrl(`${GRAPH_API_BASE}/${mediaId}`, {
      access_token: accessToken,
    });

    const response = await fetchWithTimeout(url, { method: "DELETE" });
    const data = await response.json();

    if (data.error) {
      return {
        success: false,
        error: data.error.message || "Failed to delete media",
      };
    }

    return { success: true };
  } catch (err: any) {
    const message =
      err?.name === "AbortError"
        ? "Request timed out"
        : err?.message || "Unknown error";
    return { success: false, error: message };
  }
}
