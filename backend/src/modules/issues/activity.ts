import { getGithubAccessToken, githubGraphQL } from '../../lib/github'
import { AppError } from '../../lib/errors'

// Everything GitHub shows around an issue or PR besides its comments, in one
// GraphQL call: the timeline (mentions, referencing commits, label changes,
// transfers, reviews…), linked pull requests or issues, and for PRs the code
// review threads with their replies.

type Actor = { login: string; avatarUrl: string } | null

const ACTOR = 'actor { login avatarUrl }'
const REF = `
  __typename
  ... on Issue { number title url state repository { nameWithOwner } }
  ... on PullRequest { number title url state merged repository { nameWithOwner } }
`

// Events both issues and PRs have
const COMMON_EVENTS = `
  ... on CrossReferencedEvent { id createdAt ${ACTOR} source { ${REF} } }
  ... on ReferencedEvent { id createdAt ${ACTOR} commit { abbreviatedOid messageHeadline url } }
  ... on LabeledEvent { id createdAt ${ACTOR} label { name color } }
  ... on UnlabeledEvent { id createdAt ${ACTOR} label { name color } }
  ... on AssignedEvent { id createdAt ${ACTOR} assignee { ... on Actor { login } } }
  ... on UnassignedEvent { id createdAt ${ACTOR} assignee { ... on Actor { login } } }
  ... on ClosedEvent { id createdAt ${ACTOR} stateReason closer { __typename ... on PullRequest { number url } ... on Commit { abbreviatedOid url } } }
  ... on ReopenedEvent { id createdAt ${ACTOR} }
  ... on RenamedTitleEvent { id createdAt ${ACTOR} previousTitle currentTitle }
  ... on MilestonedEvent { id createdAt ${ACTOR} milestoneTitle }
  ... on DemilestonedEvent { id createdAt ${ACTOR} milestoneTitle }
  ... on ConnectedEvent { id createdAt ${ACTOR} subject { ${REF} } }
  ... on MarkedAsDuplicateEvent { id createdAt ${ACTOR} canonical { ${REF} } }
`

const COMMON_TYPES = [
  'CROSS_REFERENCED_EVENT', 'REFERENCED_EVENT', 'LABELED_EVENT', 'UNLABELED_EVENT', 'ASSIGNED_EVENT',
  'UNASSIGNED_EVENT', 'CLOSED_EVENT', 'REOPENED_EVENT', 'RENAMED_TITLE_EVENT', 'MILESTONED_EVENT',
  'DEMILESTONED_EVENT', 'CONNECTED_EVENT', 'MARKED_AS_DUPLICATE_EVENT'
]

export const ACTIVITY_QUERY = `
query($owner: String!, $name: String!, $number: Int!) {
  repository(owner: $owner, name: $name) {
    issueOrPullRequest(number: $number) {
      __typename
      ... on Issue {
        timelineItems(last: 100, itemTypes: [${[...COMMON_TYPES, 'TRANSFERRED_EVENT'].join(', ')}]) {
          nodes {
            __typename
            ${COMMON_EVENTS}
            ... on TransferredEvent { id createdAt ${ACTOR} fromRepository { nameWithOwner } }
          }
        }
        closedByPullRequestsReferences(first: 10, includeClosedPrs: true) {
          nodes { number title url state merged repository { nameWithOwner } }
        }
      }
      ... on PullRequest {
        timelineItems(last: 100, itemTypes: [${[
          ...COMMON_TYPES, 'PULL_REQUEST_REVIEW', 'PULL_REQUEST_COMMIT', 'MERGED_EVENT', 'HEAD_REF_FORCE_PUSHED_EVENT',
          'REVIEW_REQUESTED_EVENT', 'READY_FOR_REVIEW_EVENT', 'CONVERT_TO_DRAFT_EVENT'
        ].join(', ')}]) {
          nodes {
            __typename
            ${COMMON_EVENTS}
            ... on PullRequestReview { id state submittedAt createdAt author { login avatarUrl } bodyHTML url }
            ... on PullRequestCommit { id commit { abbreviatedOid messageHeadline url committedDate author { name user { login avatarUrl } } } }
            ... on MergedEvent { id createdAt ${ACTOR} mergeRefName commit { abbreviatedOid url } }
            ... on HeadRefForcePushedEvent { id createdAt ${ACTOR} }
            ... on ReviewRequestedEvent { id createdAt ${ACTOR} requestedReviewer { ... on Actor { login } } }
            ... on ReadyForReviewEvent { id createdAt ${ACTOR} }
            ... on ConvertToDraftEvent { id createdAt ${ACTOR} }
          }
        }
        closingIssuesReferences(first: 10) {
          nodes { number title url state repository { nameWithOwner } }
        }
        reviewThreads(first: 50) {
          nodes {
            id isResolved isOutdated path line startLine
            comments(first: 30) {
              nodes { id databaseId bodyHTML createdAt url diffHunk author { login avatarUrl } }
            }
          }
        }
      }
    }
  }
}`

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Node = Record<string, any>

