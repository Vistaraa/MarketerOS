"use client";

import { Bell, CalendarDays, ChevronDown, ChevronLeft, CircleHelp, FileBarChart, Globe2, LayoutDashboard, LogOut, Menu, MoreHorizontal, Network, PenLine, Search, Settings2, Sparkles, Target, User as UserIcon, Users, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { ProductLogo } from "@/components/marketeros-icons";

const navItems = [
  ["Overview", "/overview", LayoutDashboard],
  ["Dashboard", "/dashboard", LayoutDashboard],
  ["Campaigns", "/campaigns", Target],
  ["Analytics", "/analytics", FileBarChart],
  ["AI Insights", "/ai-insights", Sparkles],
  ["Reports", "/reports", FileBarChart],
  ["Integrations", "/integrations", Network],
  ["Content Studio", "/content-studio", PenLine],
  ["Social Media", "/social-media", Globe2],
  ["Ad Manager", "/ad-manager", Target],
  ["Leads", "/leads", Users]
] as const;
const manageItems = [["Clients", "/clients", Users], ["Team", "/team", Users], ["Billing", "/billing", FileBarChart], ["Settings", "/settings", Settings2]] as const;

function activeFor(pathname: string, href: string) {
  if (href === "/overview" || href === "/dashboard") return pathname === href || (pathname === "/" && href === "/overview");
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<{ user?: { name?: string; email?: string; role?: string } } | null>(null);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((response) => response.json())
      .then((payload: { data?: { user?: { name?: string; email?: string; role?: string } } }) => setSession(payload.data || null))
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

  const links = (items: readonly (readonly [string, string, LucideIcon])[]) => items.map(([label, href, Icon]) => (
    <button
      key={href}
      onClick={() => { router.push(href); onClose(); }}
      className={cn(
        "group flex w-full items-center gap-3 rounded-[9px] px-3 py-2.5 text-left text-[13px] font-semibold transition",
        activeFor(pathname, href)
          ? "bg-gradient-to-r from-[#7543ed] to-[#5b39dc] text-white shadow-[0_8px_20px_rgba(92,57,220,.25)]"
          : "text-[#c0c8d9] hover:bg-white/[.08] hover:text-white"
      )}
    >
      <Icon size={17} className={cn(activeFor(pathname, href) ? "text-white" : "text-[#b7c1d5]")} />
      <span>{label}</span>
      {label === "Leads" && <span className="ml-auto rounded-full bg-[#6950e9] px-1.5 py-0.5 text-[9px] font-bold text-white">New</span>}
    </button>
  ));

  const initials = (session?.user?.name || "U")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);

  return (
    <>
      <aside className={cn("fixed inset-y-0 left-0 z-40 flex w-[212px] flex-col bg-[#08152e] px-4 py-5 transition-transform lg:static lg:translate-x-0", open ? "translate-x-0" : "-translate-x-full")}>
        <div className="flex items-center justify-between px-1">
          <ProductLogo />
          <button aria-label="Close navigation" onClick={onClose} className="rounded-lg p-1 text-[#9ca8bd] hover:bg-white/10 lg:hidden">
            <X size={18} />
          </button>
        </div>
        <div className="mt-7 flex-1 overflow-y-auto pr-0.5 [scrollbar-width:none]">
          <nav className="space-y-1">{links(navItems)}</nav>
          <div className="my-5 border-t border-white/10" />
          <nav className="space-y-1">{links(manageItems)}</nav>
        </div>
        <div className="mt-4 rounded-xl border border-white/10 bg-[#102143] p-3 text-center">
          <div className="text-[12px] font-semibold text-white">Subscription</div>
          <button onClick={() => router.push("/billing")} className="mt-3 w-full rounded-lg bg-gradient-to-r from-[#6b35ee] to-[#7b44f3] py-2 text-[11px] font-bold text-white hover:brightness-105">
            Manage Billing
          </button>
        </div>
        <div className="mt-3 rounded-xl border border-white/10 bg-white/[.04] p-2.5">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#d9e4f8] text-[10px] font-extrabold text-[#344c75]">
              {initials}
            </span>
            <div className="min-w-0 flex-1">
              <span className="block truncate text-xs font-bold text-white">
                {session?.user?.name || "Rohan Mehta"}
              </span>
              <span className="block truncate text-[10px] text-[#aab6cb]">
                {session?.user?.role || session?.user?.email || "Agency Admin"}
              </span>
            </div>
            <button
              onClick={handleLogout}
              title="Log out"
              className="rounded-md p-1.5 text-[#aab6cb] hover:bg-white/10 hover:text-[#ff7882]"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>
      {open && <button aria-label="Close navigation overlay" onClick={onClose} className="fixed inset-0 z-30 bg-[#09152d]/55 lg:hidden" />}
    </>
  );
}

