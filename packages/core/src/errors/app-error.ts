import type { ErrorCode } from './codes.js'

export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    readonly detail?: Record<string, unknown>,
    override readonly cause?: unknown,
  ) {
    super(code)
    this.name = 'AppError'
  }
}
