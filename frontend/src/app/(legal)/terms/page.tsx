import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection, REPO_URL } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Terms of Service | OSCA",
  description: "The rules for using OSCA, an open-source contributor matchmaking service.",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      intro={
        <p>
          These terms cover your use of OSCA, which recommends open-source repositories and issues based on your GitHub
          activity. By signing in you agree to them. Please read them together with the{" "}
          <Link href="/privacy" className="font-medium text-emerald-700 underline-offset-4 hover:underline dark:text-emerald-400">
            Privacy Policy
          </Link>
          .
        </p>
      }
    >
      <LegalSection id="account" title="1. Your account">
        <ul>
          <li>You sign in with a GitHub account, and you must be allowed to use GitHub under its own terms.</li>
          <li>You are responsible for activity under your account. Keep your GitHub account secure.</li>
          <li>One person, one account. Don&apos;t sign in to OSCA on someone else&apos;s behalf.</li>
        </ul>
      </LegalSection>

      <LegalSection id="github" title="2. Actions on GitHub">
        <p>
          When you create an issue, comment or react through OSCA, it is posted to GitHub from your account. It is
          public, it is subject to{" "}
          <a href="https://docs.github.com/site-policy/github-terms/github-terms-of-service" target="_blank" rel="noreferrer">
            GitHub&apos;s Terms of Service
          </a>{" "}
          and each project&apos;s own code of conduct, and you are responsible for it. OSCA never posts without you
          asking it to.
        </p>
      </LegalSection>

      <LegalSection id="use" title="3. Acceptable use">
        <p>Don&apos;t use OSCA to:</p>
        <ul>
          <li>spam maintainers or projects, or post low-effort or automated issues and comments</li>
          <li>harass anyone, or misuse other users&apos; profiles shown on the Community page</li>
          <li>scrape OSCA, work around its rate limits, or overload its servers</li>
          <li>probe or attack OSCA&apos;s security, or access data that isn&apos;t yours</li>
          <li>break the law or GitHub&apos;s policies</li>
        </ul>
        <p>We may limit or suspend accounts that do.</p>
      </LegalSection>

      <LegalSection id="recommendations" title="4. Recommendations and OscaBot">
        <p>
          Recommendations, match scores and OscaBot replies are generated automatically from public GitHub data and an
          AI model. They are suggestions, not guarantees: a project may have changed, an issue may already be taken,
          and AI replies can be wrong. Check a project&apos;s contributing guide before you start work.
        </p>
      </LegalSection>

      <LegalSection id="content" title="5. Content and ownership">
        <p>
          Repository names, descriptions, issues and code shown in OSCA belong to their owners and are shown under
          their licenses and GitHub&apos;s terms. Your GitHub content stays yours. OSCA itself is open source; its code
          is available in the <a href={REPO_URL} target="_blank" rel="noreferrer">OSCA repository</a>.
        </p>
      </LegalSection>

      <LegalSection id="availability" title="6. Availability">
        <p>
          OSCA is provided as is and as available. It may change, pause or stop features at any time, and it depends on
          GitHub and the AI provider being reachable. We don&apos;t promise it will always be available or error-free.
        </p>
      </LegalSection>

      <LegalSection id="liability" title="7. Liability">
        <p>
          To the extent the law allows, OSCA and its maintainers are not liable for indirect or consequential losses,
          or for anything that results from following a recommendation or from content posted to GitHub. Nothing in
          these terms limits rights you have under law that can&apos;t be limited.
        </p>
      </LegalSection>

      <LegalSection id="ending" title="8. Ending your use">
        <p>
          You can stop using OSCA at any time: revoke its access in your GitHub settings and, if you like, ask for your
          data to be deleted as described in the <Link href="/privacy#choices">Privacy Policy</Link>. We may end
          access for accounts that break these terms.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="9. Changes">
        <p>
          We may update these terms. The date at the top will change, and significant changes will be announced in the
          app. Continuing to use OSCA after that means you accept the new terms. Questions? Reach the maintainers
          through the <a href={REPO_URL} target="_blank" rel="noreferrer">OSCA repository</a>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
