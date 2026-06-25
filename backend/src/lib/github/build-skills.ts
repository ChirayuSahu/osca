import type { Skill } from './types'

export const buildSkillList = (
  languageTotals: Record<string, number>,
  frameworkSet: Set<string>
): Skill[] => {
  const skills: Skill[] = []
  const totalBytes = Object.values(languageTotals).reduce((sum, bytes) => sum + bytes, 0)

  if (totalBytes > 0) {
    const sorted = Object.entries(languageTotals).sort((a, b) => b[1] - a[1])
    for (const [lang, bytes] of sorted) {
      const rawScore = (bytes / totalBytes) * 100
      const proficiency = Math.min(Math.round(rawScore * 1.5 + 10), 100)
      if (proficiency >= 5) {
        skills.push({ name: lang, proficiencyScore: proficiency })
      }
    }
  }

  for (const framework of frameworkSet) {
    skills.push({ name: framework, proficiencyScore: 70 })
  }

  return skills
}
