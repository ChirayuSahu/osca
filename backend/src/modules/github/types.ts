export interface Skill {
  name: string
  proficiencyScore: number
}

export type ProgressCallback = (percent: number, message: string) => Promise<void> | void

export const noopProgress: ProgressCallback = () => {}
