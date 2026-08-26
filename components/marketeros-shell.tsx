"use client";

import {
  ArrowRight,
  Bell,
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Command,
  FileBarChart,
  Globe2,
  HelpCircle,
  Keyboard,
  Layers,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  MoreHorizontal,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  PenLine,
  Plus,
  Rocket,
  Search,
  Settings2,
  Shield,
  Sparkles,
  Sun,
  Target,
  User as UserIcon,
  Users,
  X,
  Zap,
  Youtube
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

// Navigation Groups
const mainNavItems = [
  { label: "Overview", href: "/", icon: LayoutDashboard },
  { label: "Campaigns", href: "/campaigns", icon: Target },
  { label: "Integrations", href: "/integrations", icon: Network },
  { label: "YouTube Brand", href: "/youtube", icon: Youtube },
  { label: "YouTube Guide", href: "/youtube/guide", icon: Youtube, badge: "Docs" },
  { label: "Leads", href: "/leads", icon: Users, badge: "New" },
  { label: "Analytics", href: "/analytics", icon: FileBarChart },
  { label: "Reports", href: "/reports", icon: FileBarChart }
] as const;

const workspaceNavItems = [
  { label: "Content Studio", href: "/content-studio", icon: PenLine },
  { label: "Automation", href: "/automation", icon: Zap },
  { label: "Clients", href: "/clients", icon: Users },
  { label: "Team", href: "/team", icon: Shield }
] as const;

const systemNavItems = [
  { label: "Settings", href: "/settings", icon: Settings2 },
  { label: "Billing", href: "/billing", icon: FileBarChart }
] as const;

function isRouteActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/" || pathname === "/overview" || pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/* =========================================================================
   COMMAND PALETTE (Cmd+K / Ctrl+K)
   ========================================================================= */
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const allItems = useMemo(
    () => [
      { category: "Navigation", label: "Dashboard / Overview", href: "/", icon: LayoutDashboard },
      { category: "Navigation", label: "Campaigns Management", href: "/campaigns", icon: Target },
      { category: "Navigation", label: "Create New Campaign", href: "/campaigns/create", icon: Plus },
      { category: "Navigation", label: "Platform Integrations", href: "/integrations", icon: Network },
      { category: "Navigation", label: "YouTube Brand Channel", href: "/youtube", icon: Youtube },
      { category: "Navigation", label: "YouTube Setup Guide", href: "/youtube/guide", icon: Youtube },
      { category: "Navigation", label: "Leads Pipeline", href: "/leads", icon: Users },
      { category: "Navigation", label: "Analytics Overview", href: "/analytics", icon: FileBarChart },
      { category: "Navigation", label: "Marketing Reports", href: "/reports", icon: FileBarChart },
      { category: "Navigation", label: "Workspace Settings", href: "/settings", icon: Settings2 },
      { category: "Navigation", label: "Billing & Plans", href: "/billing", icon: FileBarChart },
      { category: "Actions", label: "Launch Multi-Channel Campaign", href: "/campaigns/create", icon: Rocket },
      { category: "Actions", label: "Connect Ad Accounts", href: "/integrations", icon: Network }
    ],
    []
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return allItems;
    return allItems.filter(
      (item) =>
        item.label.toLowerCase().includes(query.toLowerCase()) ||
        item.category.toLowerCase().includes(query.toLowerCase())
    );
  }, [allItems, query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onClose();
      }
      if (e.key === "Escape" && open) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-20 backdrop-blur-xs sm:p-6 sm:pt-28">
      <div
        className="w-full max-w-xl overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl transition-all dark:border-zinc-800 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
          <Search size={16} className="text-zinc-400" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search pages…"
            className="ml-3 flex-1 text-xs font-medium text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100"
          />
          <kbd className="hidden rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[10px] font-mono text-zinc-500 sm:inline-block dark:border-zinc-700 dark:bg-zinc-800">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 text-xs">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-zinc-400">No matching commands or pages found.</div>
          ) : (
            <div className="space-y-0.5">
              {filtered.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={`${item.category}-${item.href}-${item.label}`}
                    onClick={() => {
                      router.push(item.href);
                      onClose();
                    }}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="grid h-6 w-6 place-items-center rounded bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                        <Icon size={14} />
                      </div>
                      <span className="font-medium text-xs">{item.label}</span>
                    </div>
                    <span className="text-[10px] text-zinc-400">{item.category}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <div className="fixed inset-0 -z-10" onClick={onClose} />
    </div>
  );
}

