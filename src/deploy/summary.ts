import * as core from '@actions/core'
import type { DeployResult } from './deploy'

export function summaryRows(r: DeployResult): string[][] {
  return [
    ['Lexicons deployed', String(r.lexiconsDeployed)],
    ['Scripts deployed', String(r.scriptsDeployed)],
    ['Jobs deployed', String(r.jobsDeployed)],
    ['Labelers deployed', String(r.labelersDeployed)],
    ['Lexicons pruned', String(r.lexiconsPruned)],
    ['Scripts pruned', String(r.scriptsPruned)],
    ['Errors', String(r.errors.length)],
  ]
}

export function setOutputs(r: DeployResult): void {
  core.setOutput('lexicons-deployed', r.lexiconsDeployed)
  core.setOutput('scripts-deployed', r.scriptsDeployed)
  core.setOutput('jobs-deployed', r.jobsDeployed)
  core.setOutput('labelers-deployed', r.labelersDeployed)
  core.setOutput('lexicons-pruned', r.lexiconsPruned)
  core.setOutput('scripts-pruned', r.scriptsPruned)
  core.setOutput('errors', r.errors.length)
}

export async function writeSummary(r: DeployResult): Promise<void> {
  const header = [
    { data: 'Item', header: true },
    { data: 'Count', header: true },
  ]
  core.summary.addHeading('HappyView Deploy', 2).addTable([header, ...summaryRows(r)])
  for (const e of r.errors) core.summary.addRaw(`\n- ❌ ${e}`)
  await core.summary.write()
}
