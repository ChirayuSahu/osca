// Keywords describing what a project (or a person's work) is about, from GitHub
// topics, the description and the README. Used to match people with projects of
// the same kind beyond the programming language: "cli", "terminal", "editor".

const STOPWORDS = new Set(`
a about above after again all also am an and any are as at be because been before being below between both but by
can could did do does doing down during each few for from further get gets got had has have having he her here hers
him his how i if in into is it its itself just let me more most my no nor not now of off on once only or other our
ours out over own same she should so some such than that the their theirs them then there these they this those
through to too under until up us very was we were what when where which while who whom why will with would you your
yours yourself via per etc eg ie using use used uses based built build builds make makes made new simple easy fast
lightweight small tiny modern powerful awesome best better great nice official open source opensource project projects
repo repository library libraries lib tool tools toolkit app apps application applications framework frameworks module
modules package packages plugin plugins code example examples sample demo version support supports supported feature
features including include includes provide provides written implementation implementations way ways work works
working help one two first get started getting install installation installing run running setup docs documentation
readme license mit apache copyright contributing contributors contribute contribution please see also check note
https http www com org io github gitlab master main branch release releases latest npm pip yarn cargo brew issue issues
pull request requests pr prs star stars fork forks thanks thank welcome want need like just well still even many much
every within without across around along already always another anything because become does done either else enough
ever full high however instead keep known less long low many might must never next often once part quite rather really
since sure take takes though thus together toward usually want yet free quick quickly via inc ltd yes no true false
nbsp amp quot hacktoberfest badge badges shield shields img png svg gif jpg logo screenshot discord twitter slack
sponsor sponsors sponsored backer backers donate patreon opencollective website homepage changelog roadmap faq
`.split(/\s+/).filter(Boolean))

// The language itself is already scored by the skill match
const LANGUAGE_WORDS = new Set([
  'javascript', 'typescript', 'python', 'java', 'go', 'golang', 'rust', 'ruby', 'php', 'kotlin', 'swift', 'dart',
  'c', 'c++', 'cpp', 'c#', 'csharp', 'scala', 'haskell', 'elixir', 'lua', 'zig', 'julia', 'clojure', 'shell', 'bash',
  'html', 'css', 'js', 'ts', 'py', 'rb', 'rs'
])

// Short words that still mean something
const SHORT_OK = new Set(['ai', 'ml', 'ui', 'ux', 'ci', 'cd', 'db', 'os', 'vm', 'ar', 'vr', 'xr', '3d', '2d', 'gpu', 'cpu', 'api', 'cli', 'gui', 'tui', 'sdk', 'orm', 'iot', 'nlp', 'llm', 'sql', 'k8s'])

// Words whose trailing "s" isn't a plural
const NO_FOLD = new Set(['kubernetes', 'postgres', 'redis', 'graphics', 'analytics', 'physics', 'statistics', 'devops', 'news', 'series', 'aws', 'ios', 'macos', 'dns', 'https', 'canvas', 'wasm'])

const normalize = (word: string): string | null => {
  let w = word.toLowerCase().replace(/^[.\-]+|[.\-]+$/g, '')
  if (!w || /^\d+$/.test(w)) return null
  if (w.length < 3 && !SHORT_OK.has(w)) return null
  if (w.length > 30 || STOPWORDS.has(w) || LANGUAGE_WORDS.has(w)) return null
  // Fold simple plurals: "editors" → "editor", "games" → "game", but not "css" or "kubernetes"
  if (w.length > 4 && w.endsWith('s') && !/(ss|us|is)$/.test(w) && !NO_FOLD.has(w)) w = w.slice(0, -1)
  return w
}

const words = (text: string): string[] =>
  text
    .replace(/```[\s\S]*?```/g, ' ') // code blocks
    .replace(/<[^>]+>/g, ' ') // html
    .replace(/&[a-z]+;|&#\d+;/gi, ' ') // html entities
    .replace(/https?:\/\/\S+/g, ' ') // links
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1') // markdown links → their text
    .split(/[^A-Za-z0-9+#.\-]+/)
    .map(normalize)
    .filter((w): w is string => w !== null)

export type KeywordSource = {
  topics?: string[]
  description?: string | null
  readme?: string | null
}

/** Top keywords for a project: topics count most, then the description, then the README */
export const extractKeywords = ({ topics = [], description, readme }: KeywordSource, limit = 15): string[] => {
  const score = new Map<string, number>()
  const add = (w: string, n: number) => score.set(w, (score.get(w) ?? 0) + n)

  for (const topic of topics) {
    const whole = normalize(topic)
    if (whole) add(whole, 4)
    for (const part of topic.split('-')) {
      const w = normalize(part)
      if (w && w !== whole) add(w, 1.5)
    }
  }
  for (const w of words(description ?? '')) add(w, 2)
  // README counts with diminishing returns so one repeated word can't dominate
  const readmeCounts = new Map<string, number>()
  for (const w of words((readme ?? '').slice(0, 6000))) readmeCounts.set(w, (readmeCounts.get(w) ?? 0) + 1)
  for (const [w, n] of readmeCounts) if (n >= 2) add(w, Math.log2(n))

  return [...score.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([w]) => w)
}

/** Weighted keywords across many projects (a person's repos): frequent ones weigh more */
export const aggregateKeywords = (sources: KeywordSource[], limit = 30): Array<{ name: string; weight: number }> => {
  const counts = new Map<string, number>()
  for (const source of sources) {
    for (const w of extractKeywords(source, 10)) counts.set(w, (counts.get(w) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([name, n]) => ({ name, weight: Math.round(Math.log2(1 + n) * 100) / 100 }))
}

// Onboarding interest areas → the keywords projects in that area tend to have
export const INTEREST_AREAS: Record<string, string[]> = {
  web: ['web', 'frontend', 'react', 'nextjs', 'vue', 'website', 'css', 'component'],
  backend: ['backend', 'api', 'server', 'database', 'graphql', 'rest', 'microservice'],
  mobile: ['mobile', 'android', 'ios', 'react-native', 'flutter', 'app'],
  ai: ['ai', 'machine-learning', 'deep-learning', 'llm', 'nlp', 'model', 'pytorch', 'agent'],
  data: ['data', 'data-science', 'analytics', 'visualization', 'pandas', 'jupyter', 'etl'],
  devtools: ['cli', 'terminal', 'developer-tool', 'editor', 'linter', 'formatter', 'productivity'],
  devops: ['devops', 'kubernetes', 'docker', 'cloud', 'infrastructure', 'terraform', 'monitoring'],
  games: ['game', 'game-engine', 'game-development', 'godot', 'graphics', '3d'],
  security: ['security', 'privacy', 'encryption', 'authentication', 'vulnerability'],
  docs: ['documentation', 'docs', 'tutorial', 'education', 'learning', 'beginner'],
  systems: ['system', 'embedded', 'kernel', 'compiler', 'performance', 'wasm'],
  design: ['design', 'ui', 'ux', 'accessibility', 'animation', 'icon']
}

export const keywordsForInterestAreas = (areas: string[]): Array<{ name: string; weight: number }> => {
  const seen = new Map<string, number>()
  for (const area of areas) {
    for (const word of INTEREST_AREAS[area] ?? []) {
      // Same normalization as project keywords, so the two sides match
      const w = normalize(word)
      if (w) seen.set(w, 2)
    }
  }
  return [...seen.entries()].map(([name, weight]) => ({ name, weight }))
}
