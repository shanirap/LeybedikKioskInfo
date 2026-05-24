import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ConfirmDialog } from './ConfirmDialog'

describe('ConfirmDialog', () => {
  it('calls confirm and cancel handlers from the dialog actions', async () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()

    render(
      <ConfirmDialog
        title="ארכוב חומר"
        message="האם להעביר את החומר לארכיון?"
        confirmLabel="ארכוב"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'ארכוב חומר' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'ארכוב' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)

    await userEvent.click(screen.getByRole('button', { name: 'ביטול' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('closes when clicking the backdrop', async () => {
    const onCancel = vi.fn()

    render(
      <ConfirmDialog
        title="אישור"
        message="להמשיך?"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    )

    await userEvent.click(document.querySelector('.confirm-dialog-backdrop')!)
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})
