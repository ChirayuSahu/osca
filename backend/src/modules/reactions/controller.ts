import { Request, Response } from 'express'
import { sendResponse } from '../../utils/send-response'

const REACTIONS = [
  { content: '+1',      emoji: '👍', label: 'Thumbs up' },
  { content: '-1',      emoji: '👎', label: 'Thumbs down' },
  { content: 'laugh',   emoji: '😄', label: 'Laugh' },
  { content: 'hooray',  emoji: '🎉', label: 'Hooray' },
  { content: 'confused',emoji: '😕', label: 'Confused' },
  { content: 'heart',   emoji: '❤️', label: 'Heart' },
  { content: 'rocket',  emoji: '🚀', label: 'Rocket' },
  { content: 'eyes',    emoji: '👀', label: 'Eyes' }
] as const

const listValidReactions = (_req: Request, res: Response) => {
  sendResponse(res, 200, true, 'Valid reactions retrieved successfully', REACTIONS)
}

export const ReactionsController = {
  listValidReactions
}
