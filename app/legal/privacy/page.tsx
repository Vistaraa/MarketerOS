import { LEGAL_ENTITY, TERMS_VERSION } from "@/lib/legal";

export const metadata = { title: "Privacy Policy | MarketerOS" };

export default function PrivacyPage() {
  return (
    <>
      <h1>Privacy Policy</h1>
      <p>Effective {TERMS_VERSION}. This policy explains what personal data MarketerOS processes, why, and your rights under India&apos;s Digital Personal Data Protection Act, 2023 (DPDP Act), the EU/UK GDPR and similar laws.</p>

      <h2>1. Who is responsible</h2>
      <p>For account and billing data, {LEGAL_ENTITY.name} is the data fiduciary (controller). For data you put into a workspace (leads, clients, campaign and audience data), the workspace owner&apos;s organization is the data fiduciary and we process it on their behalf, as a data processor, under their instructions.</p>

      <h2>2. What we collect</h2>
      <ul>
        <li><strong>Account data:</strong> name, email, password (stored only as a salted hash), role, job title, and the date and version of the terms you accepted.</li>
        <li><strong>Workspace data:</strong> clients, leads, campaigns, content, media files, reports and settings that you and your team add.</li>
        <li><strong>Connected-platform data:</strong> marketing metrics and account details from platforms you connect (e.g. Google Ads, Meta). Access tokens are stored encrypted.</li>
        <li><strong>Billing data:</strong> plan, invoices and payment references. Card, UPI and bank details are handled by PayU and never reach our servers.</li>
        <li><strong>Usage and security data:</strong> sign-in times, IP address used for rate limiting and fraud prevention, audit logs of important actions, and error reports.</li>
      </ul>

      <h2>3. Why we use it (purposes and legal bases)</h2>
      <ul>
        <li>To provide the Service and its features you request (performance of contract).</li>
        <li>To secure accounts, prevent abuse and keep audit records (legitimate interests / legal obligation).</li>
        <li>To bill you and keep accounting records (contract / legal obligation).</li>
        <li>To send service emails: verification, invitations, password resets, billing reminders and deletion or export notices. We don&apos;t send marketing email without your consent.</li>
      </ul>

      <h2>4. Who we share it with</h2>
      <p>Only with service providers that help run MarketerOS, under contracts that require them to protect it:</p>
      <ul>
        <li>Hosting and database: [Vercel], [Supabase], plus object storage [provider] for uploaded media and exports.</li>
        <li>Email delivery: [Resend / SMTP provider].</li>
        <li>Payments: PayU.</li>
        <li>Error monitoring: Sentry (technical data only).</li>
        <li>AI generation: [AI provider]. Prompts and context are sent to it only when you use AI features.</li>
        <li>Platforms you connect (Google, Meta and others), only to read the data you authorized.</li>
      </ul>
      <p>Some providers process data outside India. Where they do, we rely on safeguards required by applicable law. We never sell personal data.</p>

      <h2>5. How long we keep it</h2>
      <ul>
        <li>Account and workspace data: while your account or workspace exists. When you delete it, it is purged 7 days later (the window lets you cancel a mistaken deletion).</li>
        <li>Data exports: deleted 7 days after creation.</li>
        <li>Invoices and payment records: as long as tax law requires [e.g. 8 years].</li>
        <li>Security logs: [e.g. 12 months].</li>
      </ul>

      <h2>6. Your rights</h2>
      <ul>
        <li><strong>Access and portability:</strong> workspace owners can download a full JSON export from Settings → Data &amp; privacy.</li>
        <li><strong>Correction:</strong> edit your profile in Settings, or ask us.</li>
        <li><strong>Erasure:</strong> delete your account or workspace from Settings → Data &amp; privacy.</li>
        <li><strong>Withdraw consent, object or restrict processing,</strong> and <strong>nominate</strong> someone to exercise your rights (DPDP Act): email us.</li>
        <li><strong>Grievances:</strong> contact our Grievance Officer, {LEGAL_ENTITY.grievanceOfficer}, at <a href={`mailto:${LEGAL_ENTITY.email}`}>{LEGAL_ENTITY.email}</a>. We respond within [30] days. You may also complain to the Data Protection Board of India or your local supervisory authority.</li>
      </ul>
      <p>If your data is in a workspace run by another organization, contact them first. We will help them respond.</p>

      <h2>7. Security</h2>
      <p>Encryption in transit (HTTPS) and of stored integration credentials, hashed passwords, role-based access, rate limiting, audit logs and monitoring. We will notify you and the authorities of a personal data breach as the law requires.</p>

      <h2>8. Children</h2>
      <p>MarketerOS is for businesses and is not directed at anyone under 18.</p>

      <h2>9. Changes</h2>
      <p>We will notify you of material changes by email or in the app before they take effect.</p>

      <h2>10. Contact</h2>
      <p>{LEGAL_ENTITY.name}, {LEGAL_ENTITY.address}. Email: <a href={`mailto:${LEGAL_ENTITY.email}`}>{LEGAL_ENTITY.email}</a>.</p>
    </>
  );
}