type Ref = { kind: 'issue' | 'pull'; number: number; title: string; url: string; state: string; merged?: boolean; repo: string }

const toRef = (node: Node | null | undefined): Ref | null =>
  node && typeof node.number === 'number'
    ? {
        kind: node.__typename === 'PullRequest' ? 'pull' : 'issue',
        number: node.number,
        title: node.title,
        url: node.url,
        state: String(node.state).toLowerCase(),
        merged: node.merged ?? undefined,
        repo: node.repository?.nameWithOwner
      }
    : null

const actorOf = (node: Node): Actor => (node.actor ? { login: node.actor.login, avatarUrl: node.actor.avatarUrl } : null)

/** One timeline entry, flattened for the client; `kind` says which extra fields it has */
const toEvent = (node: Node) => {
  const base = { id: node.id as string, createdAt: node.createdAt as string, actor: actorOf(node) }
  switch (node.__typename) {
    case 'CrossReferencedEvent':
      return { ...base, kind: 'mentioned', ref: toRef(node.source) }
    case 'ReferencedEvent':
      return node.commit
        ? { ...base, kind: 'commit_referenced', commit: { sha: node.commit.abbreviatedOid, message: node.commit.messageHeadline, url: node.commit.url } }
        : null
    case 'LabeledEvent':
    case 'UnlabeledEvent':
      return { ...base, kind: node.__typename === 'LabeledEvent' ? 'labeled' : 'unlabeled', label: node.label }
    case 'AssignedEvent':
    case 'UnassignedEvent':
      return { ...base, kind: node.__typename === 'AssignedEvent' ? 'assigned' : 'unassigned', assignee: node.assignee?.login ?? null }
    case 'ClosedEvent':
      return {
        ...base,
        kind: 'closed',
        stateReason: node.stateReason ? String(node.stateReason).toLowerCase() : null,
        closer: node.closer?.__typename === 'PullRequest'
          ? { kind: 'pull', number: node.closer.number, url: node.closer.url }
          : node.closer?.__typename === 'Commit'
            ? { kind: 'commit', sha: node.closer.abbreviatedOid, url: node.closer.url }
            : null
      }
    case 'ReopenedEvent':
      return { ...base, kind: 'reopened' }
    case 'RenamedTitleEvent':
      return { ...base, kind: 'renamed', from: node.previousTitle, to: node.currentTitle }
    case 'TransferredEvent':
      return { ...base, kind: 'transferred', from: node.fromRepository?.nameWithOwner ?? null }
    case 'MilestonedEvent':
    case 'DemilestonedEvent':
      return { ...base, kind: node.__typename === 'MilestonedEvent' ? 'milestoned' : 'demilestoned', milestone: node.milestoneTitle }
    case 'ConnectedEvent':
      return { ...base, kind: 'connected', ref: toRef(node.subject) }
    case 'MarkedAsDuplicateEvent':
      return { ...base, kind: 'duplicate', ref: toRef(node.canonical) }
    case 'PullRequestReview':
      return {
        id: node.id,
        createdAt: node.submittedAt ?? node.createdAt,
        actor: node.author ? { login: node.author.login, avatarUrl: node.author.avatarUrl } : null,
        kind: 'reviewed',
        state: String(node.state).toLowerCase(),
        bodyHtml: node.bodyHTML || null,
        url: node.url
      }
    case 'PullRequestCommit': {
      const c = node.commit
      const user = c?.author?.user
      return {
        id: node.id,
        createdAt: c?.committedDate,
        actor: user ? { login: user.login, avatarUrl: user.avatarUrl } : c?.author?.name ? { login: c.author.name, avatarUrl: '' } : null,
        kind: 'committed',
        commit: { sha: c?.abbreviatedOid, message: c?.messageHeadline, url: c?.url }
      }
    }
    case 'MergedEvent':
      return { ...base, kind: 'merged', into: node.mergeRefName, commit: node.commit ? { sha: node.commit.abbreviatedOid, url: node.commit.url } : null }
    case 'HeadRefForcePushedEvent':
      return { ...base, kind: 'force_pushed' }
    case 'ReviewRequestedEvent':
      // Team reviewers have no login here: their names need the read:org scope, which OSCA doesn't ask for
      return { ...base, kind: 'review_requested', reviewer: node.requestedReviewer?.login ?? null }
    case 'ReadyForReviewEvent':
      return { ...base, kind: 'ready_for_review' }
    case 'ConvertToDraftEvent':
      return { ...base, kind: 'converted_to_draft' }
    default:
      return null
  }
}

