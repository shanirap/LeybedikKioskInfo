import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { IconButton } from './IconButton'

describe('IconButton', () => {
  it('exposes the label through aria and title attributes', () => {
    render(
      <IconButton label="לייק" variant="like">
        ♥
      </IconButton>,
    )

    const button = screen.getByRole('button', { name: 'לייק' })
    expect(button).toHaveAttribute('title', 'לייק')
    expect(button).toHaveClass('icon-button-like')
  })
})
