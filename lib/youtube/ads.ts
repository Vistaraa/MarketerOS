import type { YouTubeAdsConnectInput, YouTubeChannelPerformance } from "./ads-types";

// The YouTube Data API (API key + channel ID) only exposes organic channel and video statistics. Ad metrics
// (impressions, views, clicks, spend) come from the Google Ads API: see google-ads-video.ts.

export async function validateYouTubeAdsCredentials(input: YouTubeAdsConnectInput): Promise<{ valid: boolean; error?: string }> {
  try {
    const res = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${input.channelId}&key=${input.apiKey}`);
    if (!res.ok) return { valid: false, error: "Invalid API Key or Channel ID" };
    const data = await res.json();
    if (!data.items?.length) return { valid: false, error: "Channel not found" };
    return { valid: true };
  } catch (e) { return { valid: false, error: "Network error" }; }
}

/** Real organic channel totals and the latest uploads' statistics. */
export async function fetchYouTubeAdsDashboard(apiKey: string, channelId: string): Promise<YouTubeChannelPerformance> {
  const channelsRes = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&id=${channelId}&key=${apiKey}`);
  if (!channelsRes.ok) throw new Error("Failed to fetch channel");
  const channelsData = await channelsRes.json();
  const channel = channelsData.items?.[0];
  if (!channel) throw new Error("Channel not found");

  const stats = channel.statistics || {};
  const toCount = (value: unknown) => (value == null ? null : Number(value));

  let recentVideos: YouTubeChannelPerformance["recentVideos"] = [];
  const uploadsPlaylistId = channel.contentDetails?.relatedPlaylists?.uploads;
  if (uploadsPlaylistId) {
    const videosRes = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${uploadsPlaylistId}&maxResults=10&key=${apiKey}`);
    if (videosRes.ok) {
      const videosData = await videosRes.json();
      const videoIds = videosData.items?.map((item: any) => item.contentDetails?.videoId).filter(Boolean) || [];
      if (videoIds.length) {
        const statsRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoIds.join(",")}&key=${apiKey}`);
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          recentVideos = (statsData.items || []).map((video: any) => ({
            id: video.id,
            title: video.snippet?.title || "Untitled",
            thumbnailUrl: video.snippet?.thumbnails?.default?.url || "",
            publishedAt: video.snippet?.publishedAt || null,
            views: toCount(video.statistics?.viewCount),
            likes: toCount(video.statistics?.likeCount),
            comments: toCount(video.statistics?.commentCount)
          }));
        }
      }
    }
  }

  return {
    channelTitle: channel.snippet?.title || "YouTube channel",
    totalViews: toCount(stats.viewCount),
    // YouTube hides subscriber counts for some channels.
    subscribers: stats.hiddenSubscriberCount ? null : toCount(stats.subscriberCount),
    videoCount: toCount(stats.videoCount),
    recentVideos,
    adMetricsAvailable: false
  };
}
