import type { YouTubeChannelInfo, YouTubeVideo } from "./types";

const YOUTUBE_DATA_API = "https://www.googleapis.com/youtube/v3";

function fetchWithTimeout(url: string, timeoutMs = 10000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer));
}

export async function validateYouTubeApiKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const url = `${YOUTUBE_DATA_API}/channels?part=snippet,statistics&id=UCdummy&key=${encodeURIComponent(apiKey)}`;
    const res = await fetchWithTimeout(url);
    const data = await res.json() as Record<string, unknown>;
    if (data.error) {
      const err = data.error as Record<string, unknown>;
      const msg = String(err.message || "");
      if (msg.includes("API key not valid")) return { valid: false, error: "Invalid YouTube API Key. Get a valid key from Google Cloud Console → APIs & Services → Credentials." };
      if (msg.includes("API Key expired")) return { valid: false, error: "YouTube API Key has expired. Generate a new key in Google Cloud Console." };
      return { valid: false, error: msg };
    }
    return { valid: true };
  } catch (err) {
    return { valid: false, error: `YouTube API validation failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}

export async function validateYouTubeChannel(channelId: string, apiKey: string): Promise<{ valid: boolean; channel?: YouTubeChannelInfo; error?: string }> {
  try {
    const url = `${YOUTUBE_DATA_API}/channels?part=snippet,statistics,contentDetails,brandingSettings&id=${encodeURIComponent(channelId)}&key=${encodeURIComponent(apiKey)}`;
    const res = await fetchWithTimeout(url);
    const data = await res.json() as Record<string, unknown>;
    if (data.error) {
      const err = data.error as Record<string, unknown>;
      return { valid: false, error: String(err.message || "Channel not found") };
    }
    const items = data.items as Array<Record<string, unknown>> | undefined;
    if (!items || items.length === 0) return { valid: false, error: "Channel not found. Make sure the Channel ID is correct (starts with UC...)." };
    const item = items[0];
    const snippet = item.snippet as Record<string, unknown>;
    const statistics = item.statistics as Record<string, unknown>;
    const contentDetails = item.contentDetails as Record<string, unknown>;
    const channel: YouTubeChannelInfo = {
      id: String(item.id),
      title: String(snippet.title || ""),
      description: String(snippet.description || ""),
      customUrl: String(snippet.customUrl || ""),
      publishedAt: String(snippet.publishedAt || ""),
      thumbnailUrl: String(((snippet.thumbnails as Record<string, unknown>)?.high as Record<string, unknown>)?.url || ""),
      country: String(snippet.country || ""),
      defaultLanguage: String(snippet.defaultLanguage || ""),
      subscriberCount: Number(statistics.subscriberCount || 0),
      viewCount: Number(statistics.viewCount || 0),
      videoCount: Number(statistics.videoCount || 0),
      uploadsPlaylistId: String(((contentDetails.relatedPlaylists as Record<string, unknown>)?.uploads as string) || ""),
      hiddenSubscriberCount: Boolean(statistics.hiddenSubscriberCount)
    };
    return { valid: true, channel };
  } catch (err) {
    return { valid: false, error: `Channel validation failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}

export async function fetchChannelInfo(channelId: string, apiKey: string): Promise<YouTubeChannelInfo> {
  const result = await validateYouTubeChannel(channelId, apiKey);
  if (!result.valid || !result.channel) throw new Error(result.error || "Failed to fetch channel");
  return result.channel;
}

export async function fetchRecentVideos(channelId: string, apiKey: string, maxResults = 10): Promise<YouTubeVideo[]> {
  const searchUrl = `${YOUTUBE_DATA_API}/search?channelId=${encodeURIComponent(channelId)}&order=date&part=snippet&type=video&maxResults=${maxResults}&key=${encodeURIComponent(apiKey)}`;
  const searchRes = await fetchWithTimeout(searchUrl);
  const searchData = await searchRes.json() as Record<string, unknown>;
  if (searchData.error) throw new Error(String((searchData.error as Record<string, unknown>).message || "Search failed"));
  const searchItems = (searchData.items || []) as Array<Record<string, unknown>>;
  const videoIds = searchItems.map((si) => String((si.id as Record<string, unknown>)?.videoId || "")).filter(Boolean);
  if (videoIds.length === 0) return [];
  const videosUrl = `${YOUTUBE_DATA_API}/videos?part=statistics,contentDetails,snippet&id=${videoIds.join(",")}&key=${encodeURIComponent(apiKey)}`;
  const videosRes = await fetchWithTimeout(videosUrl);
  const videosData = await videosRes.json() as Record<string, unknown>;
  if (videosData.error) throw new Error(String((videosData.error as Record<string, unknown>).message || "Video fetch failed"));
  const videoItems = (videosData.items || []) as Array<Record<string, unknown>>;
  return videoItems.map((vi) => {
    const snip = vi.snippet as Record<string, unknown>;
    const stats = vi.statistics as Record<string, unknown>;
    const thumbs = snip.thumbnails as Record<string, unknown>;
    const high = (thumbs?.high || thumbs?.medium || thumbs?.default) as Record<string, unknown>;
    return {
      id: String(vi.id),
      title: String(snip.title || ""),
      description: String(snip.description || ""),
      thumbnailUrl: String(high?.url || ""),
      publishedAt: String(snip.publishedAt || ""),
      duration: String(((vi.contentDetails as Record<string, unknown>)?.duration as string) || ""),
      viewCount: Number(stats.viewCount || 0),
      likeCount: Number(stats.likeCount || 0),
      commentCount: Number(stats.commentCount || 0),
      tags: (snip.tags as string[]) || []
    };
  });
}

export async function fetchPlaylists(channelId: string, apiKey: string): Promise<{ id: string; title: string; itemCount: number }[]> {
  const url = `${YOUTUBE_DATA_API}/playlists?part=snippet,contentDetails&channelId=${encodeURIComponent(channelId)}&maxResults=25&key=${encodeURIComponent(apiKey)}`;
  const res = await fetchWithTimeout(url);
  const data = await res.json() as Record<string, unknown>;
  if (data.error) throw new Error(String((data.error as Record<string, unknown>).message || "Playlist fetch failed"));
  const items = (data.items || []) as Array<Record<string, unknown>>;
  return items.map((pl) => ({
    id: String(pl.id),
    title: String(((pl.snippet as Record<string, unknown>)?.title as string) || ""),
    itemCount: Number(((pl.contentDetails as Record<string, unknown>)?.itemCount as number) || 0)
  }));
}
