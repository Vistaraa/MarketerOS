import { TERMS_VERSION } from "@/lib/legal";

export const metadata = { title: "Cookie Policy | MarketerOS" };

export default function CookiesPage() {
  return (
    <>
      <h1>Cookie Policy</h1>
      <p>Effective {TERMS_VERSION}. MarketerOS uses only what is strictly necessary to run the service. There are no advertising or cross-site tracking cookies, so no cookie banner is needed.</p>

      <h2>Cookies we set</h2>
      <ul>
        <li><strong>marketeros_session</strong>: keeps you signed in. Strictly necessary; HTTP-only, secure and SameSite=Lax. It expires after 14 days or when you sign out.</li>
      </ul>

      <h2>Browser storage</h2>
      <ul>
        <li>Your theme preference (light or dark) is kept in your browser&apos;s local storage. It never leaves your device.</li>
      </ul>

      <h2>Third parties</h2>
      <p>Error monitoring (Sentry) and payments (PayU, on its own pages during checkout) may use their own strictly necessary storage. Connecting Google or Meta happens on their sites, under their cookie policies.</p>

      <h2>Your choices</h2>
      <p>You can clear cookies and local storage in your browser at any time. Clearing the session cookie signs you out.</p>
    </>
  );
}
