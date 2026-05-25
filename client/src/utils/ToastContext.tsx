import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { ToastContext, type ToastContextValue } from './toast-context'

type ToastVariant = 'success' | 'error'

type ToastState = {
  id: number
  message: string
  variant: ToastVariant
}

const TOAST_DURATION_MS = 4000

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null)
  const timeoutRef = useRef<number | null>(null)

  const clearToast = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setToast(null)
  }, [])

  const showToast = useCallback(
    (message: string, variant: ToastVariant) => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current)
      }

      setToast({ id: Date.now(), message, variant })
      timeoutRef.current = window.setTimeout(clearToast, TOAST_DURATION_MS)
    },
    [clearToast],
  )

  useEffect(() => () => clearToast(), [clearToast])

  const value: ToastContextValue = {
    showSuccess: (message: string) => showToast(message, 'success'),
    showError: (message: string) => showToast(message, 'error'),
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast && (
        <div className="toast-viewport" aria-live="polite">
          <div className={`toast toast-${toast.variant}`} role="status">
            {toast.message}
          </div>
        </div>
      )}
    </ToastContext.Provider>
  )
}
