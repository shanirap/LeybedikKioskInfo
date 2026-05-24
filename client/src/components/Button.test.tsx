import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Button } from './Button'

describe('Button', () => {
  it('renders the requested variant class', () => {
    render(<Button variant="ghost">צפייה</Button>)

    const button = screen.getByRole('button', { name: 'צפייה' })
    expect(button).toHaveClass('btn-ghost')
    expect(button).toHaveAttribute('type', 'button')
  })

  it('merges custom classes and forwards native button props', () => {
    render(
      <Button variant="danger" className="extra-class" disabled>
        מחיקה
      </Button>,
    )

    const button = screen.getByRole('button', { name: 'מחיקה' })
    expect(button).toHaveClass('btn-danger')
    expect(button).toHaveClass('extra-class')
    expect(button).toBeDisabled()
  })
})
