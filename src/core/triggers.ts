const NSID_SEG = /^[a-zA-Z][a-zA-Z0-9-]*$/
const JOB_TYPE_RE = /^[a-z0-9][a-z0-9._-]*$/

export function validateNsid(nsid: string): void {
  const segs = nsid.split('.')
  if (segs.length < 2) {
    throw new Error(`invalid NSID '${nsid}': need at least 2 dot-separated segments`)
  }
  for (const seg of segs) {
    if (!NSID_SEG.test(seg)) {
      throw new Error(`invalid NSID '${nsid}': bad segment '${seg}'`)
    }
  }
}

export function validateJobType(type: string): void {
  if (type.length < 1 || type.length > 128) {
    throw new Error(`invalid job type '${type}': must be 1–128 characters`)
  }
  if (!JOB_TYPE_RE.test(type)) {
    throw new Error(`invalid job type '${type}': must match /^[a-z0-9][a-z0-9._-]*$/`)
  }
}

export function relToDotted(rel: string): string {
  return rel.replace(/\.lua$/, '').split('/').join('.')
}

export function deriveJobTrigger(rel: string): string {
  const type = relToDotted(rel)
  validateJobType(type)
  return `job.run:${type}`
}

export function deriveLabelerTrigger(rel: string): string {
  const suffix = relToDotted(rel)
  if (suffix === '_actor') return 'labeler.apply:_actor'
  validateNsid(suffix)
  return `labeler.apply:${suffix}`
}

export function deriveScriptTrigger(mainType: string, nsid: string): string {
  switch (mainType) {
    case 'query':
      return `xrpc.query:${nsid}`
    case 'procedure':
      return `xrpc.procedure:${nsid}`
    case 'record':
      return `record.index:${nsid}`
    default:
      throw new Error(
        `lexicon '${nsid}' has type '${mainType}'; no script trigger mapping (expected query, procedure, or record)`,
      )
  }
}

export function triggerCategory(trigger: string): 'script' | 'job' | 'labeler' {
  if (trigger.startsWith('job.run:')) return 'job'
  if (trigger.startsWith('labeler.apply:')) return 'labeler'
  return 'script'
}
