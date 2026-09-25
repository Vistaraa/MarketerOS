"use client";

import { useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Code2,
  Copy,
  ExternalLink,
  ShieldCheck,
  UserCheck,
  X
} from "lucide-react";
import {
  SiGoogleads,
  SiGoogleanalytics,
  SiGooglecloud,
  SiYoutube,
  SiGoogleplay,
  SiMeta,
  SiInstagram
} from "react-icons/si";
import { FaLinkedinIn } from "react-icons/fa6";
import { cn } from "@/lib/utils";

export type PlatformGuideKey =
  | "google_ads"
  | "ga4"
  | "gsc"
  | "youtube"
  | "play_console"
  | "meta_ads"
  | "instagram"
  | "linkedin";

export interface SetupGuideConfig {
  key: PlatformGuideKey;
  title: string;
  badge: string;
  description: string;
  docsUrl: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  iconBg: string;
  iconColor: string;
  tab1: {
    alertTitle: string;
    alertText: string;
    steps: Array<{ step: number; title: string; text: string }>;
    envVars: Array<{ name: string; desc: string }>;
  };
  tab2: {
    steps: Array<{ step: number; title: string; text: string }>;
    calloutText: string;
  };
  tab3: {
    queryLabel: string;
    sampleCode: string;
    endpointInfo: string;
  };
}