/** Last few lines of a diff hunk: the lines the review comment is about */
const trimHunk = (hunk: string | null | undefined, lines = 8) => {
  if (!hunk) return null
  const all = hunk.split('\n')
  return all.length > lines + 1 ? all.slice(-lines).join('\n') : hunk
}

type ActivityResponse = { data?: { repository?: { issueOrPullRequest?: Node | null } | null }; errors?: { message: string; type?: string }[] }

const getActivity = async (userId: string, owner: string, repo: string, number: number) => {
  const token = await getGithubAccessToken(userId)
  const res = await githubGraphQL<ActivityResponse>(ACTIVITY_QUERY, token, { owner, name: repo, number })
  const item = res.data?.repository?.issueOrPullRequest
  if (!item) {
    // RATE_LIMITED is raised by githubGraphQL itself; a missing repo or number is NOT_FOUND
    const error = res.errors?.[0]
    if (!error || res.errors?.some((e) => e.type === 'NOT_FOUND')) {
      throw new AppError('Issue or pull request not found', 404)
    }
    throw new AppError(error.message, 502)
  }

  const events = ((item.timelineItems?.nodes ?? []) as Node[])
    .filter(Boolean)
    .map(toEvent)
    .filter((e): e is NonNullable<ReturnType<typeof toEvent>> => e !== null && Boolean(e.createdAt))

  const isPull = item.__typename === 'PullRequest'
  const linked = ((isPull ? item.closingIssuesReferences?.nodes : item.closedByPullRequestsReferences?.nodes) ?? []) as Node[]

  const reviewThreads = isPull
    ? ((item.reviewThreads?.nodes ?? []) as Node[]).map((t) => ({
        id: t.id as string,
        path: t.path as string,
        line: (t.line ?? null) as number | null,
        startLine: (t.startLine ?? null) as number | null,
        resolved: Boolean(t.isResolved),
        outdated: Boolean(t.isOutdated),
        diffHunk: trimHunk(t.comments?.nodes?.[0]?.diffHunk),
        comments: ((t.comments?.nodes ?? []) as Node[]).map((c) => ({
          id: c.databaseId ?? c.id,
          bodyHtml: c.bodyHTML as string,
          createdAt: c.createdAt as string,
          url: c.url as string,
          author: c.author ? { login: c.author.login, avatarUrl: c.author.avatarUrl } : null
        }))
      }))
    : []

  return {
    type: isPull ? 'pull' : 'issue',
    events,
    // For an issue: PRs that will close it. For a PR: issues it closes.
    linked: linked.map((n) => toRef({ ...n, __typename: isPull ? 'Issue' : 'PullRequest' })).filter(Boolean),
    reviewThreads
  }
}

export const IssueActivityService = { getActivity }
