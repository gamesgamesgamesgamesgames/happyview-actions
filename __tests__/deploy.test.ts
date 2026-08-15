import { describe, it, expect, vi } from 'vitest'
import path from 'node:path'
import { runDeploy } from '../src/deploy/deploy'
import type { Plan } from '../src/core/plan'
import { HappyViewClient } from '../src/deploy/client'

const cwd = path.join(__dirname, 'fixtures', 'tree')

function fakeClient(overrides: Partial<Record<keyof HappyViewClient, any>> = {}) {
  return {
    upsertLexicon: vi.fn(async () => {}),
    upsertScript: vi.fn(async () => {}),
    deleteLexicon: vi.fn(async () => {}),
    deleteScript: vi.fn(async () => {}),
    listLexicons: vi.fn(async () => [] as string[]),
    listScripts: vi.fn(async () => [] as string[]),
    ...overrides,
  } as unknown as HappyViewClient
}

const plan = (over: Partial<Plan> = {}): Plan => ({ items: [], allItems: [], diagnostics: [], ...over })

describe('runDeploy', () => {
  it('upserts lexicons and categorizes script uploads', async () => {
    const c = fakeClient()
    const p = plan({
      items: [
        { kind: 'lexicon', nsid: 'games.g5.getGame', json: { id: 'games.g5.getGame' }, file: 'lexicons/games/g5/getGame.json' },
        { kind: 'script', trigger: 'xrpc.query:games.g5.getGame', file: 'lua/games/g5/getGame.lua' },
        { kind: 'script', trigger: 'job.run:export.users', file: 'jobs/export/users.lua' },
        { kind: 'script', trigger: 'labeler.apply:_actor', file: 'labelers/_actor.lua' },
      ],
    })
    const r = await runDeploy(p, c, { cwd, backfill: true, prune: false, dryRun: false })
    expect(r.lexiconsDeployed).toBe(1)
    expect(r.scriptsDeployed).toBe(1)
    expect(r.jobsDeployed).toBe(1)
    expect(r.labelersDeployed).toBe(1)
    expect(c.upsertLexicon).toHaveBeenCalledWith({ id: 'games.g5.getGame' }, true)
    expect(c.upsertScript).toHaveBeenCalledWith('xrpc.query:games.g5.getGame', expect.any(String))
    expect(r.errors).toEqual([])
  })

  it('copies plan error diagnostics into errors', async () => {
    const c = fakeClient()
    const r = await runDeploy(plan({ diagnostics: [{ level: 'error', file: 'x', message: 'boom' }] }), c, { cwd, backfill: true, prune: false, dryRun: false })
    expect(r.errors).toContain('x: boom')
  })

  it('prunes remote ids not present in the plan', async () => {
    const c = fakeClient({
      listLexicons: vi.fn(async () => ['games.g5.getGame', 'stale.lexicon']),
      listScripts: vi.fn(async () => ['xrpc.query:games.g5.getGame', 'job.run:stale']),
    })
    const items: Plan['items'] = [
      { kind: 'lexicon', nsid: 'games.g5.getGame', json: {}, file: 'lexicons/games/g5/getGame.json' },
      { kind: 'script', trigger: 'xrpc.query:games.g5.getGame', file: 'lua/games/g5/getGame.lua' },
    ]
    const p = plan({ items, allItems: items })
    const r = await runDeploy(p, c, { cwd, backfill: true, prune: true, dryRun: false })
    expect(c.deleteLexicon).toHaveBeenCalledWith('stale.lexicon')
    expect(c.deleteScript).toHaveBeenCalledWith('job.run:stale')
    expect(r.lexiconsPruned).toBe(1)
    expect(r.scriptsPruned).toBe(1)
  })

  it('prune uses the full scan, not the changed-files-filtered items', async () => {
    const c = fakeClient({
      listLexicons: vi.fn(async () => ['com.a.b', 'com.c.d']),
      listScripts: vi.fn(async () => [] as string[]),
    })
    const full = [
      { kind: 'lexicon', nsid: 'com.a.b', json: {}, file: 'lexicons/games/g5/getGame.json' },
      { kind: 'lexicon', nsid: 'com.c.d', json: {}, file: 'lexicons/games/g5/getGame.json' },
    ] as Plan['allItems']
    // items filtered to just a.b (as if only a.b changed); allItems still has both
    const p = plan({ items: [full[0]], allItems: full })
    const r = await runDeploy(p, c, { cwd, backfill: true, prune: true, dryRun: false })
    expect(c.deleteLexicon).not.toHaveBeenCalled()
    expect(r.lexiconsPruned).toBe(0)
  })

  it('dry-run performs no network writes', async () => {
    const c = fakeClient()
    const p = plan({ items: [{ kind: 'lexicon', nsid: 'com.a.b', json: {}, file: 'lexicons/games/g5/getGame.json' }] })
    const r = await runDeploy(p, c, { cwd, backfill: true, prune: false, dryRun: true })
    expect(c.upsertLexicon).not.toHaveBeenCalled()
    expect(r.lexiconsDeployed).toBe(1)
  })
})
