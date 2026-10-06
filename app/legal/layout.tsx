import Link from "next/link";
import { LEGAL_ENTITY, LEGAL_REVIEW_PENDING, TERMS_VERSION } from "@/lib/legal";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-sm font-bold text-zinc-900 dark:text-zinc-100">MarketerOS</Link>
          <nav className="flex gap-4 text-xs text-zinc-500">
            <Link href="/legal/terms" className="hover:underline">Terms</Link>
            <Link href="/legal/privacy" className="hover:underline">Privacy</Link>
            <Link href="/legal/cookies" className="hover:underline">Cookies</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10">
        {LEGAL_REVIEW_PENDING && (
          <p role="note" className="mb-8 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
            Template pending legal review. Text in [brackets] must be completed before launch.
          </p>
        )}
        <article className="legal-doc space-y-4 text-sm leading-relaxed [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-zinc-900 dark:[&_h1]:text-zinc-100 [&_h2]:mt-8 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-zinc-900 dark:[&_h2]:text-zinc-100 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_a]:underline">
          {children}
        </article>
        <footer className="mt-12 border-t border-zinc-200 pt-6 text-xs text-zinc-500 dark:border-zinc-800">
          Version {TERMS_VERSION} · {LEGAL_ENTITY.name} · {LEGAL_ENTITY.address} · <a href={`mailto:${LEGAL_ENTITY.email}`}>{LEGAL_ENTITY.email}</a>
        </footer>
      </main>
    </div>
  );
}