export const SETUP_GUIDE_CONFIGS: Record<PlatformGuideKey, SetupGuideConfig> = {
  // 1. GOOGLE ADS
  google_ads: {
    key: "google_ads",
    title: "Google Ads API Setup Guide & Architecture",
    badge: "OAuth 2.0 Ready",
    description: "Complete onboarding workflow based on official Google Ads API documentation.",
    docsUrl: "https://developers.google.com/google-ads/api/docs/get-started/onboarding",
    icon: SiGoogleads,
    iconBg: "bg-amber-50 dark:bg-amber-950/40",
    iconColor: "text-[#F4B400]",
    tab1: {
      alertTitle: "Platform Owner Responsibility (Never ask end-users for Developer Tokens)",
      alertText: "As the SaaS platform owner, you obtain a single Developer Token and Google Cloud OAuth Client. End-users simply authenticate via Google OAuth in 1-click.",
      steps: [
        {
          step: 1,
          title: "Enable Google Ads API",
          text: "In Google Cloud Console > APIs & Services > Library, search for 'Google Ads API' and click Enable."
        },
        {
          step: 2,
          title: "Create OAuth Client ID",
          text: "In Credentials > Create Credentials > OAuth client ID (Web application). Add redirect URI: /api/google-ads/callback."
        },
        {
          step: 3,
          title: "Apply for Developer Token",
          text: "In your Google Ads Manager (MCC) account > Tools & Settings > Setup > API Center > Apply for your Developer Token."
        }
      ],
      envVars: [
        { name: "GOOGLE_ADS_DEVELOPER_TOKEN", desc: "Your Google Ads Manager MCC Developer Token (header: developer-token)" },
        { name: "GOOGLE_OAUTH_CLIENT_ID", desc: "Google Cloud Web Application Client ID" },
        { name: "GOOGLE_OAUTH_CLIENT_SECRET", desc: "Google Cloud Web Application Client Secret" },
        { name: "GOOGLE_OAUTH_REDIRECT_URI", desc: "https://your-domain.com/api/google-ads/callback" }
      ]
    },
    tab2: {
      steps: [
        { step: 1, title: "Step 1: Sign in with Google", text: "User clicks 'Connect Google Ads' and is redirected to Google's official consent prompt." },
        { step: 2, title: "Step 2: Grant Access", text: "User approves AdWords read access. Google returns an authorization code with offline access." },
        { step: 3, title: "Step 3: Refresh Token Exchange", text: "Backend exchanges code for long-lived refresh token and queries accessible accounts list." },
        { step: 4, title: "Step 4: Pick Customer ID", text: "User selects their Customer ID from the populated dropdown. Sync begins automatically." }
      ],
      calloutText: "End-users never have to hunt for Developer Tokens or copy complex API credentials."
    },
    tab3: {
      queryLabel: "Google Ads Query Language (GAQL) used by /api/google-ads/performance:",
      sampleCode: `SELECT
  campaign.id,
  campaign.name,
  campaign.status,
  campaign.advertising_channel_type,
  campaign_budget.amount_micros,
  metrics.cost_micros,
  metrics.impressions,
  metrics.clicks,
  metrics.conversions,
  metrics.conversions_value,
  metrics.ctr,
  metrics.average_cpc,
  metrics.cost_per_conversion
FROM campaign
WHERE segments.date DURING LAST_30_DAYS
ORDER BY metrics.cost_micros DESC`,
      endpointInfo: "Calls endpoint: https://googleads.googleapis.com/v18/customers/{customerId}/googleAds:searchStream with Authorization: Bearer {accessToken} and developer-token: {developerToken}."
    }
  },

  // 2. GOOGLE ANALYTICS 4
  ga4: {
    key: "ga4",
    title: "Google Analytics 4 API Setup Guide & Architecture",
    badge: "Data API v1",
    description: "Multi-property tracking architecture based on Google Analytics Data API v1.",
    docsUrl: "https://developers.google.com/analytics/devguides/reporting/data/v1/quickstart-client-libraries",
    icon: SiGoogleanalytics,
    iconBg: "bg-orange-50 dark:bg-orange-950/40",
    iconColor: "text-[#F9AB00]",
    tab1: {
      alertTitle: "Platform Owner Responsibility (Configure Google Cloud OAuth Client ID & Secret)",
      alertText: "As the SaaS platform owner, you enable Google Analytics Data API v1 in Google Cloud Console. End-users connect their GA4 properties in 1 click via Google OAuth.",
      steps: [
        {
          step: 1,
          title: "Enable GA Data API",
          text: "In Google Cloud Console > APIs & Services > Library, search for 'Google Analytics Data API v1' and click Enable."
        },
        {
          step: 2,
          title: "Create OAuth 2.0 Client",
          text: "In Credentials > Create Credentials > OAuth client ID (Web application). Add redirect URI: /api/google-analytics/callback."
        },
        {
          step: 3,
          title: "Authorize Admin Scopes",
          text: "Authorize analytics.readonly and analytics.manage.users.readonly scopes in your Google Cloud OAuth Consent Screen."
        }
      ],
      envVars: [
        { name: "GOOGLE_OAUTH_CLIENT_ID", desc: "Google Cloud Web Application Client ID" },
        { name: "GOOGLE_OAUTH_CLIENT_SECRET", desc: "Google Cloud Web Application Client Secret" },
        { name: "GOOGLE_ANALYTICS_REDIRECT_URI", desc: "https://your-domain.com/api/google-analytics/callback" }
      ]
    },
    tab2: {
      steps: [
        { step: 1, title: "Step 1: Sign in with Google", text: "User clicks 'Connect GA4' and is redirected to Google's official OAuth consent prompt." },
        { step: 2, title: "Step 2: Grant Analytics Access", text: "User approves read-only access for Google Analytics properties." },
        { step: 3, title: "Step 3: Token Exchange", text: "Backend exchanges authorization code for a long-lived refresh token and queries property list." },
        { step: 4, title: "Step 4: Pick GA4 Property", text: "User selects their GA4 Property ID (properties/394820194) from dropdown. Sync begins automatically." }
      ],
      calloutText: "End-users never have to hunt for Measurement IDs or API secrets."
    },
    tab3: {
      queryLabel: "Google Analytics Data API v1 JSON payload used by /api/google-analytics/performance:",
      sampleCode: `POST https://analyticsdata.googleapis.com/v1beta/properties/{propertyId}:runReport
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "dateRanges": [{ "startDate": "30daysAgo", "endDate": "today" }],
  "dimensions": [
    { "name": "date" },
    { "name": "sessionSource" },
    { "name": "sessionMedium" }
  ],
  "metrics": [
    { "name": "activeUsers" },
    { "name": "sessions" },
    { "name": "conversions" },
    { "name": "totalRevenue" },
    { "name": "averageSessionDuration" }
  ]
}`,
      endpointInfo: "Calls endpoint: https://analyticsdata.googleapis.com/v1beta/properties/{propertyId}:runReport with Authorization: Bearer {accessToken}."
    }
  },

  // 3. GOOGLE SEARCH CONSOLE
  gsc: {
    key: "gsc",
    title: "Google Search Console API Setup Guide & Architecture",
    badge: "OAuth 2.0 Ready",
    description: "Search analytics, query tracking, impression counts, and average rank position.",
    docsUrl: "https://developers.google.com/webmaster-tools/v1/searchanalytics/query",
    icon: SiGooglecloud,
    iconBg: "bg-blue-50 dark:bg-blue-950/40",
    iconColor: "text-[#4285F4]",
    tab1: {
      alertTitle: "Platform Owner Responsibility (Google Search Console API Access)",
      alertText: "Platform owner configures Google Cloud OAuth Client. End-users authorize Search Console access to fetch search queries, impressions, clicks, and average rank position.",
      steps: [
        {
          step: 1,
          title: "Enable Search Console API",
          text: "In Google Cloud Console > APIs & Services > Library, search for 'Google Search Console API' and click Enable."
        },
        {
          step: 2,
          title: "Configure Redirect URI",
          text: "In Credentials > OAuth client ID (Web application), add redirect URI: /api/gsc/callback."
        },
        {
          step: 3,
          title: "Authorize Webmasters Scope",
          text: "Ensure https://www.googleapis.com/auth/webmasters.readonly is added to scope configuration."
        }
      ],
      envVars: [
        { name: "GOOGLE_OAUTH_CLIENT_ID", desc: "Google Cloud Web Application Client ID" },
        { name: "GOOGLE_OAUTH_CLIENT_SECRET", desc: "Google Cloud Web Application Client Secret" },
        { name: "GSC_REDIRECT_URI", desc: "https://your-domain.com/api/gsc/callback" }
      ]
    },
    tab2: {
      steps: [
        { step: 1, title: "Step 1: Sign in with Google", text: "User clicks 'Connect Search Console' and signs in with their Google Account." },
        { step: 2, title: "Step 2: Approve Search Scope", text: "User approves webmaster read access for verified domain properties." },
        { step: 3, title: "Step 3: Fetch Verified Sites", text: "Backend queries webmasters.sites.list to retrieve all verified domain properties." },
        { step: 4, title: "Step 4: Select Domain", text: "User picks site URL (sc-domain:example.com) to begin syncing search performance." }
      ],
      calloutText: "Automatic domain discovery without manual verification tokens or file uploads."
    },
    tab3: {
      queryLabel: "Search Console API payload used by /api/gsc/performance:",
      sampleCode: `POST https://www.googleapis.com/webmasters/v3/sites/{siteUrl}/searchAnalytics/query
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "startDate": "2026-08-25",
  "endDate": "2026-09-25",
  "dimensions": ["query", "page"],
  "rowLimit": 100,
  "aggregationType": "auto"
}`,
      endpointInfo: "Calls endpoint: https://www.googleapis.com/webmasters/v3/sites/{siteUrl}/searchAnalytics/query with Authorization: Bearer {accessToken}."
    }
  },

  // 4. YOUTUBE CHANNEL
  youtube: {
    key: "youtube",
    title: "YouTube Channel & Analytics API Setup Guide",
    badge: "Data API v3",
    description: "Channel subscriber analytics, watch time, views, and video performance.",
    docsUrl: "https://developers.google.com/youtube/v3/docs",
    icon: SiYoutube,
    iconBg: "bg-red-50 dark:bg-red-950/40",
    iconColor: "text-[#FF0000]",
    tab1: {
      alertTitle: "Platform Owner Responsibility (YouTube Data API v3 & Analytics API)",
      alertText: "Platform owner registers Google OAuth Client with YouTube Data API v3 and YouTube Analytics API enabled.",
      steps: [
        {
          step: 1,
          title: "Enable YouTube APIs",
          text: "In Google Cloud Console, enable 'YouTube Data API v3' and 'YouTube Analytics API'."
        },
        {
          step: 2,
          title: "Configure OAuth Client",
          text: "In Credentials > OAuth client ID (Web application), add redirect URI: /api/youtube/callback."
        },
        {
          step: 3,
          title: "Request Channel Read Scopes",
          text: "Request youtube.readonly and yt-analytics.readonly scopes in your OAuth Consent Screen."
        }
      ],
      envVars: [
        { name: "YOUTUBE_OAUTH_CLIENT_ID", desc: "Google Cloud Web Application Client ID" },
        { name: "YOUTUBE_OAUTH_CLIENT_SECRET", desc: "Google Cloud Web Application Client Secret" },
        { name: "YOUTUBE_REDIRECT_URI", desc: "https://your-domain.com/api/youtube/callback" }
      ]
    },
    tab2: {
      steps: [
        { step: 1, title: "Step 1: Connect YouTube Account", text: "User selects Google Account owning the YouTube Channel." },
        { step: 2, title: "Step 2: Grant Channel Access", text: "User approves YouTube analytics and video listing permissions." },
        { step: 3, title: "Step 3: Channel Resolution", text: "Backend fetches channel ID, subscriber count, and video metadata." },
        { step: 4, title: "Step 4: Automated Video Sync", text: "Watch time, views, likes, and comment engagement sync automatically." }
      ],
      calloutText: "Direct channel connection with 1-click Google sign-in."
    },
    tab3: {
      queryLabel: "YouTube Analytics API request used by /api/youtube/performance:",
      sampleCode: `GET https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&startDate=2026-08-25&endDate=2026-09-25&metrics=views,comments,likes,subscribersGained,estimatedMinutesWatched&dimensions=day
Authorization: Bearer {accessToken}`,
      endpointInfo: "Calls endpoint: https://youtubeanalytics.googleapis.com/v2/reports with Authorization: Bearer {accessToken}."
    }
  },

  // 5. GOOGLE PLAY CONSOLE
  play_console: {
    key: "play_console",
    title: "Google Play Developer API Setup Guide & Architecture",
    badge: "Reporting v1",
    description: "App listing visitors, conversion rate, crashes, ANRs, and release track synchronization.",
    docsUrl: "https://developers.google.com/android-publisher",
    icon: SiGoogleplay,
    iconBg: "bg-emerald-50 dark:bg-emerald-950/40",
    iconColor: "text-[#01875F]",
    tab1: {
      alertTitle: "Platform Owner Responsibility (Google Play Developer API Credentials)",
      alertText: "Access can be configured via Service Account JSON or OAuth 2.0 with Play Console permissions.",
      steps: [
        {
          step: 1,
          title: "Enable Android Publisher API",
          text: "In Google Cloud Console, enable 'Google Play Android Developer API' and 'Google Play Developer Reporting API'."
        },
        {
          step: 2,
          title: "Create Service Account",
          text: "Create a Service Account, generate JSON key, and copy client email address."
        },
        {
          step: 3,
          title: "Grant Play Console Access",
          text: "In Google Play Console > Users & Permissions > Invite Service Account email with View App Info & Financial Data permissions."
        }
      ],
      envVars: [
        { name: "GOOGLE_PLAY_SERVICE_ACCOUNT_KEY", desc: "Encrypted JSON Service Account Key" },
        { name: "GOOGLE_PLAY_CLIENT_ID", desc: "OAuth Client ID for Play Developer Reporting API" },
        { name: "GOOGLE_PLAY_CLIENT_SECRET", desc: "OAuth Client Secret" }
      ]
    },
    tab2: {
      steps: [
        { step: 1, title: "Step 1: Input Package Name", text: "User inputs registered Android Package Name (e.g., com.company.appname)." },
        { step: 2, title: "Step 2: Provide Access Key", text: "User provides Service Account JSON or connects via Google OAuth." },
        { step: 3, title: "Step 3: Verify Ownership", text: "Backend tests Play Store package existence and permission scope." },
        { step: 4, title: "Step 4: Live Sync Active", text: "Daily audience, conversion rates, release tracks, and crash/ANR rates sync automatically." }
      ],
      calloutText: "Supports multi-app tracking per workspace."
    },
    tab3: {
      queryLabel: "Play Developer Reporting API query used by /api/v1/play-console/kpis:",
      sampleCode: `POST https://playdeveloperreporting.googleapis.com/v1beta1/apps/{packageName}/vitals/errors/reports:search
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "filter": "date >= 2026-08-25 AND date <= 2026-09-25",
  "metrics": ["crashRate", "anrRate", "distinctUsersWithCrash"]
}`,
      endpointInfo: "Calls endpoint: https://playdeveloperreporting.googleapis.com/v1beta1/apps/{packageName}/vitals/errors/reports:search."
    }
  },

  // 6. META ADS
  meta_ads: {
    key: "meta_ads",
    title: "Meta Marketing API Setup Guide & Architecture",
    badge: "Graph API v19.0",
    description: "Meta Ads Manager, custom audiences, dynamic catalog sales, and conversion tracking.",
    docsUrl: "https://developers.facebook.com/docs/marketing-apis",
    icon: SiMeta,
    iconBg: "bg-blue-50 dark:bg-blue-950/40",
    iconColor: "text-[#0668E1]",
    tab1: {
      alertTitle: "Platform Owner Responsibility (Meta Business Manager App & System User)",
      alertText: "Platform owner creates a Meta Developer App with Marketing API enabled and configures System User for long-lived tokens.",
      steps: [
        {
          step: 1,
          title: "Create Meta Developer App",
          text: "Go to developers.facebook.com > Create App > Select 'Business' type. Add 'Marketing API' product."
        },
        {
          step: 2,
          title: "Setup System User",
          text: "In Business Manager Settings > Users > System Users, create a System User and assign your Ad Account."
        },
        {
          step: 3,
          title: "Generate Permanent Token",
          text: "Click 'Generate New Token' with ads_management, ads_read, business_management permissions."
        }
      ],
      envVars: [
        { name: "META_APP_ID", desc: "Meta App ID from Developer Dashboard" },
        { name: "META_APP_SECRET", desc: "Meta App Secret" },
        { name: "META_SYSTEM_USER_TOKEN", desc: "Permanent Access Token (EAA...)" }
      ]
    },
    tab2: {
      steps: [
        { step: 1, title: "Step 1: Click 'Connect Meta Ads'", text: "User clicks connect button and opens Meta Login dialog." },
        { step: 2, title: "Step 2: Authenticate with Facebook", text: "User approves Facebook Business permission." },
        { step: 3, title: "Step 3: Fetch Ad Accounts", text: "Backend queries me/adaccounts to list all accessible act_XXXXXXXXXXXX accounts." },
        { step: 4, title: "Step 4: Pick Ad Account ID", text: "User selects Ad Account ID. Sync fetches campaigns, spend, CTR, CPA & ROAS." }
      ],
      calloutText: "Automatic account discovery via Meta Graph API."
    },
    tab3: {
      queryLabel: "Graph API query used by /api/meta-ads/performance:",
      sampleCode: `GET https://graph.facebook.com/v19.0/act_{adAccountId}/insights?fields=campaign_name,impressions,clicks,spend,conversions,cpc,ctr,roas&date_preset=last_30d&level=campaign
Authorization: Bearer {accessToken}`,
      endpointInfo: "Calls endpoint: https://graph.facebook.com/v19.0/act_{adAccountId}/insights."
    }
  },

  // 7. INSTAGRAM PROFESSIONAL
  instagram: {
    key: "instagram",
    title: "Instagram Graph API Setup Guide & Architecture",
    badge: "Graph API v19.0",
    description: "Post publishing, Story metrics, Reels analytics, and follower growth.",
    docsUrl: "https://developers.facebook.com/docs/instagram-api",
    icon: SiInstagram,
    iconBg: "bg-pink-50 dark:bg-pink-950/40",
    iconColor: "text-[#E4405F]",
    tab1: {
      alertTitle: "Platform Owner Responsibility (Instagram Graph API Permissions)",
      alertText: "Platform owner adds Instagram Graph API product to Meta Developer App and requests permissions.",
      steps: [
        {
          step: 1,
          title: "Add Instagram Graph API",
          text: "In Meta Developer Portal, add 'Instagram Graph API' product to your App."
        },
        {
          step: 2,
          title: "App Review Permissions",
          text: "Request instagram_basic, instagram_manage_insights, pages_read_engagement, pages_show_list."
        },
        {
          step: 3,
          title: "Business Manager Link",
          text: "Link Instagram Business Account to Meta Business Manager and Facebook Page."
        }
      ],
      envVars: [
        { name: "INSTAGRAM_APP_ID", desc: "Meta Developer App ID" },
        { name: "INSTAGRAM_APP_SECRET", desc: "Meta Developer App Secret" },
        { name: "INSTAGRAM_GRAPH_TOKEN", desc: "Permanent Page / System User Access Token" }
      ]
    },
    tab2: {
      steps: [
        { step: 1, title: "Step 1: Switch to Professional", text: "Ensure Instagram account is switched to Business/Creator in mobile app." },
        { step: 2, title: "Step 2: Connect to Facebook Page", text: "Link Instagram account to a Facebook Page." },
        { step: 3, title: "Step 3: Log in with Facebook", text: "User authenticates via Facebook login dialog." },
        { step: 4, title: "Step 4: Select Business Account", text: "User selects Instagram Business Account ID. Sync tracks Stories, Reels, followers & engagement." }
      ],
      calloutText: "Seamless Instagram Professional insights sync."
    },
    tab3: {
      queryLabel: "Instagram Insights API request used by /api/instagram/performance:",
      sampleCode: `GET https://graph.facebook.com/v19.0/{igUserId}/insights?metric=impressions,reach,profile_views,follower_count&period=day
Authorization: Bearer {accessToken}`,
      endpointInfo: "Calls endpoint: https://graph.facebook.com/v19.0/{igUserId}/insights."
    }
  },

  // 8. LINKEDIN ADS & PAGES
  linkedin: {
    key: "linkedin",
    title: "LinkedIn Marketing API Setup Guide & Architecture",
    badge: "Restli v2.0",
    description: "B2B campaign manager, lead gen forms, and company page engagement.",
    docsUrl: "https://learn.microsoft.com/en-us/linkedin/marketing/",
    icon: FaLinkedinIn,
    iconBg: "bg-sky-50 dark:bg-sky-950/40",
    iconColor: "text-[#0A66C2]",
    tab1: {
      alertTitle: "Platform Owner Responsibility (LinkedIn Developer Portal Setup)",
      alertText: "Platform owner creates an App in LinkedIn Developer Portal and requests Marketing Developer Platform access.",
      steps: [
        {
          step: 1,
          title: "Create LinkedIn App",
          text: "Go to linkedin.com/developers > Create App > Associate with LinkedIn Company Page."
        },
        {
          step: 2,
          title: "Request Marketing Product",
          text: "Apply for 'Community Management API' and 'Marketing Developer Platform' products."
        },
        {
          step: 3,
          title: "Configure OAuth Credentials",
          text: "Add redirect URI: /api/linkedin/callback and obtain Client ID & Secret."
        }
      ],
      envVars: [
        { name: "LINKEDIN_CLIENT_ID", desc: "LinkedIn Developer App Client ID" },
        { name: "LINKEDIN_CLIENT_SECRET", desc: "LinkedIn Developer App Client Secret" },
        { name: "LINKEDIN_REDIRECT_URI", desc: "https://your-domain.com/api/linkedin/callback" }
      ]
    },
    tab2: {
      steps: [
        { step: 1, title: "Step 1: Click 'Connect LinkedIn'", text: "User opens LinkedIn OAuth consent window." },
        { step: 2, title: "Step 2: Grant Account Scopes", text: "User approves r_ads, rw_organization_admin, and r_basicprofile." },
        { step: 3, title: "Step 3: Fetch Ad Accounts & Pages", text: "Backend queries LinkedIn API to list sponsored ad accounts (urn:li:sponsoredAccount:XXXX)." },
        { step: 4, title: "Step 4: Select Account", text: "User selects Ad Account or Company Page ID. Sync begins automatically." }
      ],
      calloutText: "Direct 1-click B2B campaign integration."
    },
    tab3: {
      queryLabel: "LinkedIn Marketing API payload used by /api/linkedin/performance:",
      sampleCode: `GET https://api.linkedin.com/v2/adAnalyticsV2?q=analytics&pivot=CAMPAIGN&dateRange.start.day=25&dateRange.start.month=8&dateRange.start.year=2026&timeGranularity=DAILY&accounts=urn:li:sponsoredAccount:{accountId}&fields=impressions,clicks,costInLocalCurrency,oneClickLeads
Authorization: Bearer {accessToken}
X-Restli-Protocol-Version: 2.0.0`,
      endpointInfo: "Calls endpoint: https://api.linkedin.com/v2/adAnalyticsV2 with X-Restli-Protocol-Version: 2.0.0."
    }
  }
};

