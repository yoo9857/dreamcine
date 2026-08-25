import { NotImplementedError } from '../errors/not-implemented.js'

export function sanitizeUserText(_value: string): string {
  throw new NotImplementedError('T10:sanitizeText')
}
