import fg from 'fast-glob'
import globParent from 'glob-parent'
import path from 'node:path'

export interface Selection {
  file: string
  base: string
  rel: string
}

export function parsePatterns(input: string): { includes: string[]; excludes: string[] } {
  const includes: string[] = []
  const excludes: string[] = []
  for (const raw of input.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) continue
    if (line.startsWith('!')) excludes.push(line.slice(1).trim())
    else includes.push(line)
  }
  return { includes, excludes }
}

export async function selectFiles(input: string, cwd: string): Promise<Selection[]> {
  const { includes, excludes } = parsePatterns(input)
  const seen = new Set<string>()
  const out: Selection[] = []
  for (const pattern of includes) {
    const base = globParent(pattern)
    const matches = await fg(pattern, { cwd, ignore: excludes, dot: true, onlyFiles: true })
    for (const file of matches) {
      if (seen.has(file)) continue
      seen.add(file)
      const rel = base === '.' ? file : path.posix.relative(base, file)
      out.push({ file, base, rel })
    }
  }
  return out.sort((a, b) => a.file.localeCompare(b.file))
}
