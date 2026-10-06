import { LEGAL_ENTITY, TERMS_VERSION } from "@/lib/legal";

export const metadata = { title: "Terms of Service | MarketerOS" };

export default function TermsPage() {
  return (
    <>
      <h1>Terms of Service</h1>
      <p>Effective {TERMS_VERSION}. These terms are an agreement between you (and the organization you act for) and {LEGAL_ENTITY.name} (&quot;we&quot;) for the use of MarketerOS (the &quot;Service&quot;).</p>

      <h2>1. Accounts and workspaces</h2>
      <ul>
        <li>You must give accurate information, keep your password secret, and be at least 18 years old.</li>
        <li>The person who creates a workspace is its owner and is responsible for who they invite and what those people do in it.</li>
        <li>You are responsible for activity under your account. Tell us at once at {LEGAL_ENTITY.email} if you suspect unauthorized access.</li>
      </ul>

      <h2>2. Trials, plans and payment</h2>
      <ul>
        <li>New workspaces start with a free 14-day trial of the Pro plan. No payment details are needed for the trial.</li>
        <li>Paid plans are billed in advance for the period you choose, through our payment processor (PayU). Prices are shown on the Billing page and may include applicable taxes.</li>
        <li>Payments are not automatically renewed. We email reminders before your period ends. If it ends unpaid, the workspace stays fully usable for a 3-day grace period and then becomes read-only until you renew. Your data is not deleted because a plan lapsed.</li>
        <li>Each plan has limits (team seats, clients, campaigns, monthly AI credits) shown on the Billing page.</li>
        <li>[Refund policy: e.g. fees are non-refundable except where required by law.]</li>
      </ul>

      <h2>3. Your data</h2>
      <ul>
        <li>You keep all rights to the data you put into the Service and the data we import from accounts you connect (&quot;Customer Data&quot;). You give us permission to process it only to provide the Service, as described in our <a href="/legal/privacy">Privacy Policy</a>.</li>
        <li>You must have the right to upload Customer Data, including any personal data about leads, clients or contacts, and you are responsible for having a lawful basis to process it.</li>
        <li>You can export your workspace data at any time from Settings → Data &amp; privacy, and delete your workspace or account there. Deleted data is purged after a 7-day grace period.</li>
      </ul>

      <h2>4. Connected platforms</h2>
      <p>When you connect Google, Meta or other accounts, you authorize us to access them with the permissions you grant, only to show and analyze your marketing data. Your use of those platforms remains subject to their own terms. You can disconnect them at any time.</p>

      <h2>5. AI features</h2>
      <p>AI-generated content and insights may be inaccurate. Review them before you rely on or publish them. Prompts and the related context are sent to our AI provider to generate results, and are not used by us to train models.</p>

      <h2>6. Acceptable use</h2>
      <ul>
        <li>Don&apos;t break the law, send spam, infringe others&apos; rights, or upload malware.</li>
        <li>Don&apos;t try to access other customers&apos; data, probe or overload the Service, or get around plan limits or security controls.</li>
        <li>We may suspend accounts that put the Service or other customers at risk. Where reasonable, we will tell you first.</li>
      </ul>

      <h2>7. Availability and changes</h2>
      <p>We work to keep the Service available and secure but don&apos;t guarantee uninterrupted operation. We may change features. We will give at least 30 days&apos; notice of material changes to these terms, and the accepted version is recorded with your account.</p>

      <h2>8. Liability</h2>
      <p>[Limitation of liability and disclaimer of warranties, to be drafted by counsel. Typically: liability capped at fees paid in the 12 months before the claim; no liability for indirect or consequential loss, to the extent permitted by law.]</p>

      <h2>9. Termination</h2>
      <p>You may stop using the Service and delete your account at any time. We may end these terms if you materially breach them. Sections that by their nature should survive (data export window, liability, governing law) survive termination.</p>

      <h2>10. Governing law</h2>
      <p>These terms are governed by the laws of India. Courts at {LEGAL_ENTITY.jurisdiction} have exclusive jurisdiction, subject to any mandatory consumer protections where you live.</p>

      <h2>11. Contact</h2>
      <p>{LEGAL_ENTITY.name}, {LEGAL_ENTITY.address}. Email: <a href={`mailto:${LEGAL_ENTITY.email}`}>{LEGAL_ENTITY.email}</a>.</p>
    </>
  );
}
