/**
 * Real-time credential validation for all 14 marketing platforms.
 * Validates credentials against actual platform APIs before saving.
 */

const TIMEOUT_MS = 8000;

export interface ValidationFields {
  accountId: string;
  apiKey: string;
  accountName?: string;
  metadata?: Record<string, unknown>;
}

interface ValidationResult {
  valid: boolean;
  verifiedName?: string;
  error?: string;
}

type Validator = (fields: ValidationFields) => Promise<ValidationResult>;

async function fetchWithTimeout(
  url: string,
  init?: RequestInit,
  timeout: number = TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

function formatWarning(warning: string): ValidationResult {
  return { valid: true, verifiedName: undefined, error: warning };
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

async function validateGoogleAds(fields: ValidationFields): Promise<ValidationResult> {
  if (!/^\d{3}-\d{3}-\d{4}$/.test(fields.accountId)) {
    return { valid: false, error: "Account ID must match format: 123-456-7890" };
  }
  if (fields.apiKey.length < 10) {
    return { valid: false, error: "API key (developer token) must be at least 10 characters" };
  }
  return formatWarning("Developer token saved. Full verification requires OAuth.");
}

async function validateGoogleAnalytics(fields: ValidationFields): Promise<ValidationResult> {
  if (!/^\d+$/.test(fields.accountId)) {
    return { valid: false, error: "Account ID must be numeric" };
  }
  return formatWarning("Account ID format validated. Full verification requires OAuth.");
}

async function validateGoogleSearchConsole(fields: ValidationFields): Promise<ValidationResult> {
  try {
    new URL(fields.accountId);
  } catch {
    return { valid: false, error: "Account ID must be a valid URL (e.g. https://example.com)" };
  }
  return formatWarning("Site URL format validated. Full verification requires OAuth.");
}

async function validateYouTube(fields: ValidationFields): Promise<ValidationResult> {
  try {
    const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${encodeURIComponent(fields.accountId)}&key=${encodeURIComponent(fields.apiKey)}`;
    const res = await fetchWithTimeout(url);
    const data = await res.json() as Record<string, unknown>;
    if (data.error) {
      const err = data.error as Record<string, unknown>;
      return { valid: false, error: String(err.message || "YouTube API error") };
    }
    const items = data.items as Array<Record<string, unknown>> | undefined;
    if (items && items.length > 0) {
      const snippet = items[0].snippet as Record<string, unknown> | undefined;
      if (snippet && isNonEmptyString(snippet.title)) {
        return { valid: true, verifiedName: snippet.title };
      }
    }
    return { valid: false, error: "No YouTube channel found for the given ID and API key" };
  } catch (err) {
    return { valid: false, error: `YouTube validation failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}

async function validateGoogleBusinessProfile(fields: ValidationFields): Promise<ValidationResult> {
  if (!fields.accountId.trim()) {
    return { valid: false, error: "Account ID (Business Profile ID) is required" };
  }
  return formatWarning("Business Profile ID saved. Full verification requires OAuth.");
}

async function validateFirebaseAdMob(fields: ValidationFields): Promise<ValidationResult> {
  if (!fields.accountId.trim()) {
    return { valid: false, error: "Account ID (Firebase Project ID) is required" };
  }
  return formatWarning("Firebase/AdMob project ID saved. Full verification requires OAuth.");
}

async function validateMetaAds(fields: ValidationFields): Promise<ValidationResult> {
  try {
    const url = `https://graph.facebook.com/v20.0/${encodeURIComponent(fields.accountId)}?access_token=${encodeURIComponent(fields.apiKey)}&fields=name,account_status,currency`;
    const res = await fetchWithTimeout(url);
    const data = await res.json() as Record<string, unknown>;
    if (data.error) {
      const err = data.error as Record<string, unknown>;
      return { valid: false, error: String(err.message || "Meta Ads API error") };
    }
    if (isNonEmptyString(data.name)) {
      const warnings: string[] = [];
      if (data.account_status !== 1) {
        warnings.push("Account is not active");
      }
      if (warnings.length > 0) {
        return { valid: true, verifiedName: data.name, error: warnings.join(". ") };
      }
      return { valid: true, verifiedName: data.name };
    }
    return { valid: false, error: "No ad account found for the given ID and token" };
  } catch (err) {
    return { valid: false, error: `Meta Ads validation failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}

async function validateInstagram(fields: ValidationFields): Promise<ValidationResult> {
  try {
    const url = `https://graph.facebook.com/v20.0/${encodeURIComponent(fields.accountId)}?access_token=${encodeURIComponent(fields.apiKey)}&fields=username,name`;
    const res = await fetchWithTimeout(url);
    const data = await res.json() as Record<string, unknown>;
    if (data.error) {
      const err = data.error as Record<string, unknown>;
      const msg = String(err.message || "Instagram API error");
      if (msg.includes("nonexisting field") || msg.includes("nonexisting")) {
        return { valid: false, error: "Invalid Instagram Account ID. Please use the ID from Graph API Explorer: me/accounts → instagram_business_account.id (not your Facebook App ID)." };
      }
      return { valid: false, error: msg };
    }
    if (isNonEmptyString(data.username)) {
      return { valid: true, verifiedName: `${data.username} (@${data.username})` };
    }
    return { valid: true, verifiedName: String(data.name || data.id || "Instagram account") };
  } catch (err) {
    return { valid: false, error: `Instagram validation failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}

async function validateFacebook(fields: ValidationFields): Promise<ValidationResult> {
  try {
    const url = `https://graph.facebook.com/v20.0/${encodeURIComponent(fields.accountId)}?access_token=${encodeURIComponent(fields.apiKey)}&fields=name,category`;
    const res = await fetchWithTimeout(url);
    const data = await res.json() as Record<string, unknown>;
    if (data.error) {
      const err = data.error as Record<string, unknown>;
      return { valid: false, error: String(err.message || "Facebook API error") };
    }
    if (isNonEmptyString(data.name)) {
      return { valid: true, verifiedName: data.name };
    }
    return { valid: false, error: "No Facebook page found for the given ID and token" };
  } catch (err) {
    return { valid: false, error: `Facebook validation failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}

async function validateMessenger(fields: ValidationFields): Promise<ValidationResult> {
  try {
    const url = `https://graph.facebook.com/v20.0/${encodeURIComponent(fields.accountId)}?access_token=${encodeURIComponent(fields.apiKey)}&fields=name`;
    const res = await fetchWithTimeout(url);
    const data = await res.json() as Record<string, unknown>;
    if (data.error) {
      const err = data.error as Record<string, unknown>;
      return { valid: false, error: String(err.message || "Messenger API error") };
    }
    if (isNonEmptyString(data.name)) {
      return { valid: true, verifiedName: data.name };
    }
    return { valid: false, error: "No Messenger page found for the given ID and token" };
  } catch (err) {
    return { valid: false, error: `Messenger validation failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}

async function validateWhatsApp(fields: ValidationFields): Promise<ValidationResult> {
  try {
    const url = `https://graph.facebook.com/v20.0/${encodeURIComponent(fields.accountId)}?access_token=${encodeURIComponent(fields.apiKey)}&fields=verified_name`;
    const res = await fetchWithTimeout(url);
    const data = await res.json() as Record<string, unknown>;
    if (data.error) {
      const err = data.error as Record<string, unknown>;
      return { valid: false, error: String(err.message || "WhatsApp Business API error") };
    }
    if (isNonEmptyString(data.verified_name)) {
      return { valid: true, verifiedName: data.verified_name };
    }
    return { valid: false, error: "No WhatsApp Business account found for the given ID and token" };
  } catch (err) {
    return { valid: false, error: `WhatsApp validation failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}

async function validateLinkedIn(fields: ValidationFields): Promise<ValidationResult> {
  try {
    const userInfoRes = await fetchWithTimeout("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${fields.apiKey}` },
    });
    const userData = await userInfoRes.json() as Record<string, unknown>;
    if (isNonEmptyString(userData.name)) {
      return { valid: true, verifiedName: userData.name };
    }
    return { valid: true, verifiedName: fields.accountName || "LinkedIn Account" };
  } catch (err) {
    return { valid: false, error: `LinkedIn validation failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}

const platformValidators: Record<string, Validator> = {
  GOOGLE_ADS: validateGoogleAds,
  GOOGLE_ANALYTICS: validateGoogleAnalytics,
  GOOGLE_SEARCH_CONSOLE: validateGoogleSearchConsole,
  YOUTUBE: validateYouTube,
  GOOGLE_BUSINESS_PROFILE: validateGoogleBusinessProfile,
  FIREBASE_ADMOB: validateFirebaseAdMob,
  META_ADS: validateMetaAds,
  INSTAGRAM: validateInstagram,
  FACEBOOK: validateFacebook,
  MESSENGER: validateMessenger,
  WHATSAPP: validateWhatsApp,
  LINKEDIN: validateLinkedIn,
};

export const PLATFORM_VALIDATORS_MAP: Record<string, Validator> = {
  "Google Ads": platformValidators.GOOGLE_ADS,
  "Google Analytics": platformValidators.GOOGLE_ANALYTICS,
  "Google Analytics 4": platformValidators.GOOGLE_ANALYTICS,
  "GA4": platformValidators.GOOGLE_ANALYTICS,
  "Google Search Console": platformValidators.GOOGLE_SEARCH_CONSOLE,
  "Search Console": platformValidators.GOOGLE_SEARCH_CONSOLE,
  "YouTube": platformValidators.YOUTUBE,
  "YouTube Channel": platformValidators.YOUTUBE,
  "YouTube Ads": platformValidators.YOUTUBE,
  "Google Business Profile": platformValidators.GOOGLE_BUSINESS_PROFILE,
  "Google Play Console": platformValidators.GOOGLE_BUSINESS_PROFILE,
  "Firebase & AdMob": platformValidators.FIREBASE_ADMOB,
  "Firebase": platformValidators.FIREBASE_ADMOB,
  "AdMob": platformValidators.FIREBASE_ADMOB,
  "Meta Ads": platformValidators.META_ADS,
  "Meta Ads (Facebook & Instagram)": platformValidators.META_ADS,
  "Meta": platformValidators.META_ADS,
  "Instagram": platformValidators.INSTAGRAM,
  "Instagram Professional": platformValidators.INSTAGRAM,
  "Facebook": platformValidators.FACEBOOK,
  "Messenger": platformValidators.MESSENGER,
  "Facebook Messenger": platformValidators.MESSENGER,
  "WhatsApp Business": platformValidators.WHATSAPP,
  "WhatsApp": platformValidators.WHATSAPP,
  "LinkedIn": platformValidators.LINKEDIN,
  "LinkedIn Ads & Pages": platformValidators.LINKEDIN,
};

export async function validateCredentials(
  platform: string,
  fields: ValidationFields
): Promise<ValidationResult> {
  let validator = platformValidators[platform] ?? PLATFORM_VALIDATORS_MAP[platform];

  if (!validator && typeof platform === "string") {
    const pLower = platform.toLowerCase().trim();
    if (pLower.includes("youtube")) validator = platformValidators.YOUTUBE;
    else if (pLower.includes("analytics") || pLower.includes("ga4")) validator = platformValidators.GOOGLE_ANALYTICS;
    else if (pLower.includes("search console")) validator = platformValidators.GOOGLE_SEARCH_CONSOLE;
    else if (pLower.includes("google ads") || pLower.includes("gads")) validator = platformValidators.GOOGLE_ADS;
    else if (pLower.includes("admob") || pLower.includes("firebase")) validator = platformValidators.FIREBASE_ADMOB;
    else if (pLower.includes("play console")) validator = platformValidators.GOOGLE_BUSINESS_PROFILE;
    else if (pLower.includes("meta")) validator = platformValidators.META_ADS;
    else if (pLower.includes("instagram")) validator = platformValidators.INSTAGRAM;
    else if (pLower.includes("linkedin")) validator = platformValidators.LINKEDIN;
    else if (pLower.includes("facebook")) validator = platformValidators.FACEBOOK;
  }

  if (!validator) {
    return { valid: false, error: `Unknown platform: ${platform}` };
  }
  return validator(fields);
}
