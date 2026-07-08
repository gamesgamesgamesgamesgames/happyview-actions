export function normalizeUrl(url: string): string {
  return url.trim().replace(/\/+$/, '')
}

export function normalizeAdminPath(p: string): string {
  let s = p.trim().replace(/\/+$/, '')
  if (!s.startsWith('/')) s = '/' + s
  return s
}

export function parseChangedFiles(input: string): string[] {
  const s = input.trim()
  if (!s) return []
  if (s.startsWith('[')) {
    const arr = JSON.parse(s)
    return Array.isArray(arr) ? arr.map(String) : []
  }
  return s
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
}
