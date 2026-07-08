import * as core from '@actions/core'
import { discover } from '../core/discovery'
import { lint } from './rules'
import { report } from './report'

async function run(): Promise<void> {
  try {
    const cwd = process.cwd()
    const inputs = {
      lexicons: core.getInput('lexicons') || 'lexicons/**/*.json',
      scripts: core.getInput('scripts') || 'lua/**/*.lua',
      jobs: core.getInput('jobs') || 'jobs/**/*.lua',
      labelers: core.getInput('labelers') || 'labelers/**/*.lua',
    }
    const checkLuaSyntax = core.getBooleanInput('check-lua-syntax')
    const failOnInput = core.getInput('fail-on') || 'error'
    const failOn = failOnInput === 'warning' ? 'warning' : 'error'

    const discovery = await discover(inputs, cwd)
    const rep = await lint(discovery, { cwd, checkLuaSyntax })
    await report(rep, failOn)
  } catch (e) {
    core.setFailed((e as Error).message)
  }
}

void run()
