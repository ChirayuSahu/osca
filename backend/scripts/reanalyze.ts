/**
 * Re-enqueue contributor/repository analysis jobs on demand — bulk or targeted.
 *
 * Usage:
 *   npm run reanalyze -- --users                     # Re-analyze ALL users
 *   npm run reanalyze -- --repos                      # Re-analyze ALL repositories
 *   npm run reanalyze -- --users=alice,bob             # Re-analyze specific users by username
 *   npm run reanalyze -- --repos=facebook/react,vercel/next.js  # Re-analyze specific repos by fullName
 *   npm run reanalyze -- --users --repos               # Re-analyze all users and all repos
 */
import { prisma } from '../src/utils/prisma'
import { JobEnqueueService } from '../src/services/job-enqueue.service'

const reanalyzeUsers = async (usernames?: string[]) => {
  const users = await prisma.user.findMany({
    where: usernames ? { username: { in: usernames } } : undefined,
    select: { id: true, username: true }
  })

  if (usernames) {
    const found = new Set(users.map((u) => u.username))
    for (const username of usernames) {
      if (!found.has(username)) console.warn(`[Reanalyze] User not found: ${username}`)
    }
  }

  console.log(`[Reanalyze] Re-analyzing ${users.length} user(s)`)

  let enqueued = 0
  for (const user of users) {
    try {
      const job = await JobEnqueueService.enqueueContributorAnalysis(user.id)
      console.log(`[Reanalyze] Enqueued user ${user.username} -> Queue: ${job.queue}, Job ID: ${job.jobId}${job.alreadyQueued ? ' (already queued)' : ''}`)
      enqueued++
    } catch (err) {
      console.error(`[Reanalyze] Failed to enqueue user ${user.username}:`, err)
    }
  }
  console.log(`[Reanalyze] Users: enqueued ${enqueued} jobs`)
}

const reanalyzeRepos = async (fullNames?: string[]) => {
  const user = await prisma.user.findFirst()
  if (!user) {
    console.error('[Reanalyze] Cannot re-analyze repos: No user found in database to attach to jobs')
    return
  }

  const repos = await prisma.repository.findMany({
    where: fullNames ? { fullName: { in: fullNames } } : undefined,
    select: { url: true, fullName: true }
  })

  if (fullNames) {
    const found = new Set(repos.map((r) => r.fullName))
    for (const fullName of fullNames) {
      if (!found.has(fullName)) console.warn(`[Reanalyze] Repository not found: ${fullName}`)
    }
  }

  console.log(`[Reanalyze] Re-analyzing ${repos.length} repositor${repos.length === 1 ? 'y' : 'ies'}`)

  let enqueued = 0
  for (const repo of repos) {
    if (!repo.url) continue
    try {
      const job = await JobEnqueueService.enqueueRepositoryAnalysis(repo.url, user.id, true)
      console.log(`[Reanalyze] Enqueued repo ${repo.fullName || repo.url} -> Queue: ${job.queue}, Job ID: ${job.jobId}${job.alreadyQueued ? ' (already queued)' : ''}`)
      enqueued++
    } catch (err) {
      console.error(`[Reanalyze] Failed to enqueue repo ${repo.url}:`, err)
    }
  }
  console.log(`[Reanalyze] Repos: enqueued ${enqueued} jobs`)
}

const parseFlag = (args: string[], flag: string): { present: boolean; values?: string[] } => {
  const arg = args.find((a) => a === flag || a.startsWith(`${flag}=`))
  if (!arg) return { present: false }
  const eqIndex = arg.indexOf('=')
  if (eqIndex === -1) return { present: true }
  const values = arg
    .slice(eqIndex + 1)
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)
  return { present: true, values: values.length ? values : undefined }
}

const main = async () => {
  const args = process.argv.slice(2)
  const usersFlag = parseFlag(args, '--users')
  const reposFlag = parseFlag(args, '--repos')

  if (!usersFlag.present && !reposFlag.present) {
    console.error('[Reanalyze] Nothing to do — pass --users and/or --repos (optionally with =comma,separated,names)')
    process.exit(1)
  }

  if (usersFlag.present) await reanalyzeUsers(usersFlag.values)
  if (reposFlag.present) await reanalyzeRepos(reposFlag.values)

  console.log('[Reanalyze] Done.')

  await prisma.$disconnect()
}

main()
  .then(() => {
    process.exit(0)
  })
  .catch((err) => {
    console.error('[Reanalyze] Fatal error:', err)
    process.exit(1)
  })
