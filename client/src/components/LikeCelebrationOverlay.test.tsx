import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LikeCelebrationOverlay } from './LikeCelebrationOverlay'

describe('LikeCelebrationOverlay', () => {
  it('renders a large like icon when visible', () => {
    render(<LikeCelebrationOverlay visible />)

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByText('👍')).toBeInTheDocument()
    expect(screen.getByText('מישהו סימן לייק לחומר שהעלית')).toHaveClass('visually-hidden')
  })

  it('renders nothing when not visible', () => {
    render(<LikeCelebrationOverlay visible={false} />)

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
