import { NPM_FRAMEWORK_MAP, PYTHON_FRAMEWORK_MAP } from '../utils/constants'
import type { Skill } from '../types'

export const detectNpmFrameworks = (
  pkgJson: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> },
  frameworkSet: Set<string>
): void => {
  const allDeps = { ...pkgJson.dependencies, ...pkgJson.devDependencies }
  for (const dep of Object.keys(allDeps)) {
    const mapped = NPM_FRAMEWORK_MAP[dep]
    if (mapped) {
      frameworkSet.add(mapped)
    }
  }
}

export const detectPythonFrameworks = (requirementsTxt: string, frameworkSet: Set<string>): void => {
  for (const line of requirementsTxt.split('\n')) {
    const pkg = line.trim().split(/[=<>!]/)[0].toLowerCase()
    const mapped = PYTHON_FRAMEWORK_MAP[pkg]
    if (mapped) {
      frameworkSet.add(mapped)
    }
  }
}

export const parsePackageJson = (data: unknown): { dependencies?: Record<string, string>; devDependencies?: Record<string, string> } => {
  if (typeof data === 'string') {
    return JSON.parse(data)
  }
  return data as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> }
}

export const parseRawContent = (data: unknown): string => (typeof data === 'string' ? data : '')

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
