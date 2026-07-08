import fs from 'node:fs/promises'
import path from 'node:path'
import luaparse from 'luaparse'
import { buildPlan, type Diagnostic } from '../core/plan'
import type { Discovery } from '../core/discovery'

export interface LintReport {
  errors: Diagnostic[]
  warnings: Diagnostic[]
}

export interface LintOptions {
  cwd: string
  checkLuaSyntax: boolean
}

export async function lint(d: Discovery, opts: LintOptions): Promise<LintReport> {
  const plan = buildPlan(d)
  const errors = plan.diagnostics.filter((x) => x.level === 'error')
  const warnings = plan.diagnostics.filter((x) => x.level === 'warning')

  if (opts.checkLuaSyntax) {
    for (const f of [...d.scripts, ...d.jobs, ...d.labelers]) {
      const src = await fs.readFile(path.join(opts.cwd, f.file), 'utf8')
      try {
        luaparse.parse(src)
      } catch (e) {
        errors.push({ level: 'error', file: f.file, message: `Lua parse error: ${(e as Error).message}` })
      }
    }
  }

  return { errors, warnings }
}
