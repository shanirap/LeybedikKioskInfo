import { describe, expect, it } from 'vitest'
import { toggleInstrumentIds } from './instrumentForm'

describe('toggleInstrumentIds', () => {
  it('adds an instrument id when it is not selected', () => {
    expect(toggleInstrumentIds([1], 2)).toEqual([1, 2])
  })

  it('removes an instrument id when it is already selected', () => {
    expect(toggleInstrumentIds([1, 2], 1)).toEqual([2])
  })

  it('returns a new array without mutating the original selection', () => {
    const selected = [1]
    const next = toggleInstrumentIds(selected, 2)

    expect(next).toEqual([1, 2])
    expect(selected).toEqual([1])
  })
})
