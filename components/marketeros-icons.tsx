"use client";

import React from "react";
import {
  BarChart3,
  Brain,
  CalendarDays,
  ChartNoAxesCombined,
  CircleDollarSign,
  Globe,
  MousePointer2,
  ShoppingCart,
  Sparkles,
  TrendingUp,
  UsersRound
} from "lucide-react";
import { FaLinkedinIn } from "react-icons/fa6";
import {
  SiFacebook,
  SiFirebase,
  SiGoogleads,
  SiGoogleanalytics,
  SiGooglesearchconsole,
  SiInstagram,
  SiMessenger,
  SiMeta,
  SiShopify,
  SiTiktok,
  SiWhatsapp,
  SiWordpress,
  SiX,
  SiYoutube
} from "react-icons/si";
import { cn } from "@/lib/utils";

type BrandConfig = {
  icon: React.ElementType;
  color: string;
  bgLight: string;
  bgDark: string;
};

const brandMap: Record<string, BrandConfig> = {
  "Google Ads": {
    icon: SiGoogleads,
    color: "#fbbc04",
    bgLight: "bg-amber-50 text-amber-600 border-amber-100",
    bgDark: "dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50"
  },
  "Meta Ads": {
    icon: SiMeta,
    color: "#0668E1",
    bgLight: "bg-blue-50 text-blue-600 border-blue-100",
    bgDark: "dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/50"
  },
  Meta: {
    icon: SiMeta,
    color: "#0668E1",
    bgLight: "bg-blue-50 text-blue-600 border-blue-100",
    bgDark: "dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/50"
  },
  Instagram: {
    icon: SiInstagram,
    color: "#E4405F",
    bgLight: "bg-rose-50 text-rose-600 border-rose-100",
    bgDark: "dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/50"
  },
  Facebook: {
    icon: SiFacebook,
    color: "#1877F2",
    bgLight: "bg-sky-50 text-sky-600 border-sky-100",
    bgDark: "dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-900/50"
  },
  Messenger: {
    icon: SiMessenger,
    color: "#00B2FF",
    bgLight: "bg-sky-50 text-sky-600 border-sky-100",
    bgDark: "dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-900/50"
  },
  WhatsApp: {
    icon: SiWhatsapp,
    color: "#25D366",
    bgLight: "bg-emerald-50 text-emerald-600 border-emerald-100",
    bgDark: "dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50"
  },
  "WhatsApp Business": {
    icon: SiWhatsapp,
    color: "#25D366",
    bgLight: "bg-emerald-50 text-emerald-600 border-emerald-100",
    bgDark: "dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50"
  },
  LinkedIn: {
    icon: FaLinkedinIn,
    color: "#0A66C2",
    bgLight: "bg-blue-50 text-blue-700 border-blue-100",
    bgDark: "dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/50"
  },
  TikTok: {
    icon: SiTiktok,
    color: "#000000",
    bgLight: "bg-zinc-100 text-zinc-900 border-zinc-200",
    bgDark: "dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-700"
  },
  GA4: {
    icon: SiGoogleanalytics,
    color: "#E37400",
    bgLight: "bg-orange-50 text-orange-600 border-orange-100",
    bgDark: "dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-900/50"
  },
  "Google Analytics": {
    icon: SiGoogleanalytics,
    color: "#E37400",
    bgLight: "bg-orange-50 text-orange-600 border-orange-100",
    bgDark: "dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-900/50"
  },
  "Google Search Console": {
    icon: SiGooglesearchconsole,
    color: "#4285F4",
    bgLight: "bg-blue-50 text-blue-600 border-blue-100",
    bgDark: "dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/50"
  },
  YouTube: {
    icon: SiYoutube,
    color: "#FF0000",
    bgLight: "bg-rose-50 text-rose-600 border-rose-100",
    bgDark: "dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/50"
  },
  X: {
    icon: SiX,
    color: "#000000",
    bgLight: "bg-zinc-100 text-zinc-900 border-zinc-200",
    bgDark: "dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-700"
  },
  Shopify: {
    icon: SiShopify,
    color: "#7AB55C",
    bgLight: "bg-emerald-50 text-emerald-700 border-emerald-100",
    bgDark: "dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50"
  },
  Firebase: {
    icon: SiFirebase,
    color: "#FFCA28",
    bgLight: "bg-amber-50 text-amber-600 border-amber-100",
    bgDark: "dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50"
  },
  WordPress: {
    icon: SiWordpress,
    color: "#21759B",
    bgLight: "bg-sky-50 text-sky-700 border-sky-100",
    bgDark: "dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-900/50"
  }
};