/**
 * Text formatting helper that safely wraps URLs and API paths in code snippets with word-break safety
 */
function renderFormattedText(text: string) {
  const parts = text.split(/(https?:\/\/[^\s]+|\/api\/[^\s]+)/g);
  return (
    <span className="break-words [word-break:break-word] leading-relaxed">
      {parts.map((part, i) => {
        if (part.startsWith("http://") || part.startsWith("https://") || part.startsWith("/api/")) {
          return (
            <code
              key={i}
              className="inline-block break-all font-mono text-[10px] bg-zinc-100 dark:bg-zinc-800/80 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700/60 text-indigo-600 dark:text-indigo-400 font-medium my-0.5"
            >
              {part}
            </code>
          );
        }
        return part;
      })}
    </span>
  );
}

/**
 * Generic Platform Setup Guide Content Component
 */
export function GenericPlatformSetupGuide({
  config,
  onClose
}: {
  config: SetupGuideConfig;
  onClose?: () => void;
}) {
  const [tab, setTab] = useState<"platform_owner" | "end_user" | "api_spec">("platform_owner");
  const [copied, setCopied] = useState(false);

  const IconComp = config.icon;

  const copyCode = () => {
    navigator.clipboard.writeText(config.tab3.sampleCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full max-h-[90vh] overflow-hidden bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      {/* 1. Modal Top Bar */}
      <div className="flex items-start justify-between gap-3 p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/40 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn("grid h-10 w-10 place-items-center rounded-xl shrink-0 shadow-2xs", config.iconBg, config.iconColor)}>
            <IconComp size={22} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 truncate">
                {config.title}
              </h2>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40 shrink-0">
                {config.badge}
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
              {config.description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href={config.docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-2xs transition hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            <span className="hidden sm:inline">Official Docs</span>
            <ExternalLink size={12} />
          </a>

          {onClose && (
            <button
              onClick={onClose}
              className="rounded-xl p-1.5 text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* 2. Modal Body Container */}
      <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-1 text-xs dark:border-zinc-800 dark:bg-zinc-900 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setTab("platform_owner")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition whitespace-nowrap cursor-pointer",
              tab === "platform_owner"
                ? "bg-white text-zinc-900 shadow-2xs dark:bg-zinc-800 dark:text-zinc-100"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400"
            )}
          >
            <ShieldCheck size={13} />
            <span>1. Platform Owner Setup (One-Time)</span>
          </button>

          <button
            onClick={() => setTab("end_user")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition whitespace-nowrap cursor-pointer",
              tab === "end_user"
                ? "bg-white text-zinc-900 shadow-2xs dark:bg-zinc-800 dark:text-zinc-100"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400"
            )}
          >
            <UserCheck size={13} />
            <span>2. End-User Connect Experience</span>
          </button>

          <button
            onClick={() => setTab("api_spec")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition whitespace-nowrap cursor-pointer",
              tab === "api_spec"
                ? "bg-white text-zinc-900 shadow-2xs dark:bg-zinc-800 dark:text-zinc-100"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400"
            )}
          >
            <Code2 size={13} />
            <span>3. API Backend Query Spec</span>
          </button>
        </div>

        {/* TAB 1: PLATFORM OWNER SETUP */}
        {tab === "platform_owner" && (
          <div className="space-y-4 text-xs">
            <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 p-3.5 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
              <div className="flex items-center gap-2 font-bold text-xs">
                <AlertTriangle size={14} className="shrink-0 text-amber-600 dark:text-amber-400" />
                <span>{config.tab1.alertTitle}</span>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed opacity-90 break-words [word-break:break-word]">
                {config.tab1.alertText}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {config.tab1.steps.map((st) => (
                <div key={st.step} className="flex flex-col justify-start rounded-xl border border-zinc-200 bg-white p-4 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden min-w-0">
                  <div className="flex items-center gap-2 font-bold text-zinc-900 dark:text-zinc-100 mb-2">
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-zinc-100 text-[10px] font-black text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 shrink-0">
                      {st.step}
                    </span>
                    <span className="truncate">{st.title}</span>
                  </div>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed break-words [word-break:break-word]">
                    {renderFormattedText(st.text)}
                  </div>
                </div>
              ))}
            </div>

            {/* Environment Variables Table */}
            {config.tab1.envVars.length > 0 && (
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50 overflow-hidden">
                <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 mb-2.5">
                  Backend Environment Variables (.env)
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px] table-fixed min-w-[500px]">
                    <tbody className="divide-y divide-zinc-200/80 dark:divide-zinc-800/80">
                      {config.tab1.envVars.map((v) => (
                        <tr key={v.name}>
                          <td className="py-2 pr-3 font-mono font-semibold text-indigo-600 dark:text-indigo-400 break-all w-[42%] align-top select-all">
                            {v.name}
                          </td>
                          <td className="py-2 text-zinc-600 dark:text-zinc-400 w-[58%] align-top font-sans text-[11px] leading-relaxed break-words [word-break:break-word]">
                            {renderFormattedText(v.desc)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: END-USER CONNECT EXPERIENCE */}
        {tab === "end_user" && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {config.tab2.steps.map((st) => (
                <div key={st.step} className="flex flex-col justify-start rounded-xl border border-zinc-200 bg-white p-3.5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden min-w-0">
                  <div className="font-bold text-zinc-900 dark:text-zinc-100 mb-1.5 truncate">{st.title}</div>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed break-words [word-break:break-word]">
                    {renderFormattedText(st.text)}
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/60 p-4 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
              <div className="flex items-center gap-2 font-bold text-xs">
                <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Zero-Friction UX</span>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed opacity-90 break-words [word-break:break-word]">
                {config.tab2.calloutText}
              </p>
            </div>
          </div>
        )}

        {/* TAB 3: API BACKEND QUERY SPEC */}
        {tab === "api_spec" && (
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="font-semibold text-zinc-700 dark:text-zinc-300 break-words [word-break:break-word]">
                {config.tab3.queryLabel}
              </span>
              <button
                onClick={copyCode}
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 transition-colors cursor-pointer shrink-0"
              >
                {copied ? <CheckCircle2 size={13} className="text-emerald-500" /> : <Copy size={13} />}
                <span>{copied ? "Copied!" : "Copy Spec"}</span>
              </button>
            </div>

            <pre className="overflow-x-auto max-w-full rounded-xl border border-zinc-200 bg-zinc-900 p-4 font-mono text-[11px] text-zinc-100 dark:border-zinc-800 leading-relaxed">
              <code>{config.tab3.sampleCode}</code>
            </pre>

            <div className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed break-words [word-break:break-word]">
              {renderFormattedText(config.tab3.endpointInfo)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Universal Platform Setup Guide Modal Dialog Component
 */
export function PlatformSetupGuideModal({
  isOpen,
  onClose,
  platformKey
}: {
  isOpen: boolean;
  onClose: () => void;
  platformKey: PlatformGuideKey | string | null;
}) {
  if (!isOpen || !platformKey) return null;

  // Map incoming key to valid key
  const normalizedKey = ((): PlatformGuideKey => {
    const k = platformKey.toLowerCase();
    if (k.includes("analytics") || k === "ga4") return "ga4";
    if (k.includes("search console") || k === "gsc") return "gsc";
    if (k.includes("youtube")) return "youtube";
    if (k.includes("play")) return "play_console";
    if (k.includes("meta") || k.includes("facebook")) return "meta_ads";
    if (k.includes("instagram")) return "instagram";
    if (k.includes("linkedin")) return "linkedin";
    return "google_ads";
  })();

  const config = SETUP_GUIDE_CONFIGS[normalizedKey];
  if (!config) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="w-full max-w-3xl max-h-[92vh] flex flex-col rounded-2xl border border-zinc-200/90 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 overflow-hidden my-auto">
        <GenericPlatformSetupGuide config={config} onClose={onClose} />
      </div>
    </div>
  );
}
