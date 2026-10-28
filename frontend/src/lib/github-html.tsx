import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { fromHtml } from "hast-util-from-html";
import { defaultSchema, sanitize, type Schema } from "hast-util-sanitize";
import { toJsxRuntime } from "hast-util-to-jsx-runtime";

// Turns the HTML GitHub renders for issues and comments (`body_html`) into React
// elements, re-sanitized here so nothing depends on GitHub's sanitizer alone.

// Class names GitHub's renderer emits: syntax highlighting, alerts, task lists,
// mentions, footnotes. Anything else is dropped so a comment can't borrow the
// app's utility classes (e.g. `fixed inset-0`).
const GITHUB_CLASS =
  /^(pl-[a-z0-9]+|highlight(-[\w-]+)?|markdown-alert(-[\w-]+)?|octicon(-[\w-]+)?|task-list-item(-checkbox)?|contains-task-list|user-mention|team-mention|issue-link|notranslate|anchor|footnotes|data-footnote-backref|sr-only|language-[\w-]+)$/;

// GitHub already prefixes user ids with `user-content-`, so ids are kept as they
// are (in-page footnote links keep working) but only in that namespace.
const USER_ID = /^user-content-/;

const SCHEMA: Schema = {
  ...defaultSchema,
  clobberPrefix: "",
  tagNames: [...(defaultSchema.tagNames ?? []), "svg", "path", "video"],
  attributes: {
    ...defaultSchema.attributes,
    "*": [
      ...(defaultSchema.attributes?.["*"] ?? []).filter((a) => a !== "id" && a !== "name"),
      ["id", USER_ID],
      ["name", USER_ID],
      ["className", GITHUB_CLASS],
    ],
    svg: ["viewBox", "width", "height", "ariaHidden"],
    path: ["d", "fillRule"],
    video: ["src", "controls", "muted", "playsInline", "poster"],
  },
  protocols: { ...defaultSchema.protocols, poster: ["http", "https"] },
};

/** GitHub's `body_html` as React elements, sanitized */
export function renderGithubHtml(html: string) {
  const tree = sanitize(fromHtml(html, { fragment: true }), SCHEMA);
  return toJsxRuntime(tree, {
    Fragment,
    jsx,
    jsxs,
    components: {
      a: ({ href, ...props }) => {
        const external = typeof href === "string" && !href.startsWith("#");
        return <a href={href} {...props} {...(external && { target: "_blank", rel: "noreferrer" })} />;
      },
      // Task-list checkboxes are read-only here, as on GitHub for non-authors
      input: (props) => <input {...props} readOnly />,
    },
  });
}
