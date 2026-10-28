import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection, REPO_URL } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy | OSCA",
  description: "What OSCA collects from GitHub, how it is used, who it is shared with and how long it is kept.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro={
        <p>
          OSCA matches developers with open-source projects they can contribute to. To do that it reads parts of your
          GitHub account and remembers how you use OSCA. This page lists exactly what that is, why, who else sees it,
          and how long it is kept.
        </p>
      }
    >
      <LegalSection id="summary" title="The short version">
        <ul>
          <li>
            You sign in with GitHub. OSCA reads your profile and email, and can post to public repositories only when
            you comment, react or open an issue through it. It never sees your private repositories.
          </li>
          <li>It analyzes your public GitHub activity to work out your skills, then recommends repositories.</li>
          <li>Chats with OscaBot are not saved by OSCA, but they are sent to an AI provider to generate replies.</li>
          <li>There are no ads, no analytics trackers, and your data is never sold.</li>
          <li>You can revoke OSCA&apos;s GitHub access at any time and ask for your data to be deleted.</li>
        </ul>
      </LegalSection>

      <LegalSection id="github" title="1. What we get from GitHub">
        <p>When you sign in, GitHub shares and OSCA stores:</p>
        <ul>
          <li>
            <strong>Your account details:</strong> GitHub user ID, username, display name, avatar URL and email
            address. If your email is private, GitHub&apos;s no-reply address is used instead.
          </li>
          <li>
            <strong>An access token</strong> that lets OSCA call GitHub on your behalf. It is encrypted before it is
            stored.
          </li>
        </ul>
        <p>
          The token has the <code>read:user</code>, <code>user:email</code> and <code>public_repo</code> permissions.
          OSCA uses <code>public_repo</code> only to post the issues, comments and reactions you create through it, and
          never to change code. The token gives no access to your private repositories.
        </p>
      </LegalSection>

      <LegalSection id="analysis" title="2. Profile analysis">
        <p>
          When you analyze or re-sync your profile, OSCA reads public information from your GitHub account to build a
          contributor profile:
        </p>
        <ul>
          <li>Repositories you own, their languages, and dependency files such as <code>package.json</code> and <code>requirements.txt</code></li>
          <li>Repositories you have starred</li>
          <li>Contribution totals: commits, pull requests, reviews, lines added and average pull request turnaround</li>
        </ul>
        <p>
          From this it stores a list of skills with proficiency levels, and scores for skill depth, activity, code
          quality and diversity. These power your recommendations and the profile page.
        </p>
      </LegalSection>

      <LegalSection id="activity" title="3. How you use OSCA">
        <ul>
          <li>Repositories you import, like, save or open, and ones you mark as &ldquo;not for me&rdquo;</li>
          <li>
            Which repositories your feed has shown you, kept for 3 days so later visits can show you something new
          </li>
          <li>Any skills you add to your profile yourself</li>
        </ul>
        <p>
          Comments, issues and reactions you post through OSCA are sent to GitHub using your account and are governed
          by GitHub&apos;s terms. OSCA does not keep its own copy.
        </p>
      </LegalSection>

      <LegalSection id="oscabot" title="4. OscaBot (AI chat)">
        <p>
          Conversations with OscaBot exist only in your browser tab. They are not stored on OSCA&apos;s servers and
          are gone when you leave or refresh.
        </p>
        <p>
          To generate a reply, OSCA sends your messages to{" "}
          <a href="https://openrouter.ai/privacy" target="_blank" rel="noreferrer">OpenRouter</a>, which routes them to
          an AI model provider. Along with your messages it sends a short profile summary (your name, GitHub username,
          strongest languages and tools, and contributor score) and a list of candidate repositories. The provider&apos;s
          own policy applies to that data; some free models may retain prompts. Don&apos;t share anything in the chat
          you wouldn&apos;t want a third party to see.
        </p>
        <p>Requests for issues from a repository are answered directly from GitHub and are not sent to the AI provider.</p>
      </LegalSection>

      <LegalSection id="visible" title="5. What other OSCA users can see">
        <p>
          The Community page shows people with overlapping skills. Other signed-in users can see your name, GitHub
          username, avatar, the skills you share with them and a match percentage. They also see anonymous counts of
          how many similar developers are active in a repository. Your email, activity history and scores are never
          shown to other users.
        </p>
      </LegalSection>

      <LegalSection id="browser" title="6. What is stored in your browser">
        <ul>
          <li><strong>Your session:</strong> a sign-in token in local storage, valid for one day</li>
          <li><strong>Preferences:</strong> your theme, sidebar state and feed layout</li>
          <li>
            <strong>A temporary sign-in cookie</strong> that protects the GitHub sign-in from forgery, kept for at most
            10 minutes
          </li>
        </ul>
        <p>None of these are used for advertising or tracking. Repository and profile images load directly from GitHub.</p>
      </LegalSection>

      <LegalSection id="sharing" title="7. Who we share data with">
        <ul>
          <li><strong>GitHub</strong>, to sign you in and to read and post data when you ask OSCA to</li>
          <li><strong>OpenRouter</strong> and the AI model it routes to, for OscaBot replies (see section 4)</li>
        </ul>
        <p>We don&apos;t sell, rent or share your data with anyone else, and there are no advertising or analytics partners.</p>
      </LegalSection>

      <LegalSection id="retention" title="8. How long we keep it">
        <ul>
          <li>Account, profile and activity data: until you ask us to delete your account</li>
          <li>Feed history: 3 days</li>
          <li>Cached GitHub results (searches, issue lists): 10 to 30 minutes</li>
          <li>Rate-limit counters: seconds to minutes</li>
          <li>Sign-in codes: 60 seconds, single use</li>
          <li>Server logs record the request path, status and timing, not message content</li>
        </ul>
      </LegalSection>

      <LegalSection id="security" title="9. Security">
        <p>
          GitHub access tokens are encrypted at rest, sessions expire after a day, and content from GitHub is sanitized
          before it is displayed. No system is perfectly secure, so please report anything suspicious through the
          repository below.
        </p>
      </LegalSection>

      <LegalSection id="choices" title="10. Your choices">
        <ul>
          <li>
            <strong>Revoke access:</strong> remove OSCA under{" "}
            <a href="https://github.com/settings/applications" target="_blank" rel="noreferrer">
              GitHub → Settings → Applications
            </a>
            . OSCA will no longer be able to read your GitHub data.
          </li>
          <li>
            <strong>Delete your data, or get a copy:</strong> contact the maintainers through the{" "}
            <a href={REPO_URL} target="_blank" rel="noreferrer">OSCA repository</a>. We&apos;ll remove your account,
            profile and activity from our databases.
          </li>
          <li><strong>Hide recommendations:</strong> mark repositories as &ldquo;not for me&rdquo; at any time.</li>
        </ul>
      </LegalSection>

      <LegalSection id="changes" title="11. Changes to this policy">
        <p>
          If what we collect or how we use it changes, we&apos;ll update this page and its date. Significant changes
          will be announced in the app. See also the <Link href="/terms">Terms of Service</Link>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
