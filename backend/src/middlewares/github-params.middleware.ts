import { Router } from 'express'
import { AppError } from '../lib/errors'

// These params are interpolated into GitHub API paths with the caller's token,
// so anything outside GitHub's own name/number charset could reach other endpoints.
const NAME_PATTERN = /^[A-Za-z0-9_.-]+$/
const NUMBER_PATTERN = /^\d+$/

export const registerGithubParamValidators = (router: Router): void => {
  for (const name of ['owner', 'repo']) {
    router.param(name, (_req, _res, next, value: string) => {
      if (!NAME_PATTERN.test(value) || value === '.' || value === '..') {
        return next(new AppError(`Invalid ${name}`, 400))
      }
      next()
    })
  }

  for (const name of ['issueNumber', 'pullNumber', 'commentId']) {
    router.param(name, (_req, _res, next, value: string) => {
      if (!NUMBER_PATTERN.test(value)) {
        return next(new AppError(`Invalid ${name}`, 400))
      }
      next()
    })
  }
}