/* =========================================================================
   MODERN COLLAPSIBLE SIDEBAR (Midday Style)
   ========================================================================= */
export function ModernSidebar({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onMobileClose,
  onOpenCommand
}: {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
  onOpenCommand: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<{ user?: { name?: string; email?: string; role?: string } } | null>(null);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((payload: { data?: { user?: { name?: string; email?: string; role?: string } } }) =>
        setSession(payload.data || null)
      )
      .catch(() => setSession(null));
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/auth/login");
      router.refresh();
    }
  };

  const renderNavSection = (items: readonly { label: string; href: string; icon: LucideIcon; badge?: string }[]) => (
    <div className="space-y-0.5">
      {items.map(({ label, href, icon: Icon, badge }) => {
        const active = isRouteActive(pathname, href);
        return (
          <button
            key={href}
            onClick={() => {
              router.push(href);
              onMobileClose();
            }}
            title={collapsed ? label : undefined}
            className={cn(
              "group relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-xs transition-all",
              active
                ? "bg-zinc-100 font-semibold text-zinc-900 dark:bg-zinc-800/80 dark:text-zinc-100"
                : "font-medium text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
            )}
          >
            <Icon
              size={16}
              className={cn("shrink-0 transition-colors", active ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400 group-hover:text-zinc-600 dark:text-zinc-500 dark:group-hover:text-zinc-300")}
            />
            {!collapsed && (
              <>
                <span className="truncate">{label}</span>
                {badge && (
                  <span className="ml-auto rounded bg-zinc-200/80 px-1 py-0.2 text-[9px] font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    {badge}
                  </span>
                )}
              </>
            )}
          </button>
        );
      })}
    </div>
  );

  const initials = (session?.user?.name || "HM")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2);

  return (
    <>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex h-screen shrink-0 flex-col border-r border-zinc-200/80 bg-white p-3 text-zinc-900 transition-all duration-300 ease-in-out dark:border-zinc-800 dark:bg-zinc-950 lg:sticky lg:top-0 lg:translate-x-0",
          collapsed ? "w-[64px]" : "w-[220px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Workspace Switcher Header */}
        <div className="flex items-center justify-between px-1 py-1">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-zinc-900 font-bold text-white text-xs dark:bg-zinc-100 dark:text-zinc-900">
              M
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-bold text-zinc-900 dark:text-zinc-100">MarketerOS</div>
                <div className="flex items-center gap-1 text-[10px] text-zinc-400">
                  <span className="font-mono">PRO</span>
                  <span>·</span>
                  <span className="truncate">Workspace</span>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={onMobileClose}
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 lg:hidden dark:hover:bg-zinc-800"
          >
            <X size={16} />
          </button>
        </div>

        {/* Command Search Trigger Button */}
        <div className="mt-3">
          <button
            onClick={onOpenCommand}
            className={cn(
              "flex w-full items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50/70 p-1.5 text-xs text-zinc-500 transition hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-zinc-700",
              collapsed ? "justify-center" : "justify-between px-2.5"
            )}
            title="Quick Search (⌘K)"
          >
            <div className="flex items-center gap-2">
              <Search size={13} className="shrink-0 text-zinc-400" />
              {!collapsed && <span className="text-[11px]">Search…</span>}
            </div>
            {!collapsed && (
              <kbd className="rounded border border-zinc-200 bg-white px-1 py-0.2 text-[9px] font-mono text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800">⌘K</kbd>
            )}
          </button>
        </div>

        {/* Navigation Sections */}
        <div className="mt-4 flex-1 space-y-4 overflow-y-auto [scrollbar-width:none]">
          <div>
            {!collapsed && (
              <div className="mb-1.5 px-2 text-[10px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                Main
              </div>
            )}
            {renderNavSection(mainNavItems)}
          </div>

          <div>
            {!collapsed && (
              <div className="mb-1.5 px-2 text-[10px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                Workspace
              </div>
            )}
            {renderNavSection(workspaceNavItems)}
          </div>

          <div>
            {!collapsed && (
              <div className="mb-1.5 px-2 text-[10px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                Settings
              </div>
            )}
            {renderNavSection(systemNavItems)}
          </div>
        </div>

        {/* Footer: User Profile & Collapse Button */}
        <div className="mt-auto space-y-1.5 border-t border-zinc-200/80 pt-3 dark:border-zinc-800">
          {/* User profile card */}
          <div
            className={cn(
              "flex items-center rounded-lg p-1.5 text-xs transition hover:bg-zinc-50 dark:hover:bg-zinc-900",
              collapsed ? "justify-center" : "gap-2"
            )}
          >
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-zinc-200 font-bold text-zinc-800 text-[10px] dark:bg-zinc-800 dark:text-zinc-200">
              {initials}
            </span>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-zinc-900 text-xs dark:text-zinc-100">
                  {session?.user?.name || "Heet Patel"}
                </span>
                <span className="block truncate text-[10px] text-zinc-400">
                  {session?.user?.email || "Owner"}
                </span>
              </div>
            )}
            {!collapsed && (
              <button
                onClick={handleLogout}
                title="Log out"
                className="rounded p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                <LogOut size={13} />
              </button>
            )}
          </div>

          {/* Desktop Collapse Toggle */}
          <button
            onClick={onToggleCollapse}
            className={cn(
              "hidden w-full items-center gap-2 rounded-lg border border-zinc-200/80 p-1.5 text-xs text-zinc-500 transition hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-800 dark:hover:bg-zinc-900 lg:flex",
              collapsed ? "justify-center" : "justify-between px-2.5"
            )}
            title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {!collapsed && <span className="text-[11px] font-medium">Collapse</span>}
            {collapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
          </button>
        </div>
      </aside>

      {mobileOpen && (
        <div
          onClick={onMobileClose}
          className="fixed inset-0 z-30 bg-black/30 backdrop-blur-2xs lg:hidden"
        />
      )}
    </>
  );
}