export function Topbar({ title, action, breadcrumb = true }: { title: string; action?: React.ReactNode; breadcrumb?: boolean }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  return (
    <>
      <header className="sticky top-0 z-20 flex min-h-[70px] items-center justify-between border-b border-[#e8eaf0] bg-white/95 px-4 backdrop-blur md:px-7">
        <div className="flex min-w-0 items-center gap-3">
          <button aria-label="Open navigation" onClick={() => setNavOpen(true)} className="rounded-lg p-2 text-[#4e5b73] hover:bg-[#f4f5f9] lg:hidden">
            <Menu size={19} />
          </button>
          {breadcrumb ? (
            <div className="hidden items-center gap-2 text-sm md:flex">
              <span className="text-[#7e8a9f]">Home</span>
              <ChevronLeft size={14} className="rotate-180 text-[#b0b8c6]" />
              <span className="font-bold text-[#111a2e]">{title}</span>
            </div>
          ) : (
            <div className="text-xl font-extrabold tracking-[-.05em] text-[#10192d] md:text-[22px]">{title}</div>
          )}
          <div className="truncate text-sm font-bold text-[#10192d] md:hidden">{title}</div>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <div className="relative hidden w-[245px] xl:block">
            <Search size={15} className="absolute left-3 top-2.5 text-[#8591a6]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search anything..."
              className="h-9 w-full rounded-lg border border-[#e3e6ed] bg-white pl-9 pr-8 text-xs outline-none focus:border-[#a594f6] focus:ring-4 focus:ring-[#f0edff]"
            />
            {search && (
              <button aria-label="Clear search" onClick={() => setSearch("")} className="absolute right-2 top-2 text-[#8791a4]">
                <X size={14} />
              </button>
            )}
          </div>
          <button className="hidden h-9 items-center gap-2 rounded-lg border border-[#e0e4eb] bg-white px-3 text-xs font-bold text-[#34415b] sm:flex">
            <CalendarDays size={14} />May 1 – May 31, 2024<ChevronDown size={13} />
          </button>
          <button aria-label="Help" className="hidden rounded-lg border border-[#e0e4eb] p-2 text-[#526079] sm:block">
            <CircleHelp size={17} />
          </button>
          <div className="relative">
            <button aria-label="Notifications" onClick={() => setMenuOpen((value) => !value)} className="relative rounded-lg border border-[#e0e4eb] p-2 text-[#526079]">
              <Bell size={17} />
              <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-[#ef4b57] text-[9px] font-bold text-white">3</span>
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-11 z-30 w-72 rounded-xl border border-[#e3e6ed] bg-white p-3 shadow-[0_12px_35px_rgba(16,25,45,.14)]">
                <div className="flex items-center justify-between px-2">
                  <span className="text-sm font-bold text-[#111a2e]">Notifications</span>
                  <span className="text-[10px] text-[#6940e8]">Mark all read</span>
                </div>
                <div className="mt-2 space-y-1">
                  <div className="rounded-lg bg-[#f5f1ff] p-3 text-xs font-semibold">Google Ads ROAS improved by 16.7%</div>
                  <div className="rounded-lg p-3 text-xs font-semibold hover:bg-[#f7f8fb]">TikTok integration is ready to connect</div>
                </div>
              </div>
            )}
          </div>
          {action}
        </div>
      </header>
      {navOpen && <div className="lg:hidden"><Sidebar open={navOpen} onClose={() => setNavOpen(false)} /></div>}
    </>
  );
}

