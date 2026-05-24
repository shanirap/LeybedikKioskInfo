import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Pager } from './Pager'

describe('Pager', () => {
  it('renders nothing when there is only one page', () => {
    const { container } = render(
      <Pager page={1} pageSize={20} totalCount={15} onPageChange={vi.fn()} />,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('shows page info and navigates between pages', async () => {
    const onPageChange = vi.fn()

    render(<Pager page={+2} pageSize={20} totalCount={55} onPageChange={onPageChange} />)

    expect(screen.getByText('עמוד 2 מתוך 3 (55 סה״כ)')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '← הקודם' }))
    expect(onPageChange).toHaveBeenCalledWith(1)

    await userEvent.click(screen.getByRole('button', { name: 'הבא →' }))
    expect(onPageChange).toHaveBeenCalledWith(3)
  })

  it('disables navigation buttons on the first and last pages', () => {
    render(<Pager page={1} pageSize={20} totalCount={55} onPageChange={vi.fn()} />)

    expect(screen.getByRole('button', { name: '← הקודם' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'הבא →' })).toBeEnabled()
  })
})
