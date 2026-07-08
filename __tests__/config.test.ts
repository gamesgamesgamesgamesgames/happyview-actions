import { describe, it, expect } from 'vitest'
import { normalizeUrl, normalizeAdminPath, parseChangedFiles } from '../src/core/config'

describe('normalizeUrl', () => {
  it('strips trailing slashes and trims', () => {
    expect(normalizeUrl('https://hv.example.com/')).toBe('https://hv.example.com')
    expect(normalizeUrl('  https://hv.example.com//  ')).toBe('https://hv.example.com')
  })
})

describe('normalizeAdminPath', () => {
  it('ensures a single leading slash and no trailing slash', () => {
    expect(normalizeAdminPath('/admin')).toBe('/admin')
    expect(normalizeAdminPath('admin/')).toBe('/admin')
    expect(normalizeAdminPath('/hv/admin/')).toBe('/hv/admin')
    expect(normalizeAdminPath('')).toBe('/')
  })
})

describe('parseChangedFiles', () => {
  it('parses a JSON array', () => {
    expect(parseChangedFiles('["a.json","b.lua"]')).toEqual(['a.json', 'b.lua'])
  })
  it('parses a newline list', () => {
    expect(parseChangedFiles('a.json\n b.lua \n')).toEqual(['a.json', 'b.lua'])
  })
  it('returns [] for empty input', () => {
    expect(parseChangedFiles('   ')).toEqual([])
  })
})
