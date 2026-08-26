"use client";

import { useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Eye,
  FileText,
  Globe,
  Settings,
  Shield,
  Youtube,
  Zap
} from "lucide-react";
import { AppShell } from "@/components/marketeros-shell";

const SETUP_STEPS = [
  {
    id: 1,
    title: "Create Google Account",
    icon: <Globe size={16} />,
    description: "Create a Google Account for your business (or use existing).",
    source: "https://support.google.com/youtube/answer/6180215",
    sourceText: "YouTube Create Channel Guide",
    details: "Use a business email (name@yourbrand.com recommended). This Google Account will own your Brand Channel.",
    substeps: [
      "Go to https://accounts.google.com/signup",
      "Create a new Google Account or use existing business account",
      "Use a business email (name@yourbrand.com recommended)",
      "Enable 2-Step Verification for security"
    ]
  },
  {
    id: 2,
    title: "Create Brand Account Channel",
    icon: <Youtube size={16} />,
    description: "Create a dedicated Brand Account channel (not personal).",
    source: "https://support.google.com/youtube/answer/6180215",
    sourceText: "YouTube Create Channel Guide",
    details: "A Brand Account lets multiple team members manage the channel, use any channel name, and keeps business ownership separate from personal accounts.",
    substeps: [
      "Go to youtube.com and sign in with your Google Account",
      "Click your profile icon (top-right) → \"Create a channel\"",
      "Choose \"Use a custom name\" to create a Brand Account",
      "Enter your brand/channel name",
      "Agree to YouTube Terms of Service"
    ]
  },
  {
    id: 3,
    title: "Customize Channel",
    icon: <Settings size={16} />,
    description: "Upload branding assets and optimize channel description.",
    source: "https://support.google.com/youtube/answer/2972003",
    sourceText: "Channel Customization Guide",
    details: "Professional branding increases viewer trust and subscription rates by 35%. Consistent branding makes your channel look professional and trustworthy.",
    substeps: [
      "Upload Profile Picture (800x800px min — logo recommended)",
      "Upload Banner Art (2560x1440px — safe zone: 1546x423px center)",
      "Write Channel Description with keywords + brand story",
      "Add website and social media links",
      "Add contact email for business inquiries",
      "Set channel keywords for discoverability"
    ]
  },
  {
    id: 4,
    title: "Verify Channel (Phone)",
    icon: <Shield size={16} />,
    description: "Phone verification unlocks custom thumbnails, longer videos, and live streaming.",
    source: "https://support.google.com/youtube/answer/17109431",
    sourceText: "Verify Your Channel",
    details: "Required for YouTube Partner Program eligibility and advanced features. Unlocks custom thumbnails, videos >15 min, and live streaming.",
    substeps: [
      "Go to YouTube Studio → Settings → Channel → Feature eligibility",
      "Click \"Verify phone number\"",
      "Enter your phone number and verification code",
      "Unlock custom thumbnails, videos >15 min, and live streaming"
    ]
  },
  {
    id: 5,
    title: "Enable 2-Step Verification",
    icon: <Shield size={16} />,
    description: "Protect your account and enable YouTube Partner Program eligibility.",
    source: "https://support.google.com/accounts/answer/185839",
    sourceText: "2-Step Verification Setup",
    details: "Required for monetization and advanced security. Protects your channel from unauthorized access.",
    substeps: [
      "Go to myaccount.google.com/security",
      "Enable 2-Step Verification",
      "Use phone prompt or authenticator app",
      "Keep backup codes safe"
    ]
  },
  {
    id: 6,
    title: "Set Channel Defaults",
    icon: <FileText size={16} />,
    description: "Configure default settings for all future uploads.",
    source: "https://support.google.com/youtube/answer/6180220",
    sourceText: "Upload Defaults Guide",
    details: "Saves time and ensures consistency across all uploads. Set default title, description, tags, visibility.",
    substeps: [
      "YouTube Studio → Settings → Upload defaults",
      "Set default title suffix, description template",
      "Add default tags for your niche",
      "Set default visibility (Public/Unlisted/Private)",
      "Set language and category"
    ]
  },
  {
    id: 7,
    title: "Create Channel Sections",
    icon: <Zap size={16} />,
    description: "Organize videos into sections/playlists and set channel layout.",
    source: "https://support.google.com/youtube/answer/2972003",
    sourceText: "Channel Customization Guide",
    details: "Organized channels keep viewers engaged longer. Create sections for Featured, Latest, Popular, and topic-specific playlists.",
    substeps: [
      "Go to YouTube Studio → Customization → Layout",
      "Add sections: Featured, Latest, Popular",
      "Create topic-specific playlists",
      "Set channel trailer for new visitors",
      "Set featured video for returning subscribers"
    ]
  },
  {
    id: 8,
    title: "Link Google Analytics (Optional)",
    icon: <Eye size={16} />,
    description: "Track channel traffic and audience behavior with GA4.",
    source: "https://support.google.com/youtube/answer/9276740",
    sourceText: "Link Analytics",
    details: "Optional but recommended. Links your YouTube channel to Google Analytics 4 for deeper audience insights.",
    substeps: [
      "YouTube Studio → Settings → Channel → Advanced",
      "Click \"Link Google Analytics\"",
      "Enter your GA4 Property ID",
      "Save changes"
    ]
  }
];

export default function YouTubeGuidePage() {
  return (
    <AppShell title="YouTube Brand Channel Guide">
      <div className="mx-auto max-w-5xl space-y-6 p-6">
        {/* Header */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950/60">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-red-50 dark:bg-red-950/30">
              <Youtube className="h-7 w-7 text-red-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">YouTube Brand Channel — Complete Guide</h1>
              <p className="text-xs text-zinc-500">Everything you need to set up and connect your YouTube Brand Channel in MarketerOS.</p>
            </div>
          </div>
        </div>

        {/* Setup Guide Steps */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950/60">
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Step-by-Step YouTube Brand Channel Setup</h2>
          <p className="mt-1 text-xs text-zinc-500">Follow these 8 official steps to set up your YouTube Brand Channel properly before connecting to MarketerOS.</p>
        </div>

        {SETUP_STEPS.map((step) => (
          <SetupStepCard key={step.id} step={step} />
        ))}
      </div>
    </AppShell>
  );
}

function SetupStepCard({ step }: { step: typeof SETUP_STEPS[0] }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950/60">
      <button onClick={() => setExpanded(!expanded)} className="flex w-full items-center gap-4 p-4 text-left">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-red-50 text-red-600 dark:bg-red-950/30">{step.icon}</div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-red-600">STEP {step.id}</span>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{step.title}</h3>
          </div>
          <p className="text-xs text-zinc-500">{step.description}</p>
        </div>
        {expanded ? <ChevronDown size={16} className="text-zinc-400" /> : <ChevronRight size={16} className="text-zinc-400" />}
      </button>
      {expanded && (
        <div className="border-t border-zinc-100 px-4 pb-4 pt-3 dark:border-zinc-800">
          <p className="mb-3 text-xs text-zinc-600 dark:text-zinc-400">{step.details}</p>
          <ul className="mb-3 space-y-1.5">
            {step.substeps.map((sub, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-zinc-700 dark:text-zinc-300">
                <Check size={12} className="mt-0.5 shrink-0 text-emerald-500" />
                {sub}
              </li>
            ))}
          </ul>
          <a href={step.source} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700">
            <ExternalLink size={10} />
            {step.sourceText}
          </a>
        </div>
      )}
    </div>
  );
}
