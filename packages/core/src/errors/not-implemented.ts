export class NotImplementedError extends Error {
  readonly code = 'E_NOT_IMPLEMENTED'

  constructor(public readonly marker: `T${string}:${string}`) {
    super(`[SSS:S2] not implemented yet: ${marker}`)
    this.name = 'NotImplementedError'
  }
}
