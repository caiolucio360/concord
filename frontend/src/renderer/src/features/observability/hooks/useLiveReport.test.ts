import { describe, expect, it } from 'vitest'
import { ApiError } from '../../../shared/api/client'
import { failedState } from './useLiveReport'

describe('failedState', () => {
  it('403 = só devs; outros erros = tentar de novo', () => {
    expect(failedState(new ApiError(403, 'devs only'))).toEqual({ status: 'forbidden' })
    expect(failedState(new ApiError(500, 'x'))).toEqual({ status: 'error' })
    expect(failedState(new Error('rede'))).toEqual({ status: 'error' })
  })
})
