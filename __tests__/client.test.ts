import { describe, it, expect, vi } from 'vitest'
import { HappyViewClient } from '../src/deploy/client'

function mockFetch(handler: (url: string, init?: RequestInit) => { status: number; body?: unknown }) {
  return vi.fn(async (url: string, init?: RequestInit) => {
    const { status, body } = handler(url, init)
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
      text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
    } as Response
  }) as unknown as typeof fetch
}

const opts = (fetchImpl: typeof fetch) => ({ baseUrl: 'https://hv.example.com', adminPath: '/admin', apiKey: 'hv_key', fetchImpl })

describe('HappyViewClient', () => {
  it('lists lexicon nsids', async () => {
    const f = mockFetch((url) => {
      expect(url).toBe('https://hv.example.com/admin/lexicons')
      return { status: 200, body: [{ id: 'a.b' }, { id: 'c.d' }, {}] }
    })
    const c = new HappyViewClient(opts(f))
    expect(await c.listLexicons()).toEqual(['a.b', 'c.d'])
  })

  it('upserts a lexicon with bearer auth and backfill', async () => {
    const f = mockFetch((url, init) => {
      expect(url).toBe('https://hv.example.com/admin/lexicons')
      expect(init?.method).toBe('POST')
      expect((init?.headers as Record<string, string>)['Authorization']).toBe('Bearer hv_key')
      expect(JSON.parse(init?.body as string)).toEqual({ lexicon_json: { id: 'a.b' }, backfill: true })
      return { status: 200 }
    })
    await new HappyViewClient(opts(f)).upsertLexicon({ id: 'a.b' }, true)
  })

  it('throws on non-2xx upsert', async () => {
    const f = mockFetch(() => ({ status: 400, body: 'bad' }))
    await expect(new HappyViewClient(opts(f)).upsertScript('job.run:x', 'code')).rejects.toThrow(/400/)
  })

  it('url-encodes the trigger id on script delete and tolerates 404', async () => {
    const f = mockFetch((url) => {
      expect(url).toBe('https://hv.example.com/admin/scripts/xrpc.query%3Aa.b')
      return { status: 404 }
    })
    await expect(new HappyViewClient(opts(f)).deleteScript('xrpc.query:a.b')).resolves.toBeUndefined()
  })
})
