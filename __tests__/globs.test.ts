import { describe, it, expect } from 'vitest'
import path from 'node:path'
import { parsePatterns, selectFiles } from '../src/core/globs'

const cwd = path.join(__dirname, 'fixtures', 'tree')

describe('parsePatterns', () => {
  it('separates includes and excludes', () => {
    expect(parsePatterns('lexicons/**/*.json\n!lexicons/**/_experimental/**')).toEqual({
      includes: ['lexicons/**/*.json'],
      excludes: ['lexicons/**/_experimental/**'],
    })
  })
})

describe('selectFiles', () => {
  it('derives base and rel from the matching include pattern', async () => {
    const sels = await selectFiles('lua/**/*.lua', cwd)
    expect(sels).toEqual([{ file: 'lua/games/g5/getGame.lua', base: 'lua', rel: 'games/g5/getGame.lua' }])
  })

  it('honors excludes', async () => {
    const sels = await selectFiles('lexicons/**/*.json\n!lexicons/**/_experimental/**', cwd)
    expect(sels.map((s) => s.file)).toEqual(['lexicons/games/g5/getGame.json'])
  })

  it('supports multiple include roots with distinct bases', async () => {
    const sels = await selectFiles('jobs/**/*.lua', cwd)
    expect(sels).toContainEqual({ file: 'jobs/export/users.lua', base: 'jobs', rel: 'export/users.lua' })
    expect(sels).toContainEqual({ file: 'jobs/migration.claim.lua', base: 'jobs', rel: 'migration.claim.lua' })
  })

  it('assigns distinct bases from distinct include patterns', async () => {
    const sels = await selectFiles('lexicons/**/*.json\nlua/**/*.lua', cwd)
    expect(sels).toContainEqual({ file: 'lexicons/games/g5/getGame.json', base: 'lexicons', rel: 'games/g5/getGame.json' })
    expect(sels).toContainEqual({ file: 'lua/games/g5/getGame.lua', base: 'lua', rel: 'games/g5/getGame.lua' })
  })

  it('first matching include pattern wins the base for an overlapping file', async () => {
    // both patterns match lua/games/g5/getGame.lua; the first (base 'lua') must win
    const sels = await selectFiles('lua/**/*.lua\nlua/games/**/*.lua', cwd)
    const hit = sels.filter((s) => s.file === 'lua/games/g5/getGame.lua')
    expect(hit).toEqual([{ file: 'lua/games/g5/getGame.lua', base: 'lua', rel: 'games/g5/getGame.lua' }])
  })
})
