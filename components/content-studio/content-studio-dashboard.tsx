"use client";

import React from "react";
import { ContentStudioProvider, useContentStudio } from "./context/content-studio-context";
import { CalendarPage } from "./subpages/calendar-page";
import { ContentLibraryPage } from "./subpages/content-library-page";
import { TemplatesPage } from "./subpages/templates-page";
import { MediaLibraryPage } from "./subpages/media-library-page";
import { HashtagsPage } from "./subpages/hashtags-page";
import { SettingsPage } from "./subpages/settings-page";
import { ContentEditorModal } from "./components/content-editor-modal";
import { SocialConnectModal } from "./components/social-connect-modal";
import { ToastContainer } from "./components/common-ui";

// Re-export Platform Icons for backwards compatibility
export function InstagramIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
    </svg>
  );
}

export function FacebookIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

export function LinkedinIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
    </svg>
  );
}

export function TiktokIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 1 1-5.2-1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V6.03a6.28 6.28 0 0 0-1-.08 6.27 6.27 0 1 0 6.27 6.27V8.92a8.16 8.16 0 0 0 4.96 1.66v-3.89a4.85 4.85 0 0 1-1-.07z"/>
    </svg>
  );
}

export function TwitterXIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  );
}

function SubPageRenderer() {
  const { activeTab } = useContentStudio();

  switch (activeTab) {
    case "Content Calendar":
      return <CalendarPage />;
    case "Content Library":
      return <ContentLibraryPage />;
    case "Templates":
      return <TemplatesPage />;
    case "Media Library":
      return <MediaLibraryPage />;
    case "Hashtags":
      return <HashtagsPage />;
    case "Settings":
      return <SettingsPage />;
    default:
      return <CalendarPage />;
  }
}

export function ContentStudioDashboard({ initialTab = "Content Calendar" }: { initialTab?: string }) {
  return (
    <ContentStudioProvider>
      <ContentStudioInner initialTab={initialTab} />
    </ContentStudioProvider>
  );
}

function ContentStudioInner({ initialTab }: { initialTab: string }) {
  const {
    activeTab,
    setActiveTab,
    isConnectModalOpen,
    closeConnectModal,
    connectModalDefaultPlatform,
    refreshSocialAccounts
  } = useContentStudio();

  React.useEffect(() => {
    if (initialTab && initialTab !== activeTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  return (
    <div className="w-full space-y-5 text-zinc-900 dark:text-zinc-100 font-sans">
      <SubPageRenderer />
      <ContentEditorModal />
      <SocialConnectModal
        open={isConnectModalOpen}
        onClose={closeConnectModal}
        onSuccess={refreshSocialAccounts}
        defaultPlatform={connectModalDefaultPlatform}
      />
      <ToastContainer />
    </div>
  );
}
