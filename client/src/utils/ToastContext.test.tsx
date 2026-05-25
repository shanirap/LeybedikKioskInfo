import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ToastProvider } from './ToastContext'
import { useToast } from './useToast'

function ToastHarness() {
  const { showSuccess, showError } = useToast()

  return (
    <div>
      <button type="button" onClick={() => showSuccess('הפעולה הצליחה.')}>
        success
      </button>
      <button type="button" onClick={() => showError('הפעולה נכשלה.')}>
        error
      </button>
    </div>
  )
}

describe('ToastProvider', () => {
  it('shows success and error toasts with status role', async () => {
    render(
      <ToastProvider>
        <ToastHarness />
      </ToastProvider>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'success' }))
    expect(screen.getByRole('status')).toHaveTextContent('הפעולה הצליחה.')
    expect(screen.getByRole('status')).toHaveClass('toast-success')

    await userEvent.click(screen.getByRole('button', { name: 'error' }))
    expect(screen.getByRole('status')).toHaveTextContent('הפעולה נכשלה.')
    expect(screen.getByRole('status')).toHaveClass('toast-error')
  })

  it('throws when useToast is used outside the provider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => render(<ToastHarness />)).toThrow('useToast must be used within ToastProvider')

    consoleError.mockRestore()
  })
})
