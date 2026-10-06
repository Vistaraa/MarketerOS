import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

/**
 * ESLint flat config (`npm run lint`). `next lint` was removed in Next.js 16; this keeps the same rules as the
 * old .eslintrc.json ("next/core-web-vitals").
 */
export default defineConfig([
  ...nextCoreWebVitals,
  {
    // These components show user uploads (served by the authenticated /api/media route) and YouTube thumbnails.
    // next/image's optimizer fetches images server-side without the user's session, so it can't load them.
    files: [
      "components/content-studio/subpages/*.tsx",
      "components/integrations/youtube-ads-dashboard.tsx",
      "components/integrations/youtube-brand-channel.tsx",
      "components/settings/two-factor-card.tsx"
    ],
    rules: { "@next/next/no-img-element": "off" }
  },
  {
    // New in eslint-plugin-react-hooks 7 (React Compiler guidance). The existing "load data / reset state in an
    // effect" patterns it flags work correctly; they are reported as warnings to migrate gradually rather than
    // rewritten all at once.
    rules: { "react-hooks/set-state-in-effect": "warn" }
  },
  globalIgnores([".next/**", "node_modules/**", "storage/**", "coverage/**", "next-env.d.ts", ".kilo/**"])
]);