/* =========================================================================
   MODERN TOPBAR & COMMAND BAR
   ========================================================================= */
export function ModernTopbar({
  title,
  action,
  onOpenCommand,
  onMobileMenuOpen
}: {
  title: string;
  action?: React.ReactNode;
  onOpenCommand: () => void;
  onMobileMenuOpen: () => void;
}) {
  const router = useRouter();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const isDarkMode =
      localStorage.theme === "dark" ||
      (!("theme" in localStorage) && window.matchMedia("(prefers-color-scheme: dark)").matches);
    setIsDark(isDarkMode);
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove("dark");
      localStorage.theme = "light";
      setIsDark(false);
    } else {
      document.documentElement.classList.add("dark");
      localStorage.theme = "dark";
      setIsDark(true);
    }
  };

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-zinc-200/80 bg-white/95 px-4 backdrop-blur-sm sm:px-6 dark:border-zinc-800 dark:bg-zinc-950/95">
      {/* Left: Mobile menu & Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMobileMenuOpen}
          className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 lg:hidden dark:hover:bg-zinc-800"
        >
          <Menu size={16} />
        </button>

        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
          <span className="hover:text-zinc-900 cursor-pointer transition dark:hover:text-zinc-100" onClick={() => router.push("/")}>
            Dashboard
          </span>
          <ChevronRight size={12} className="text-zinc-300 dark:text-zinc-600" />
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">{title}</span>
        </div>
      </div>

      {/* Right: Quick actions, Date selector, Theme Switcher, Notifications */}
      <div className="flex items-center gap-2">
        {/* Date Selector Pill */}
        <button className="hidden h-7 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 text-xs font-medium text-zinc-600 shadow-sm hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 md:flex">
          <Calendar size={12} className="text-zinc-400" />
          <span>Last 30 Days</span>
        </button>

        {/* Dark / Light Mode Toggle Button */}
        <button
          onClick={toggleTheme}
          title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          className="relative grid h-7 w-7 place-items-center rounded-lg border border-zinc-200 bg-white text-zinc-600 shadow-sm hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          {isDark ? <Sun size={13} /> : <Moon size={13} />}
        </button>

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setNotificationsOpen((prev) => !prev)}
            className="relative grid h-7 w-7 place-items-center rounded-lg border border-zinc-200 bg-white text-zinc-600 shadow-sm hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
          >
            <Bell size={13} />
            <span className="absolute -right-0.5 -top-0.5 grid h-3 w-3 place-items-center rounded-full bg-zinc-900 text-[7px] font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
              2
            </span>
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 top-9 z-30 w-72 rounded-xl border border-zinc-200 bg-white p-3 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-2 dark:border-zinc-800">
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Notifications</span>
                <span className="text-[10px] font-medium text-zinc-500 cursor-pointer hover:underline">Mark all read</span>
              </div>
              <div className="mt-2 space-y-1 text-xs">
                <div className="rounded-lg bg-zinc-50 p-2 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  Google Ads campaign synced successfully.
                </div>
                <div className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800">
                  Instagram API token refreshed.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Page Primary Action Button */}
        {action}
      </div>
    </header>
  );
}

