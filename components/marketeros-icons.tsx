"use client";

import { BarChart3, Brain, CalendarDays, ChartNoAxesCombined, CircleDollarSign, MousePointer2, ShoppingCart, Sparkles, TrendingUp, UsersRound } from "lucide-react";
import Image from "next/image";
import type { Platform } from "@/lib/types";

const brandFiles: Record<string, string> = {
  "Google Ads": "/brands/google-ads.svg",
  "Meta Ads": "/brands/meta.svg",
  Instagram: "/brands/instagram.svg",
  Facebook: "/brands/meta.svg",
  LinkedIn: "/brands/linkedin.svg",
  TikTok: "/brands/tiktok.svg",
  GA4: "/brands/google-analytics.svg",
  "Google Analytics": "/brands/google-analytics.svg",
  YouTube: "/brands/youtube.svg",
  X: "/brands/x.svg",
  Shopify: "/brands/shopify.svg"
};

export function PlatformIcon({ platform, size = 28, className = "" }: { platform: string; size?: number; className?: string }) {
  const normalized = platform === "Google" ? "Google Ads" : platform === "Meta" ? "Meta Ads" : platform === "Instagram Ads" ? "Instagram" : platform === "LinkedIn Ads" ? "LinkedIn" : platform === "TikTok Ads" ? "TikTok" : platform;
  const file = brandFiles[normalized];
  if (file) return <Image src={file} alt={`${platform} logo`} width={size} height={size} className={`object-contain ${className}`} />;
  return <span aria-label={platform} className={`grid place-items-center rounded-lg bg-[#ede9ff] text-[11px] font-bold text-[#6040df] ${className}`} style={{ width: size, height: size }}>{platform.slice(0, 1)}</span>;
}

export function ProductLogo({ compact = false }: { compact?: boolean }) {
  return <div className={`flex items-center ${compact ? "gap-2" : "gap-2.5"}`}><span className={`grid place-items-center rounded-xl bg-gradient-to-br from-[#8968ff] to-[#5e31d9] font-black text-white shadow-[0_6px_14px_rgba(105,64,232,.35)] ${compact ? "h-8 w-8 rounded-lg text-lg" : "h-9 w-9 text-xl"}`}>M</span>{!compact && <span className="text-[18px] font-extrabold tracking-[-.04em] text-white">Marketer<span className="text-[#9a7cff]">OS</span></span>}</div>;
}

export function KpiIcon({ type, tone = "purple" }: { type: string; tone?: string }) {
  const Icon = type === "spend" ? CircleDollarSign : type === "clicks" ? MousePointer2 : type === "conversions" ? ShoppingCart : type === "roas" ? TrendingUp : type === "ctr" ? ChartNoAxesCombined : type === "leads" ? UsersRound : type === "brain" ? Brain : type === "calendar" ? CalendarDays : type === "chart" ? BarChart3 : Sparkles;
  const tones: Record<string, string> = { purple: "bg-[#f0eaff] text-[#6940e8]", blue: "bg-[#e8f2ff] text-[#2384e5]", green: "bg-[#e4f8ed] text-[#13a36b]", orange: "bg-[#fff0df] text-[#f19a25]", teal: "bg-[#e4f7f7] text-[#16a2ad]", pink: "bg-[#ffe9ef] text-[#ed4e72]" };
  return <span className={`grid h-10 w-10 place-items-center rounded-full ${tones[tone] || tones.purple}`}><Icon size={19} strokeWidth={2.2} /></span>;
}
