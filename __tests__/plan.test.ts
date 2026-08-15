import { describe, it, expect } from 'vitest'
import { buildPlan } from '../src/core/plan'
import type { Discovery } from '../src/core/discovery'

function d(partial: Partial<Discovery>): Discovery {
  return { lexicons: [], scripts: [], jobs: [], labelers: [], ...partial }
}

describe('buildPlan', () => {
  it('pairs a query lexicon with its script and derives triggers', () => {
    const plan = buildPlan(
      d({
        lexicons: [
          { file: 'lexicons/com/g/getGame.json', rel: 'com/g/getGame.json', nsid: 'com.g.getGame', mainType: 'query', json: { id: 'com.g.getGame' }, parseError: null },
        ],
        scripts: [{ file: 'lua/com/g/getGame.lua', rel: 'com/g/getGame.lua' }],
      }),
    )
    expect(plan.items).toContainEqual({ kind: 'lexicon', nsid: 'com.g.getGame', json: { id: 'com.g.getGame' }, file: 'lexicons/com/g/getGame.json' })
    expect(plan.items).toContainEqual({ kind: 'script', trigger: 'xrpc.query:com.g.getGame', file: 'lua/com/g/getGame.lua' })
    expect(plan.diagnostics).toEqual([])
  })

  it('flags an orphan script as an error', () => {
    const plan = buildPlan(d({ scripts: [{ file: 'lua/g/nope.lua', rel: 'g/nope.lua' }] }))
    expect(plan.diagnostics).toContainEqual(
      expect.objectContaining({ level: 'error', file: 'lua/g/nope.lua' }),
    )
    expect(plan.items).toEqual([])
  })

  it('warns on an unpaired query lexicon', () => {
    const plan = buildPlan(
      d({
        lexicons: [
          { file: 'lexicons/com/g/getGame.json', rel: 'com/g/getGame.json', nsid: 'com.g.getGame', mainType: 'query', json: {}, parseError: null },
        ],
      }),
    )
    expect(plan.diagnostics).toContainEqual(
      expect.objectContaining({ level: 'warning', file: 'lexicons/com/g/getGame.json' }),
    )
  })

  it('derives job and labeler triggers', () => {
    const plan = buildPlan(
      d({
        jobs: [{ file: 'jobs/migration.claim.lua', rel: 'migration.claim.lua' }],
        labelers: [{ file: 'labelers/_actor.lua', rel: '_actor.lua' }],
      }),
    )
    expect(plan.items).toContainEqual({ kind: 'script', trigger: 'job.run:migration.claim', file: 'jobs/migration.claim.lua' })
    expect(plan.items).toContainEqual({ kind: 'script', trigger: 'labeler.apply:_actor', file: 'labelers/_actor.lua' })
  })

  it('errors on a lexicon with invalid JSON', () => {
    const plan = buildPlan(
      d({ lexicons: [{ file: 'lexicons/bad.json', rel: 'bad.json', nsid: null, mainType: null, json: null, parseError: 'Unexpected token' }] }),
    )
    expect(plan.diagnostics).toContainEqual(expect.objectContaining({ level: 'error', file: 'lexicons/bad.json' }))
  })

  it('changed-files keeps a pair when either side changed', () => {
    const disc = d({
      lexicons: [
        { file: 'lexicons/com/g/getGame.json', rel: 'com/g/getGame.json', nsid: 'com.g.getGame', mainType: 'query', json: {}, parseError: null },
        { file: 'lexicons/com/g/other.json', rel: 'com/g/other.json', nsid: 'com.g.other', mainType: 'query', json: {}, parseError: null },
      ],
      scripts: [
        { file: 'lua/com/g/getGame.lua', rel: 'com/g/getGame.lua' },
        { file: 'lua/com/g/other.lua', rel: 'com/g/other.lua' },
      ],
    })
    const plan = buildPlan(disc, ['lexicons/com/g/getGame.json'])
    const files = plan.items.map((i) => i.file).sort()
    expect(files).toEqual(['lexicons/com/g/getGame.json', 'lua/com/g/getGame.lua'])
  })

  it('errors on a lexicon with an invalid NSID', () => {
    const plan = buildPlan(
      d({ lexicons: [{ file: 'lexicons/bad.json', rel: 'bad.json', nsid: 'foo', mainType: 'record', json: {}, parseError: null }] }),
    )
    expect(plan.diagnostics.some((x) => x.level === 'error' && x.file === 'lexicons/bad.json')).toBe(true)
    expect(plan.items).toEqual([])
  })

  it('errors when two lexicons resolve to the same logical path', () => {
    const plan = buildPlan(
      d({
        lexicons: [
          { file: 'lexicons/com/a/x.json', rel: 'com/a/x.json', nsid: 'com.a.x', mainType: 'record', json: {}, parseError: null },
          { file: 'vendor/com/a/x.json', rel: 'com/a/x.json', nsid: 'com.a.x2', mainType: 'record', json: {}, parseError: null },
        ],
      }),
    )
    expect(plan.diagnostics.some((x) => x.level === 'error' && /duplicate lexicon logical path/.test(x.message))).toBe(true)
  })

  it('errors on duplicate triggers', () => {
    const plan = buildPlan(
      d({
        jobs: [
          { file: 'jobs/a/x.lua', rel: 'a/x.lua' },
          { file: 'jobs/a.x.lua', rel: 'a.x.lua' },
        ],
      }),
    )
    expect(plan.diagnostics.some((x) => x.level === 'error' && /duplicate/.test(x.message))).toBe(true)
  })
})
