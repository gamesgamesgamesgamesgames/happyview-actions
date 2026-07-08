import * as core from '@actions/core'
import { normalizeUrl, normalizeAdminPath, parseChangedFiles } from '../core/config'
import { discover } from '../core/discovery'
import { buildPlan } from '../core/plan'
import { HappyViewClient } from './client'
import { runDeploy } from './deploy'
import { writeSummary, setOutputs } from './summary'

async function run(): Promise<void> {
  try {
    const cwd = process.cwd()
    const inputs = {
      lexicons: core.getInput('lexicons') || 'lexicons/**/*.json',
      scripts: core.getInput('scripts') || 'lua/**/*.lua',
      jobs: core.getInput('jobs') || 'jobs/**/*.lua',
      labelers: core.getInput('labelers') || 'labelers/**/*.lua',
    }
    const baseUrl = normalizeUrl(core.getInput('happyview-url', { required: true }))
    const adminPath = normalizeAdminPath(core.getInput('admin-path') || '/admin')
    const apiKey = core.getInput('api-key', { required: true })
    const backfill = core.getBooleanInput('backfill')
    const prune = core.getBooleanInput('prune')
    const dryRun = core.getBooleanInput('dry-run')
    const changedFiles = parseChangedFiles(core.getInput('changed-files'))

    const discovery = await discover(inputs, cwd)
    const plan = buildPlan(discovery, changedFiles)
    const client = new HappyViewClient({ baseUrl, adminPath, apiKey })
    const result = await runDeploy(plan, client, { cwd, backfill, prune, dryRun })

    for (const l of result.logs) core.info(l)
    setOutputs(result)
    await writeSummary(result)

    if (result.errors.length) {
      for (const e of result.errors) core.error(e)
      core.setFailed(`${result.errors.length} error(s) during deploy`)
    }
  } catch (e) {
    core.setFailed((e as Error).message)
  }
}

void run()
