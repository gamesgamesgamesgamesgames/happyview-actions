import { describe, it, expect } from 'vitest'
import { summaryRows } from '../src/deploy/summary'

describe('summaryRows', () => {
  it('produces a labeled count table', () => {
    const rows = summaryRows({
      lexiconsDeployed: 2, scriptsDeployed: 1, jobsDeployed: 3, labelersDeployed: 0,
      lexiconsPruned: 1, scriptsPruned: 0, errors: [], logs: [],
    })
    expect(rows).toContainEqual(['Lexicons deployed', '2'])
    expect(rows).toContainEqual(['Jobs deployed', '3'])
    expect(rows).toContainEqual(['Errors', '0'])
  })
})
