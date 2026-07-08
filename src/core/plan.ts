import { deriveJobTrigger, deriveLabelerTrigger, deriveScriptTrigger, validateNsid } from './triggers'
import type { Discovery, LexiconFile } from './discovery'

export interface LexiconItem {
  kind: 'lexicon'
  nsid: string
  json: unknown
  file: string
}

export interface ScriptItem {
  kind: 'script'
  trigger: string
  file: string
}

export type PlanItem = LexiconItem | ScriptItem

export interface Diagnostic {
  level: 'error' | 'warning'
  file: string
  message: string
}

export interface Plan {
  items: PlanItem[]      // filtered by changed-files — what to upload
  allItems: PlanItem[]   // full scan, unfiltered — prune baseline
  diagnostics: Diagnostic[]
}

const stripExt = (rel: string, ext: string): string => (rel.endsWith(ext) ? rel.slice(0, -ext.length) : rel)

export function buildPlan(d: Discovery, changedFiles?: string[]): Plan {
  const items: PlanItem[] = []
  const diagnostics: Diagnostic[] = []
  const changed = changedFiles && changedFiles.length ? new Set(changedFiles) : null

  const lexByKey = new Map<string, LexiconFile>()
  for (const lex of d.lexicons) {
    if (lex.parseError) {
      diagnostics.push({ level: 'error', file: lex.file, message: `invalid JSON: ${lex.parseError}` })
      continue
    }
    if (!lex.nsid) {
      diagnostics.push({ level: 'error', file: lex.file, message: `lexicon JSON missing string 'id'` })
      continue
    }
    try {
      validateNsid(lex.nsid)
    } catch (e) {
      diagnostics.push({ level: 'error', file: lex.file, message: (e as Error).message })
      continue
    }
    const key = stripExt(lex.rel, '.json')
    const existing = lexByKey.get(key)
    if (existing) {
      diagnostics.push({ level: 'error', file: lex.file, message: `duplicate lexicon logical path '${key}' (also from ${existing.file})` })
      continue
    }
    lexByKey.set(key, lex)
  }

  const pairedLexKeys = new Set<string>()
  const pairFile = new Map<string, string>()
  const pairedScriptItems: ScriptItem[] = []

  for (const sc of d.scripts) {
    const key = stripExt(sc.rel, '.lua')
    const lex = lexByKey.get(key)
    if (!lex) {
      diagnostics.push({ level: 'error', file: sc.file, message: `script has no matching lexicon (expected a lexicon at logical path '${key}')` })
      continue
    }
    if (!lex.mainType) {
      diagnostics.push({ level: 'error', file: sc.file, message: `paired lexicon '${lex.nsid}' has no defs.main.type` })
      continue
    }
    let trigger: string
    try {
      trigger = deriveScriptTrigger(lex.mainType, lex.nsid!)
    } catch (e) {
      diagnostics.push({ level: 'error', file: sc.file, message: (e as Error).message })
      continue
    }
    pairedLexKeys.add(key)
    pairFile.set(sc.file, lex.file)
    pairFile.set(lex.file, sc.file)
    pairedScriptItems.push({ kind: 'script', trigger, file: sc.file })
  }

  for (const j of d.jobs) {
    try {
      items.push({ kind: 'script', trigger: deriveJobTrigger(j.rel), file: j.file })
    } catch (e) {
      diagnostics.push({ level: 'error', file: j.file, message: (e as Error).message })
    }
  }

  for (const l of d.labelers) {
    try {
      items.push({ kind: 'script', trigger: deriveLabelerTrigger(l.rel), file: l.file })
    } catch (e) {
      diagnostics.push({ level: 'error', file: l.file, message: (e as Error).message })
    }
  }

  for (const [key, lex] of lexByKey) {
    items.push({ kind: 'lexicon', nsid: lex.nsid!, json: lex.json, file: lex.file })
    if ((lex.mainType === 'query' || lex.mainType === 'procedure') && !pairedLexKeys.has(key)) {
      diagnostics.push({ level: 'warning', file: lex.file, message: `${lex.mainType} lexicon '${lex.nsid}' has no paired script` })
    }
  }

  items.push(...pairedScriptItems)

  const seenTrig = new Map<string, string>()
  for (const it of items) {
    if (it.kind !== 'script') continue
    const prev = seenTrig.get(it.trigger)
    if (prev) diagnostics.push({ level: 'error', file: it.file, message: `duplicate trigger '${it.trigger}' (also from ${prev})` })
    else seenTrig.set(it.trigger, it.file)
  }

  let finalItems = items
  if (changed) {
    finalItems = items.filter((it) => changed.has(it.file) || (pairFile.has(it.file) && changed.has(pairFile.get(it.file)!)))
  }

  return { items: finalItems, allItems: items, diagnostics }
}
