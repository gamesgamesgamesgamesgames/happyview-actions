import { describe, it, expect } from 'vitest'
import path from 'node:path'
import { lint } from '../src/lint/rules'
import type { Discovery } from '../src/core/discovery'

const cwd = path.join(__dirname, 'fixtures', 'tree')

function d(partial: Partial<Discovery>): Discovery {
  return { lexicons: [], scripts: [], jobs: [], labelers: [], ...partial }
}

describe('lint', () => {
  it('reports plan errors and warnings', async () => {
    const disc = d({
      lexicons: [
        { file: 'lexicons/g/getGame.json', rel: 'g/getGame.json', nsid: 'g.getGame', mainType: 'query', json: {}, parseError: null },
      ],
      scripts: [{ file: 'lua/orphan.lua', rel: 'orphan.lua' }],
    })
    const rep = await lint(disc, { cwd, checkLuaSyntax: false })
    expect(rep.errors.some((e) => e.file === 'lua/orphan.lua')).toBe(true)
    expect(rep.warnings.some((w) => w.file === 'lexicons/g/getGame.json')).toBe(true)
  })

  it('passes valid Lua and flags invalid Lua', async () => {
    const good = await lint(d({ scripts: [{ file: 'lua/games/g5/getGame.lua', rel: 'games/g5/getGame.lua' }] }), { cwd, checkLuaSyntax: true })
    expect(good.errors.some((e) => /Lua parse/.test(e.message))).toBe(false)

    const badCwd = path.join(__dirname, 'fixtures', 'badlua')
    const bad = await lint(d({ jobs: [{ file: 'jobs/broken.lua', rel: 'broken.lua' }] }), { cwd: badCwd, checkLuaSyntax: true })
    expect(bad.errors.some((e) => /Lua parse/.test(e.message))).toBe(true)
  })
})