export function PlatformIcon({
  platform,
  size = 20,
  className = ""
}: {
  platform: string;
  size?: number;
  className?: string;
}) {
  const p = (platform || "").toLowerCase();

  let config = brandMap[platform];
  if (!config) {
    if (p.includes("google ads")) config = brandMap["Google Ads"];
    else if (p.includes("analytics") || p.includes("ga4")) config = brandMap["Google Analytics"];
    else if (p.includes("search console")) config = brandMap["Google Search Console"];
    else if (p.includes("firebase") || p.includes("admob")) config = brandMap["Firebase"];
    else if (p.includes("youtube")) config = brandMap["YouTube"];
    else if (p.includes("meta") || p.includes("facebook ads")) config = brandMap["Meta Ads"];
    else if (p.includes("facebook")) config = brandMap["Facebook"];
    else if (p.includes("instagram")) config = brandMap["Instagram"];
    else if (p.includes("messenger")) config = brandMap["Messenger"];
    else if (p.includes("whatsapp")) config = brandMap["WhatsApp"];
    else if (p.includes("linkedin")) config = brandMap["LinkedIn"];
    else if (p.includes("tiktok")) config = brandMap["TikTok"];
    else if (p.includes("shopify")) config = brandMap["Shopify"];
    else if (p.includes("wordpress")) config = brandMap["WordPress"];
    else if (p === "x" || p.includes("twitter")) config = brandMap["X"];
  }

  if (config) {
    const Icon = config.icon;
    return (
      <div
        className={cn(
          "grid shrink-0 place-items-center rounded-lg border p-1 shadow-2xs transition",
          config.bgLight,
          config.bgDark,
          className
        )}
        style={{ width: Math.max(size + 8, 24), height: Math.max(size + 8, 24) }}
        title={platform}
      >
        <Icon size={size} />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid shrink-0 place-items-center rounded-lg border border-zinc-200 bg-zinc-100 text-zinc-600 font-bold text-xs shadow-2xs dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300",
        className
      )}
      style={{ width: Math.max(size + 8, 24), height: Math.max(size + 8, 24) }}
      title={platform}
    >
      <Globe size={size} />
    </div>
  );
}

export function ProductLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`flex items-center ${compact ? "gap-2" : "gap-2.5"}`}>
      <span
        className={`grid place-items-center rounded-xl bg-zinc-900 font-black text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-sm ${
          compact ? "h-7 w-7 rounded-lg text-sm" : "h-8 w-8 text-base"
        }`}
      >
        M
      </span>
      {!compact && (
        <span className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Marketer<span className="text-zinc-500">OS</span>
        </span>
      )}
    </div>
  );
}

export function KpiIcon({ type, tone = "purple" }: { type: string; tone?: string }) {
  const Icon =
    type === "spend"
      ? CircleDollarSign
      : type === "clicks"
      ? MousePointer2
      : type === "conversions"
      ? ShoppingCart
      : type === "roas"
      ? TrendingUp
      : type === "ctr"
      ? ChartNoAxesCombined
      : type === "leads"
      ? UsersRound
      : type === "brain"
      ? Brain
      : type === "calendar"
      ? CalendarDays
      : type === "chart"
      ? BarChart3
      : Sparkles;

  const tones: Record<string, string> = {
    purple: "bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400",
    blue: "bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400",
    green: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
    orange: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400",
    teal: "bg-teal-50 text-teal-600 dark:bg-teal-950/40 dark:text-teal-400",
    pink: "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400"
  };

  return (
    <span
      className={cn(
        "grid h-9 w-9 place-items-center rounded-xl",
        tones[tone] || tones.purple
      )}
    >
      <Icon size={18} strokeWidth={2} />
    </span>
  );
}
