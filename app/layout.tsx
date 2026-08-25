import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MarketerOS · Marketing Operating System",
  description: "One workspace for your entire marketing operation."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (_) {}
            `
          }}
        />
      </head>
      <body className="bg-background text-foreground antialiased selection:bg-zinc-900 selection:text-white dark:selection:bg-zinc-100 dark:selection:text-zinc-900">
        {children}
      </body>
    </html>
  );
}
