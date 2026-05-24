import { render, screen } from '@testing-library/react'
import { within } from '@testing-library/dom'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { getInstruments } from '../api/instrumentsApi'
import { deleteMyUploadedMaterial, getMyUploadedMaterials, updateMyUploadedMaterial } from '../api/materialsApi'
import { instruments, materials, pagedMaterials } from '../test/fixtures'
import { MyUploadsPage } from './MyUploadsPage'

vi.mock('../api/instrumentsApi', () => ({
  getInstruments: vi.fn(),
}))

vi.mock('../api/materialsApi', () => ({
  deleteMyUploadedMaterial: vi.fn(),
  getMyUploadedMaterials: vi.fn(),
  updateMyUploadedMaterial: vi.fn(),
}))

async function openCardMenu(card: HTMLElement) {
  await userEvent.click(within(card).getByRole('button', { name: 'פעולות נוספות' }))
}

async function expandCardDetails(card: HTMLElement) {
  await userEvent.click(within(card).getByText('פרטים נוספים'))
}

describe('MyUploadsPage', () => {
  beforeEach(() => {
    vi.mocked(deleteMyUploadedMaterial).mockReset()
    vi.mocked(getInstruments).mockReset()
    vi.mocked(getMyUploadedMaterials).mockReset()
    vi.mocked(updateMyUploadedMaterial).mockReset()
    vi.mocked(deleteMyUploadedMaterial).mockResolvedValue()
    vi.mocked(getInstruments).mockResolvedValue(instruments)
    vi.mocked(getMyUploadedMaterials).mockResolvedValue(pagedMaterials())
    vi.mocked(updateMyUploadedMaterial).mockResolvedValue({ ...materials[1], status: 'Pending' })
  })

  function renderPage() {
    render(
      <MemoryRouter>
        <MyUploadsPage />
      </MemoryRouter>,
    )
  }

  it('loads uploads and shows totalCount in summary', async () => {
    renderPage()

    expect(await screen.findByText('Rhythm Basics')).toBeInTheDocument()
    expect(screen.getByText('String Warmup')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('previews an uploaded material', async () => {
    renderPage()

    await screen.findByText('Rhythm Basics')
    await userEvent.click(screen.getAllByRole('button', { name: 'צפייה בקובץ' })[0])
  })

  it('archives pending or rejected uploads after confirmation', async () => {
    vi.mocked(getMyUploadedMaterials)
      .mockResolvedValueOnce(pagedMaterials())
      .mockResolvedValueOnce(pagedMaterials([materials[0]]))

    renderPage()

    await screen.findByText('String Warmup')
    const stringCard = screen.getByText('String Warmup').closest('article')
    expect(stringCard).not.toBeNull()

    await openCardMenu(stringCard!)
    await userEvent.click(screen.getByRole('menuitem', { name: 'ארכוב' }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'ארכוב' }))

    expect(deleteMyUploadedMaterial).toHaveBeenCalledWith(2)
    await expect(screen.findByText('החומר הועבר לארכיון.')).resolves.toBeInTheDocument()
  })

  it('shows rejection reason and edits non-approved uploads', async () => {
    renderPage()

    await screen.findByText('String Warmup')
    const stringCard = screen.getByText('String Warmup').closest('article')
    expect(stringCard).not.toBeNull()

    await expandCardDetails(stringCard!)
    expect(screen.getByText('סיבת דחייה: Needs clearer notation')).toBeInTheDocument()

    await openCardMenu(stringCard!)
    await userEvent.click(screen.getByRole('menuitem', { name: 'עריכה' }))
    await userEvent.clear(screen.getByLabelText('כותרת'))
    await userEvent.type(screen.getByLabelText('כותרת'), 'Updated material')
    await userEvent.selectOptions(screen.getByLabelText('רמת החומר'), 'Beginner')
    await userEvent.click(screen.getByRole('button', { name: 'שמירה' }))

    expect(updateMyUploadedMaterial).toHaveBeenCalledWith(2, expect.any(FormData))
    await expect(screen.findByText('החומר עודכן ונשלח מחדש לבדיקה.')).resolves.toBeInTheDocument()
  })
})
