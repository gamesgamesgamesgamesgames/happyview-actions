export interface ClientOptions {
  baseUrl: string
  adminPath: string
  apiKey: string
  fetchImpl?: typeof fetch
}

export class HappyViewClient {
  private readonly base: string
  private readonly key: string
  private readonly f: typeof fetch

  constructor(opts: ClientOptions) {
    this.base = `${opts.baseUrl}${opts.adminPath}`
    this.key = opts.apiKey
    this.f = opts.fetchImpl ?? fetch
  }

  private headers(): Record<string, string> {
    return { Authorization: `Bearer ${this.key}`, 'Content-Type': 'application/json' }
  }

  private async listIds(kind: 'lexicons' | 'scripts'): Promise<string[]> {
    const res = await this.f(`${this.base}/${kind}`, { headers: this.headers() })
    if (!res.ok) throw new Error(`GET /${kind} -> HTTP ${res.status}`)
    const data = (await res.json()) as Array<{ id?: string }>
    return data.map((d) => d.id).filter((x): x is string => typeof x === 'string')
  }

  listLexicons(): Promise<string[]> {
    return this.listIds('lexicons')
  }

  listScripts(): Promise<string[]> {
    return this.listIds('scripts')
  }

  async upsertLexicon(json: unknown, backfill: boolean): Promise<void> {
    const res = await this.f(`${this.base}/lexicons`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ lexicon_json: json, backfill }),
    })
    if (!res.ok) throw new Error(`POST /lexicons -> HTTP ${res.status}: ${await res.text()}`)
  }

  async deleteLexicon(nsid: string): Promise<void> {
    const res = await this.f(`${this.base}/lexicons/${encodeURIComponent(nsid)}`, {
      method: 'DELETE',
      headers: this.headers(),
    })
    if (!res.ok && res.status !== 404) throw new Error(`DELETE /lexicons/${nsid} -> HTTP ${res.status}`)
  }

  async upsertScript(id: string, body: string): Promise<void> {
    const res = await this.f(`${this.base}/scripts`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ id, script_type: 'lua', body }),
    })
    if (!res.ok) throw new Error(`POST /scripts (${id}) -> HTTP ${res.status}: ${await res.text()}`)
  }

  async deleteScript(id: string): Promise<void> {
    const res = await this.f(`${this.base}/scripts/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: this.headers(),
    })
    if (!res.ok && res.status !== 404) throw new Error(`DELETE /scripts/${id} -> HTTP ${res.status}`)
  }
}
