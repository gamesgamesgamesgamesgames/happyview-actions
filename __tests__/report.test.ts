import { describe, it, expect } from 'vitest'
import { summaryRows } from '../src/lint/report'

describe('lint summaryRows', () => {
  it('counts errors and warnings', () => {
    const rows = summaryRows({
      errors: [{ level: 'error', file: 'a', message: 'x' }],
      warnings: [{ level: 'warning', file: 'b', message: 'y' }, { level: 'warning', file: 'c', message: 'z' }],
    })
    expect(rows).toContainEqual(['Errors', '1'])
    expect(rows).toContainEqual(['Warnings', '2'])
  })
})
