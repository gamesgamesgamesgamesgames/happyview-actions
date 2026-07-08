import { describe, it, expect } from 'vitest'
import path from 'node:path'
import { discover } from '../src/core/discovery'

const cwd = path.join(__dirname, 'fixtures', 'tree')
const inputs = {
  lexicons: 'lexicons/**/*.json\n!lexicons/**/_experimental/**',
  scripts: 'lua/**/*.lua',
  jobs: 'jobs/**/*.lua',
  labelers: 'labelers/**/*.lua',
}

describe('discover', () => {
  it('parses lexicons and lists lua files by category', async () => {
    const d = await discover(inputs, cwd)
    expect(d.lexicons).toContainEqual({
      file: 'lexicons/games/g5/getGame.json',
      rel: 'games/g5/getGame.json',
      nsid: 'games.g5.getGame',
      mainType: 'query',
      json: { lexicon: 1, id: 'games.g5.getGame', defs: { main: { type: 'query' } } },
      parseError: null,
    })
    expect(d.scripts).toEqual([{ file: 'lua/games/g5/getGame.lua', rel: 'games/g5/getGame.lua' }])
    expect(d.jobs.map((f) => f.file).sort()).toEqual(['jobs/export/users.lua', 'jobs/migration.claim.lua'])
    expect(d.labelers.map((f) => f.file).sort()).toEqual(['labelers/_actor.lua', 'labelers/app.bsky.feed.post.lua'])
  })
})
