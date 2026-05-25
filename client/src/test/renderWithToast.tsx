import { render, type RenderOptions } from '@testing-library/react'
import type { ReactElement } from 'react'
import { ToastProvider } from '../utils/ToastContext'

export function renderWithToast(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, {
    wrapper: ({ children }) => <ToastProvider>{children}</ToastProvider>,
    ...options,
  })
}
