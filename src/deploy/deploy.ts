import fs from 'node:fs/promises'
import path from 'node:path'
import { triggerCategory } from '../core/triggers'
import type { Plan } from '../core/plan'
import type { HappyViewClient } from './client'

export interface DeployOptions {
  cwd: string
  backfill: boolean
  prune: boolean
  dryRun: boolean
}

export interface DeployResult {
  lexiconsDeployed: number
  scriptsDeployed: number
  jobsDeployed: number
  labelersDeployed: number
  lexiconsPruned: number
  scriptsPruned: number
  errors: string[]
  logs: string[]
}

function bump(r: DeployResult, cat: 'script' | 'job' | 'labeler'): void {
  if (cat === 'job') r.jobsDeployed++
  else if (cat === 'labeler') r.labelersDeployed++
  else r.scriptsDeployed++
}

export async function runDeploy(plan: Plan, client: HappyViewClient, opts: DeployOptions): Promise<DeployResult> {
  const r: DeployResult = {
    lexiconsDeployed: 0,
    scriptsDeployed: 0,
    jobsDeployed: 0,
    labelersDeployed: 0,
    lexiconsPruned: 0,
    scriptsPruned: 0,
    errors: [],
    logs: [],
  }

  for (const d of plan.diagnostics) {
    if (d.level === 'error') r.errors.push(`${d.file}: ${d.message}`)
  }

  const wantLex = new Set<string>()
  const wantScript = new Set<string>()
  for (const it of plan.allItems) {
    if (it.kind === 'lexicon') wantLex.add(it.nsid)
    else wantScript.add(it.trigger)
  }

  for (const it of plan.items) {
    if (it.kind === 'lexicon') {
      if (opts.dryRun) {
        r.logs.push(`would upsert lexicon ${it.nsid}`)
        r.lexiconsDeployed++
        continue
      }
      try {
        await client.upsertLexicon(it.json, opts.backfill)
        r.lexiconsDeployed++
        r.logs.push(`lexicon ${it.nsid}`)
      } catch (e) {
        r.errors.push((e as Error).message)
      }
    } else {
      const cat = triggerCategory(it.trigger)
      if (opts.dryRun) {
        r.logs.push(`would upsert ${cat} ${it.trigger}`)
        bump(r, cat)
        continue
      }
      try {
        const body = await fs.readFile(path.join(opts.cwd, it.file), 'utf8')
        await client.upsertScript(it.trigger, body)
        bump(r, cat)
        r.logs.push(`${cat} ${it.trigger}`)
      } catch (e) {
        r.errors.push((e as Error).message)
      }
    }
  }

  if (opts.prune) {
    try {
      for (const nsid of await client.listLexicons()) {
        if (wantLex.has(nsid)) continue
        if (opts.dryRun) {
          r.logs.push(`would prune lexicon ${nsid}`)
          r.lexiconsPruned++
          continue
        }
        try {
          await client.deleteLexicon(nsid)
          r.lexiconsPruned++
          r.logs.push(`pruned lexicon ${nsid}`)
        } catch (e) {
          r.errors.push((e as Error).message)
        }
      }
      for (const id of await client.listScripts()) {
        if (wantScript.has(id)) continue
        if (opts.dryRun) {
          r.logs.push(`would prune script ${id}`)
          r.scriptsPruned++
          continue
        }
        try {
          await client.deleteScript(id)
          r.scriptsPruned++
          r.logs.push(`pruned script ${id}`)
        } catch (e) {
          r.errors.push((e as Error).message)
        }
      }
    } catch (e) {
      r.errors.push(`prune: ${(e as Error).message}`)
    }
  }

  return r
}
