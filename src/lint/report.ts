import * as core from '@actions/core'
import type { LintReport } from './rules'

export function summaryRows(rep: LintReport): string[][] {
  return [
    ['Errors', String(rep.errors.length)],
    ['Warnings', String(rep.warnings.length)],
  ]
}

export async function report(rep: LintReport, failOn: 'error' | 'warning'): Promise<void> {
  for (const w of rep.warnings) core.warning(w.message, { file: w.file })
  for (const e of rep.errors) core.error(e.message, { file: e.file })

  core.setOutput('errors', rep.errors.length)
  core.setOutput('warnings', rep.warnings.length)

  const header = [
    { data: 'Item', header: true },
    { data: 'Count', header: true },
  ]
  core.summary.addHeading('HappyView Lint', 2).addTable([header, ...summaryRows(rep)])
  await core.summary.write()

  const fail = rep.errors.length > 0 || (failOn === 'warning' && rep.warnings.length > 0)
  if (fail) core.setFailed(`lint failed: ${rep.errors.length} error(s), ${rep.warnings.length} warning(s)`)
}
