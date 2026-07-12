import { NPM_FRAMEWORK_MAP, PYTHON_FRAMEWORK_MAP } from './framework-maps'

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
