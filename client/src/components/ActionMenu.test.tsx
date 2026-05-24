import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ActionMenu } from './ActionMenu'

describe('ActionMenu', () => {
  it('opens menu items and runs the selected action', async () => {
    const onEdit = vi.fn()

    render(
      <ActionMenu
        items={[
          { label: 'עריכה', onClick: onEdit },
          { label: 'ארכוב', onClick: vi.fn(), variant: 'danger' },
        ]}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'פעולות נוספות' }))
    expect(screen.getByRole('menu')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('menuitem', { name: 'עריכה' }))
    expect(onEdit).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('closes when pressing Escape', async () => {
    render(<ActionMenu items={[{ label: 'עריכה', onClick: vi.fn() }]} />)

    await userEvent.click(screen.getByRole('button', { name: 'פעולות נוספות' }))
    expect(screen.getByRole('menu')).toBeInTheDocument()

    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('renders nothing when there are no items', () => {
    const { container } = render(<ActionMenu items={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('does not run disabled menu items', async () => {
    const onDelete = vi.fn()

    render(<ActionMenu items={[{ label: 'מחיקה', onClick: onDelete, disabled: true }]} />)

    await userEvent.click(screen.getByRole('button', { name: 'פעולות נוספות' }))
    expect(screen.getByRole('menuitem', { name: 'מחיקה' })).toBeDisabled()
  })
})
