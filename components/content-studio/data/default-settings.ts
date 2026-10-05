import { ContentStudioSettingsState } from "../types/content-studio-types";

// Default Content Studio preferences for a workspace that hasn't saved its own yet.
export const INITIAL_SETTINGS_STATE: ContentStudioSettingsState = {
  general: {
    workspaceName: "",
    defaultTimezone: "(GMT-05:00) Eastern Time (US & Canada)",
    defaultLanguage: "English (US)",
    dateFormat: "MMM DD, YYYY",
    timeFormat: "12-hour (10:00 AM)",
    defaultLandingPage: "Content Calendar"
  },
  publishing: {
    defaultPublishingTime: "10:00 AM",
    timezone: "Eastern Time (US & Canada)",
    defaultPlatform: "instagram",
    defaultPostStatus: "Scheduled",
    autoPublish: true,
    scheduleConfirmation: true,
    retryFailedPosts: true,
    crossPlatformPublishing: true
  },
  notifications: {
    postPublishedInApp: true,
    postPublishedEmail: true,
    postPublishedPush: false,
    postScheduledInApp: true,
    postScheduledEmail: false,
    postScheduledPush: false,
    postFailedInApp: true,
    postFailedEmail: true,
    postFailedPush: true,
    approvalRequestedInApp: true,
    approvalRequestedEmail: true,
    approvalRequestedPush: false,
    approvalCompletedInApp: true,
    approvalCompletedEmail: false,
    approvalCompletedPush: false,
    performanceReportsInApp: true,
    performanceReportsEmail: true,
    performanceReportsPush: false
  },
  branding: {
    workspaceLogo: "/logo.png",
    favicon: "/favicon.ico",
    primaryColor: "#7c3aed", // violet-600
    secondaryColor: "#0f172a", // slate-900
    defaultFont: "Inter, sans-serif"
  },
  ai: {
    aiCaptionGeneration: true,
    aiHashtagSuggestions: true,
    aiContentIdeas: true,
    aiEngagementPrediction: true,
    aiBestTimeRecommendation: true,
    aiContentRepurposing: true,
    aiTone: "Professional",
    language: "English (US)",
    creativity: "High"
  }
};
