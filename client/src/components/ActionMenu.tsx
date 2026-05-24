import { useEffect, useId, useRef, useState } from 'react'
import { IconButton } from './IconButton'

export type ActionMenuItem = {
  label: string
  onClick: () => void
  variant?: 'default' | 'danger'
  disabled?: boolean
}

type ActionMenuProps = {
  items: ActionMenuItem[]
  label?: string
}

export function ActionMenu({ items, label = 'פעולות נוספות' }: ActionMenuProps) {
  const [open, setOpen] = useState(false)
  const menuId = useId()
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  if (items.length === 0) return null

  return (
    <div className="action-menu" ref={rootRef}>
      <IconButton
        label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((current) => !current)}
      >
        <span aria-hidden="true">⋯</span>
      </IconButton>
      {open && (
        <div className="action-menu-panel" id={menuId} role="menu" aria-label={label}>
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              className={[
                'action-menu-item',
                item.variant === 'danger' ? 'action-menu-item--danger' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              disabled={item.disabled}
              onClick={() => {
                setOpen(false)
                item.onClick()
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
