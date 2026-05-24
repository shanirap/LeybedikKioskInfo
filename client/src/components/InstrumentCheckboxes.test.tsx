import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { InstrumentCheckboxes } from './InstrumentCheckboxes'
import { instruments } from '../test/fixtures'

describe('InstrumentCheckboxes', () => {
  it('reflects selected instruments and toggles through onToggle', async () => {
    const onToggle = vi.fn()

    render(
      <InstrumentCheckboxes instruments={instruments} selectedIds={[1]} onToggle={onToggle} />,
    )

    expect(screen.getByLabelText('Piano')).toBeChecked()
    expect(screen.getByLabelText('Violin')).not.toBeChecked()

    await userEvent.click(screen.getByLabelText('Violin'))
    expect(onToggle).toHaveBeenCalledWith(2)
  })
})
