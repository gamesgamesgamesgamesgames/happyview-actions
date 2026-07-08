import fs from 'node:fs/promises'
import path from 'node:path'
import { selectFiles, type Selection } from './globs'

export interface LexiconFile {
  file: string
  rel: string
  nsid: string | null
  mainType: string | null
  json: unknown
  parseError: string | null
}

export interface LuaFile {
  file: string
  rel: string
}

export interface Discovery {
  lexicons: LexiconFile[]
  scripts: LuaFile[]
  jobs: LuaFile[]
  labelers: LuaFile[]
}

export interface DiscoverInputs {
  lexicons: string
  scripts: string
  jobs: string
  labelers: string
}

const toLua = (sel: Selection[]): LuaFile[] => sel.map((s) => ({ file: s.file, rel: s.rel }))

export async function discover(inputs: DiscoverInputs, cwd: string): Promise<Discovery> {
  const lexSel = await selectFiles(inputs.lexicons, cwd)
  const lexicons: LexiconFile[] = []
  for (const s of lexSel) {
    const raw = await fs.readFile(path.join(cwd, s.file), 'utf8')
    let json: unknown = null
    let nsid: string | null = null
    let mainType: string | null = null
    let parseError: string | null = null
    try {
      json = JSON.parse(raw)
      const j = json as { id?: unknown; defs?: { main?: { type?: unknown } } }
      nsid = typeof j?.id === 'string' ? j.id : null
      mainType = typeof j?.defs?.main?.type === 'string' ? j.defs.main.type : null
    } catch (e) {
      parseError = (e as Error).message
    }
    lexicons.push({ file: s.file, rel: s.rel, nsid, mainType, json, parseError })
  }

  return {
    lexicons,
    scripts: toLua(await selectFiles(inputs.scripts, cwd)),
    jobs: toLua(await selectFiles(inputs.jobs, cwd)),
    labelers: toLua(await selectFiles(inputs.labelers, cwd)),
  }
}
