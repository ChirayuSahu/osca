import { prisma } from '../utils/prisma'
import { AppError, assertFound } from '../lib/errors'

export type InteractionAction = 
  | 'REPOSITORY_VIEW' 
  | 'ISSUE_VIEW' 
  | 'REPOSITORY_LIKE' 
  | 'REPOSITORY_SAVE' 
  | 'ISSUE_COMMENT' 
  | 'CONTRIBUTION'

const INTERACTION_WEIGHTS: Record<InteractionAction, number> = {
  REPOSITORY_VIEW: 1,
  ISSUE_VIEW: 2,
  REPOSITORY_LIKE: 5,
  REPOSITORY_SAVE: 8,
  ISSUE_COMMENT: 10,
  CONTRIBUTION: 20
}

export const logInteraction = async (
  userId: string,
  repositoryId: string,
  action: InteractionAction
): Promise<void> => {
  const weight = INTERACTION_WEIGHTS[action]
  if (!weight) {
    throw new AppError(`Invalid interaction action: ${action}`, 400)
  }

  // Ensure repository exists
  const repository = await prisma.repository.findUnique({
    where: { id: repositoryId },
    select: { languages: true, techStack: true }
  })
  
  if (!repository) {
    throw new AppError('Repository not found', 404)
  }

  // 1. Log the interaction
  await prisma.userInteraction.create({
    data: {
      userId,
      repositoryId,
      action,
      weight
    }
  })

  // 2. Parse tags from repository
  const tagsToUpdate = new Set<string>()

  if (repository.techStack && Array.isArray(repository.techStack)) {
    repository.techStack.forEach(t => tagsToUpdate.add(t.toLowerCase()))
  }

  if (repository.languages) {
    if (typeof repository.languages === 'object' && repository.languages !== null) {
      // Assuming languages is a Record<string, number>
      Object.keys(repository.languages).forEach(lang => tagsToUpdate.add(lang.toLowerCase()))
    }
  }

  // 3. Update UserInterests
  if (tagsToUpdate.size === 0) return

  const tagsArray = Array.from(tagsToUpdate)

  // Prisma doesn't natively support upsertMany/increment natively easily across multiple rows without a loop or raw query.
  // Using sequential upserts or Promise.all.
  await Promise.all(
    tagsArray.map(tag =>
      prisma.userInterest.upsert({
        where: {
          userId_tag: {
            userId,
            tag
          }
        },
        update: {
          score: {
            increment: weight
          }
        },
        create: {
          userId,
          tag,
          score: weight
        }
      })
    )
  )
}

export const InteractionService = {
  logInteraction
}
