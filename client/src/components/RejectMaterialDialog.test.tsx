import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { RejectMaterialDialog } from './RejectMaterialDialog'

describe('RejectMaterialDialog', () => {
  it('requires a reason before rejecting and passes the trimmed value on confirm', async () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()

    render(<RejectMaterialDialog onConfirm={onConfirm} onCancel={onCancel} />)

    const rejectButton = screen.getByRole('button', { name: 'דחיית חומר' })
    expect(rejectButton).toBeDisabled()

    await userEvent.type(screen.getByLabelText('סיבת דחייה'), '  Needs work  ')
    expect(rejectButton).not.toBeDisabled()

    await userEvent.click(rejectButton)
    expect(onConfirm).toHaveBeenCalledWith('Needs work')
  })

  it('calls cancel from the dialog action and backdrop', async () => {
    const onCancel = vi.fn()

    render(<RejectMaterialDialog onConfirm={vi.fn()} onCancel={onCancel} />)

    await userEvent.click(screen.getByRole('button', { name: 'ביטול' }))
    expect(onCancel).toHaveBeenCalledTimes(1)

    await userEvent.click(document.querySelector('.confirm-dialog-backdrop')!)
    expect(onCancel).toHaveBeenCalledTimes(2)
  })
})
