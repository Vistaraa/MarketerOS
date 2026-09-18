"use client";

import React from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface KpiCardProps {
  title: string;
  value: string | number;
  change?: string | number;
  trend?: "up" | "down" | "neutral";
  period?: string;
  icon?: LucideIcon;
  iconBg?: string;
  iconColor?: string;
  badge?: string;
  subtitle?: string;
  loading?: boolean;
  className?: string;
  onClick?: () => void;
}

export function KpiCard({
  title,
  value,
  change,
  trend,
  period = "vs previous period",
  icon: Icon,
  iconBg = "bg-zinc-100 dark:bg-zinc-800",
  iconColor = "text-zinc-700 dark:text-zinc-300",
  badge,
  subtitle,
  loading = false,
  className,
  onClick
}: KpiCardProps) {
  if (loading) {
    return (
      <div
        className={cn(
          "rounded-xl border border-zinc-200/90 bg-white p-4 shadow-2xs dark:border-zinc-800 dark:bg-zinc-950/60 animate-pulse",
          className
        )}
      >
        <div className="flex items-center justify-between">
          <div className="h-3 w-20 rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-8 w-8 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        </div>
        <div className="mt-3 h-6 w-28 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="mt-2 h-3 w-36 rounded bg-zinc-100 dark:bg-zinc-800/60" />
      </div>
    );
  }

  const changeStr = change !== undefined ? String(change) : undefined;
  const isZero =
    !changeStr ||
    changeStr === "0.0%" ||
    changeStr === "0%" ||
    changeStr === "0" ||
    changeStr === "+0.0%" ||
    changeStr === "0.00x";

  const resolvedTrend =
    trend ||
    (isZero
      ? "neutral"
      : changeStr?.startsWith("-")
      ? "down"
      : "up");

  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative flex flex-col justify-between rounded-xl border border-zinc-200/90 bg-white p-4 sm:p-4.5 shadow-2xs transition-all duration-200 hover:border-zinc-300 hover:shadow-xs dark:border-zinc-800 dark:bg-zinc-950/60 dark:hover:border-zinc-700",
        onClick && "cursor-pointer active:scale-[0.99]",
        className
      )}
    >
      {/* Card Header: Title, Optional Badge & Themed Icon */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="truncate text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              {title}
            </span>
            {badge && (
              <span className="rounded-full bg-zinc-100 px-2 py-0.2 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                {badge}
              </span>
            )}
          </div>
        </div>

        {Icon && (
          <div
            className={cn(
              "grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-transform duration-200 group-hover:scale-105 sm:h-9 sm:w-9",
              iconBg,
              iconColor
            )}
          >
            <Icon size={16} className="sm:h-4 sm:w-4" />
          </div>
        )}
      </div>

      {/* Main Metric Value */}
      <div className="mt-2.5">
        <div className="truncate text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl dark:text-zinc-100">
          {value}
        </div>

        {subtitle && (
          <p className="mt-0.5 text-xs text-zinc-400 truncate dark:text-zinc-500">
            {subtitle}
          </p>
        )}
      </div>

      {/* Trend & Context Period */}
      {changeStr !== undefined && (
        <div className="mt-2.5 flex items-center gap-1.5 text-xs flex-wrap">
          {isZero ? (
            <span className="inline-flex items-center gap-0.5 font-medium text-zinc-400 dark:text-zinc-500">
              <Minus size={11} />
              <span>0.0%</span>
            </span>
          ) : (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded px-1.5 py-0.2 text-xs font-semibold",
                resolvedTrend === "down"
                  ? "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400"
                  : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
              )}
            >
              {resolvedTrend === "down" ? (
                <ArrowDownRight size={13} className="stroke-[2.5]" />
              ) : (
                <ArrowUpRight size={13} className="stroke-[2.5]" />
              )}
              <span>{changeStr}</span>
            </span>
          )}

          {period && (
            <span className="text-[11px] text-zinc-400 truncate dark:text-zinc-500">
              {period}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export function KpiGrid({
  children,
  columns = 4,
  className
}: {
  children: React.ReactNode;
  columns?: 2 | 3 | 4 | 5;
  className?: string;
}) {
  const colClasses = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
    5: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5"
  };

  return (
    <div
      className={cn(
        "grid gap-3 sm:gap-4",
        colClasses[columns] || colClasses[4],
        className
      )}
    >
      {children}
    </div>
  );
}

export function MiniKpiStat({
  label,
  value,
  change,
  icon: Icon,
  color = "text-zinc-600 bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-400",
  trend
}: {
  label: string;
  value: string | number;
  change?: string;
  icon?: LucideIcon;
  color?: string;
  trend?: "up" | "down" | "neutral";
}) {
  return (
    <div className="flex flex-col justify-between rounded-lg border border-zinc-100 bg-white p-2.5 transition hover:border-zinc-200 dark:border-zinc-800/80 dark:bg-zinc-950/50 dark:hover:border-zinc-700">
      <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
        {Icon && (
          <div className={cn("grid h-5 w-5 place-items-center rounded", color)}>
            <Icon size={12} />
          </div>
        )}
        <span className="truncate font-medium">{label}</span>
      </div>
      <div className="mt-1.5 flex items-baseline justify-between gap-1">
        <span className="text-base font-bold text-zinc-900 dark:text-zinc-100">{value}</span>
        {change && (
          <span
            className={cn(
              "text-[10px] font-semibold",
              trend === "down"
                ? "text-rose-500"
                : trend === "up"
                ? "text-emerald-500"
                : "text-zinc-400"
            )}
          >
            {change}
          </span>
        )}
      </div>
    </div>
  );
}