/* =========================================================================
   UNIFIED APP SHELL
   ========================================================================= */
export function AppShell({
  children,
  title = "Overview",
  action
}: {
  children: React.ReactNode;
  title?: string;
  action?: React.ReactNode;
  breadcrumb?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);

  // Global Keyboard shortcut (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#fafafa] text-zinc-900 antialiased font-sans dark:bg-zinc-950 dark:text-zinc-100">
      <ModernSidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((prev) => !prev)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        onOpenCommand={() => setCommandOpen(true)}
      />

      <div className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
        <ModernTopbar
          title={title}
          action={action}
          onOpenCommand={() => setCommandOpen(true)}
          onMobileMenuOpen={() => setMobileOpen(true)}
        />

        <main className="flex-1 overflow-y-auto p-3 sm:p-5 lg:p-6">
          <div className="mx-auto max-w-[1550px] w-full pb-16">{children}</div>
        </main>
      </div>

      <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} />
    </div>
  );
}

/* =========================================================================
   REUSABLE UI PRIMITIVES & COMPONENTS
   ========================================================================= */
export function Card({
  children,
  className,
  flush = false
}: {
  children: React.ReactNode;
  className?: string;
  flush?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-zinc-200/90 bg-white shadow-2xs transition-all hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950/60 dark:hover:border-zinc-700",
        flush ? "" : "p-5",
        className
      )}
    >
      {children}
    </div>
  );
}

export function PageHeading({
  title,
  description,
  action
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl dark:text-zinc-100">{title}</h1>
        {description && <p className="mt-1 text-xs text-zinc-500 sm:text-sm dark:text-zinc-400">{description}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const isOk = status === "Active" || status === "Connected" || status === "Ready";
  const isPaused = status === "Paused" || status === "Needs attention" || status === "Draft";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium tracking-tight",
        isOk && "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
        isPaused && "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
        !isOk && !isPaused && "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          isOk && "bg-emerald-500",
          isPaused && "bg-amber-500",
          !isOk && !isPaused && "bg-zinc-400"
        )}
      />
      {status}
    </span>
  );
}

export function Tabs({
  items,
  active,
  onChange
}: {
  items: readonly string[];
  active: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-zinc-200 dark:border-zinc-800">
      {items.map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={cn(
            "border-b-2 px-3 pb-2.5 text-xs font-semibold transition-colors whitespace-nowrap",
            active === tab
              ? "border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100"
              : "border-transparent text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
          )}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800", className)} />;
}
