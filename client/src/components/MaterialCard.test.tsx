import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { MaterialCard, MaterialCardFooter } from './MaterialCard'

describe('MaterialCard', () => {
  it('renders title, badges, description, and footer actions', () => {
    render(
      <MaterialCard
        kicker="בארכיון"
        title="Rhythm Basics"
        badges={[
          { label: 'Piano', className: 'instrument-badge' },
          { label: 'מתחילים' },
        ]}
        description="Clapping practice"
        metaItems={['הועלה על ידי: Teacher']}
        footer={
          <MaterialCardFooter
            primary={<button type="button">שחזור</button>}
            tools={<button type="button">צפייה</button>}
          />
        }
      />,
    )

    expect(screen.getByText('בארכיון')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Rhythm Basics' })).toBeInTheDocument()
    expect(screen.getByText('Piano')).toBeInTheDocument()
    expect(screen.getByText('Clapping practice')).toBeInTheDocument()
    expect(screen.getByText('פרטים נוספים')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'שחזור' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'צפייה' })).toBeInTheDocument()
  })

  it('shows expanded metadata and alerts inside details', async () => {
    render(
      <MaterialCard
        title="String Warmup"
        badges={[]}
        metaItems={['קובץ: strings.pdf']}
        alert={<p>סיבת דחייה: Needs clearer notation</p>}
      />,
    )

    await userEvent.click(screen.getByText('פרטים נוספים'))

    expect(screen.getByText('קובץ: strings.pdf')).toBeInTheDocument()
    expect(screen.getByText('סיבת דחייה: Needs clearer notation')).toBeInTheDocument()
  })

  it('omits details and footer sections when there is nothing to show', () => {
    render(<MaterialCard title="Minimal card" badges={[]} />)

    expect(screen.queryByText('פרטים נוספים')).not.toBeInTheDocument()
    expect(document.querySelector('.card-footer')).not.toBeInTheDocument()
  })
})

describe('MaterialCardFooter', () => {
  it('returns null when no actions are provided', () => {
    const { container } = render(<MaterialCardFooter />)
    expect(container).toBeEmptyDOMElement()
  })
})