function OverviewAwareTopbar({ title, action, breadcrumb = true }: { title: string; action?: React.ReactNode; breadcrumb?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [results, setResults] = useState<{ type: string; name: string; href: string }[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [notifications, setNotifications] = useState<{ id: string; title: string; message: string; link?: string; read?: boolean }[]>([]);
  const [session, setSession] = useState<{ user?: { name?: string; email?: string; role?: string } } | null>(null);

  useEffect(() => {
    if (!search.trim()) { setResults([]); return; }
    const timer = window.setTimeout(() => {
      fetch(`/api/v1/search?search=${encodeURIComponent(search.trim())}`)
        .then((response) => response.json())
        .then((payload: { data?: { items?: { type: string; name: string; href: string }[] } }) => setResults(payload.data?.items || []))
        .catch(() => setResults([]));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!menuOpen) return;
    fetch("/api/v1/notifications")
      .then((response) => response.json())
      .then((payload: { data?: { items?: { id: string; title: string; message: string; link?: string; read?: boolean }[] } }) => setNotifications(payload.data?.items || []))
      .catch(() => setNotifications([]));
  }, [menuOpen]);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((response) => response.json())
      .then((payload: { data?: { user?: { name?: string; email?: string; role?: string } } }) => setSession(payload.data || null))
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

  const submitSearch = () => {
    if (results[0]) router.push(results[0].href);
    else if (search.trim()) router.push(`/search?q=${encodeURIComponent(search.trim())}`);
    setSearchOpen(false);
  };

  const initials = (session?.user?.name || "U")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);

  return (
    <>
      <header className="sticky top-0 z-20 flex min-h-[70px] items-center justify-between border-b border-[#e8eaf0] bg-white/95 px-4 backdrop-blur md:px-7">
        <div className="flex min-w-0 items-center gap-3">
          <button aria-label="Open navigation" onClick={() => setNavOpen(true)} className="rounded-lg p-2 text-[#4e5b73] hover:bg-[#f4f5f9] lg:hidden">
            <Menu size={19} />
          </button>
          {breadcrumb ? (
            <div className="hidden items-center gap-2 text-sm md:flex">
              <span className="text-[#7e8a9f]">Home</span>
              <ChevronLeft size={14} className="rotate-180 text-[#b0b8c6]" />
              <span className="font-bold text-[#111a2e]">{title}</span>
            </div>
          ) : (
            <div className="text-xl font-extrabold tracking-[-.05em] text-[#10192d] md:text-[22px]">{title}</div>
          )}
          <div className="truncate text-sm font-bold text-[#10192d] md:hidden">{title}</div>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <div className="relative hidden w-[245px] xl:block">
            <Search size={15} className="absolute left-3 top-2.5 text-[#8591a6]" />
            <input
              value={search}
              onFocus={() => setSearchOpen(true)}
              onChange={(event) => { setSearch(event.target.value); setSearchOpen(true); }}
              onKeyDown={(event) => { if (event.key === "Enter") submitSearch(); }}
              placeholder="Search anything..."
              className="h-9 w-full rounded-lg border border-[#e3e6ed] bg-white pl-9 pr-8 text-xs outline-none focus:border-[#a594f6] focus:ring-4 focus:ring-[#f0edff]"
            />
            {search && (
              <button aria-label="Clear search" onClick={() => setSearch("")} className="absolute right-2 top-2 text-[#8791a4]">
                <X size={14} />
              </button>
            )}
            {searchOpen && search.trim() && (
              <div className="absolute left-0 right-0 top-11 z-30 rounded-xl border border-[#e3e6ed] bg-white p-2 shadow-[0_12px_35px_rgba(16,25,45,.14)]">
                {results.length ? (
                  results.slice(0, 5).map((result) => (
                    <button key={`${result.type}-${result.href}`} onClick={() => { router.push(result.href); setSearchOpen(false); }} className="flex w-full items-center gap-2 rounded-lg p-2 text-left hover:bg-[#f7f8fb]">
                      <span className="rounded bg-[#f0eaff] px-1.5 py-1 text-[9px] font-bold text-[#6940e8]">{result.type}</span>
                      <span className="truncate text-xs font-semibold text-[#24324b]">{result.name}</span>
                    </button>
                  ))
                ) : (
                  <div className="p-2 text-xs text-[#8490a4]">No results yet. Press Enter to view search.</div>
                )}
              </div>
            )}
          </div>
          <button onClick={() => router.push(pathname.startsWith("/overview") ? "/overview#overview-filters" : "/overview")} className="hidden h-9 items-center gap-2 rounded-lg border border-[#e0e4eb] bg-white px-3 text-xs font-bold text-[#34415b] sm:flex">
            <CalendarDays size={14} />Date range<ChevronDown size={13} />
          </button>
          <button aria-label="Help" onClick={() => router.push("/settings")} className="hidden rounded-lg border border-[#e0e4eb] p-2 text-[#526079] sm:block">
            <CircleHelp size={17} />
          </button>
          <div className="relative">
            <button aria-label="Notifications" onClick={() => setMenuOpen((value) => !value)} className="relative rounded-lg border border-[#e0e4eb] p-2 text-[#526079]">
              <Bell size={17} />
              <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-[#ef4b57] text-[9px] font-bold text-white">
                {notifications.filter((item) => !item.read).length}
              </span>
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-11 z-30 w-72 rounded-xl border border-[#e3e6ed] bg-white p-3 shadow-[0_12px_35px_rgba(16,25,45,.14)]">
                <div className="flex items-center justify-between px-2">
                  <span className="text-sm font-bold text-[#111a2e]">Notifications</span>
                  <button onClick={() => router.push("/notifications")} className="text-[10px] font-bold text-[#6940e8]">View all</button>
                </div>
                <div className="mt-2 space-y-1">
                  {notifications.length ? (
                    notifications.map((notification) => (
                      <button key={notification.id} onClick={() => notification.link && router.push(notification.link)} className="w-full rounded-lg p-3 text-left text-xs font-semibold hover:bg-[#f7f8fb]">
                        {notification.title}
                        <span className="mt-1 block text-[10px] font-normal text-[#8490a4]">{notification.message}</span>
                      </button>
                    ))
                  ) : (
                    <div className="p-3 text-xs text-[#8490a4]">No notifications yet.</div>
                  )}
                </div>
              </div>
            )}
          </div>
          {action}

          {/* User Profile Menu */}
          <div className="relative hidden md:block">
            <button
              onClick={() => setUserDropdownOpen((val) => !val)}
              className="flex items-center gap-2 border-l border-[#e5e8ef] pl-3 text-left hover:opacity-80"
            >
              <span className="grid h-8 w-8 place-items-center rounded-full bg-[#d9e4f8] text-[10px] font-extrabold text-[#344c75]">
                {initials}
              </span>
              <span>
                <span className="block text-xs font-bold text-[#111a2e]">
                  {session?.user?.name || "Rohan Mehta"}
                </span>
                <span className="block text-[10px] text-[#7f8ba0]">
                  {session?.user?.role || session?.user?.email || "Agency Admin"}
                </span>
              </span>
              <ChevronDown size={14} className="text-[#748198]" />
            </button>

            {userDropdownOpen && (
              <div className="absolute right-0 top-11 z-30 w-56 rounded-xl border border-[#e3e6ed] bg-white p-2 shadow-[0_12px_35px_rgba(16,25,45,.14)]">
                <div className="border-b border-[#edf0f4] px-3 py-2">
                  <p className="text-xs font-bold text-[#111a2e]">{session?.user?.name || "Rohan Mehta"}</p>
                  <p className="text-[10px] text-[#7f8ba0]">{session?.user?.email || "rohan@acme.com"}</p>
                  <span className="mt-1 inline-block rounded bg-[#f0eaff] px-1.5 py-0.5 text-[9px] font-bold text-[#6940e8]">
                    {session?.user?.role || "OWNER"}
                  </span>
                </div>
                <div className="mt-1 space-y-0.5">
                  <button
                    onClick={() => { router.push("/settings"); setUserDropdownOpen(false); }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-[#404e68] hover:bg-[#f7f8fb]"
                  >
                    <Settings2 size={14} /> Workspace Settings
                  </button>
                  <button
                    onClick={() => { router.push("/team"); setUserDropdownOpen(false); }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-[#404e68] hover:bg-[#f7f8fb]"
                  >
                    <Users size={14} /> Team & Roles
                  </button>
                  <button
                    onClick={() => { router.push("/billing"); setUserDropdownOpen(false); }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-[#404e68] hover:bg-[#f7f8fb]"
                  >
                    <FileBarChart size={14} /> Billing & Plans
                  </button>
                </div>
                <div className="mt-1 border-t border-[#edf0f4] pt-1">
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-[#eb505c] hover:bg-[#fff5f5]"
                  >
                    <LogOut size={14} /> Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
      {navOpen && <div className="lg:hidden"><Sidebar open={navOpen} onClose={() => setNavOpen(false)} /></div>}
    </>
  );
}

export function AppShell({ children, title, action, breadcrumb = true }: { children: React.ReactNode; title: string; action?: React.ReactNode; breadcrumb?: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return <div className="flex min-h-screen bg-[#fafbfe]"><Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} /><div className="min-w-0 flex-1"><OverviewAwareTopbar title={title} action={action} breadcrumb={breadcrumb} /><main className="mx-auto max-w-[1536px] px-4 py-5 sm:px-6 lg:px-7 xl:px-5">{children}</main></div></div>;
}

export function PageHeading({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return <div className="mb-5 flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-[26px] font-extrabold tracking-[-.055em] text-[#10192d] sm:text-[28px]">{title}</h1>{description && <p className="mt-1 text-[13px] text-[#69758c]">{description}</p>}</div>{action}</div>;
}

export function Card({ children, className = "", flush = false }: { children: React.ReactNode; className?: string; flush?: boolean }) {
  return <section className={cn("rounded-xl border border-[#e7eaf0] bg-white shadow-[0_2px_8px_rgba(18,29,54,.025)]", flush ? "overflow-hidden" : "p-4 sm:p-5", className)}>{children}</section>;
}

export function StatusBadge({ status }: { status: string }) {
  const success = ["Active", "Connected", "Published", "Converted", "Qualified", "Paid", "Ready"].includes(status);
  const warning = ["Paused", "Scheduled", "Proposal sent", "Pending", "In review"].includes(status);
  const info = ["Contacted", "Draft"].includes(status);
  return <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold", success ? "bg-[#e6f8ee] text-[#14975f]" : warning ? "bg-[#fff3df] text-[#c87913]" : info ? "bg-[#e8f2ff] text-[#247dd0]" : "bg-[#f0f2f6] text-[#718097]")}><span className={cn("h-1.5 w-1.5 rounded-full", success ? "bg-[#21b26f]" : warning ? "bg-[#eea22a]" : info ? "bg-[#3e8de7]" : "bg-[#aab3c1]")} />{status}</span>;
}

export function Tabs({ items, active, onChange }: { items: string[]; active: string; onChange?: (value: string) => void }) {
  return <div className="flex gap-5 overflow-x-auto border-b border-[#e8ebf0] [scrollbar-width:none]">{items.map((item) => <button key={item} onClick={() => onChange?.(item)} className={cn("relative whitespace-nowrap pb-3 text-xs font-semibold", active === item ? "text-[#5f3bdb]" : "text-[#6d7890] hover:text-[#111a2e]")}>{item}{active === item && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-[#693fe5]" />}</button>)}</div>;
}

export function Skeleton({ className = "" }: { className?: string }) { return <div className={cn("animate-pulse rounded-lg bg-[#eef0f5]", className)} />; }
