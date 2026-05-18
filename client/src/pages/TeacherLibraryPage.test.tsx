import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  downloadMaterial,
  getApprovedMaterials,
  likeMaterial,
  previewMaterial,
} from '../api/materialsApi'
import { materials } from '../test/fixtures'
import { TeacherLibraryPage } from './TeacherLibraryPage'

vi.mock('../api/materialsApi', () => ({
  downloadMaterial: vi.fn(),
  getApprovedMaterials: vi.fn(),
  likeMaterial: vi.fn(),
  previewMaterial: vi.fn(),
}))

describe('TeacherLibraryPage', () => {
  beforeEach(() => {
    vi.mocked(downloadMaterial).mockReset()
    vi.mocked(getApprovedMaterials).mockReset()
    vi.mocked(likeMaterial).mockReset()
    vi.mocked(previewMaterial).mockReset()
    vi.mocked(getApprovedMaterials).mockResolvedValue(materials)
  })

  it('loads approved materials and filters by search and instrument', async () => {
    render(<TeacherLibraryPage />)

    expect(await screen.findByText('Rhythm Basics')).toBeInTheDocument()
    expect(screen.getByText('String Warmup')).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText('חיפוש'), 'rhythm')
    expect(screen.getByText('Rhythm Basics')).toBeInTheDocument()
    expect(screen.queryByText('String Warmup')).not.toBeInTheDocument()

    await userEvent.clear(screen.getByLabelText('חיפוש'))
    await userEvent.selectOptions(screen.getByLabelText('כלי נגינה'), '2')
    expect(screen.queryByText('Rhythm Basics')).not.toBeInTheDocument()
    expect(screen.getByText('String Warmup')).toBeInTheDocument()
  })

  it('sorts visible materials by title', async () => {
    render(<TeacherLibraryPage />)

    await screen.findByText('Rhythm Basics')
    await userEvent.selectOptions(screen.getByLabelText('מיון לפי'), 'title')
    const cards = screen.getAllByRole('article')

    expect(within(cards[0]).getByText('Rhythm Basics')).toBeInTheDocument()
    expect(within(cards[1]).getByText('String Warmup')).toBeInTheDocument()
  })

  it('likes, previews, and downloads materials through the API helpers', async () => {
    vi.mocked(likeMaterial).mockResolvedValue({
      ...materials[0],
      likeCount: 4,
      isLikedByCurrentUser: true,
    })
    vi.mocked(downloadMaterial).mockResolvedValue()
    vi.mocked(previewMaterial).mockResolvedValue()
    vi.mocked(getApprovedMaterials)
      .mockResolvedValueOnce(materials)
      .mockResolvedValueOnce([{ ...materials[0], downloadCount: 3 }, materials[1]])

    render(<TeacherLibraryPage />)

    await screen.findByText('Rhythm Basics')
    await userEvent.click(screen.getAllByRole('button', { name: 'סמן לייק' })[0])
    await waitFor(() => expect(screen.getByText('4 לייקים')).toBeInTheDocument())

    const rhythmCard = screen.getByText('Rhythm Basics').closest('article')
    expect(rhythmCard).not.toBeNull()
    await userEvent.click(within(rhythmCard!).getByRole('button', { name: 'צפייה בקובץ' }))
    await userEvent.click(within(rhythmCard!).getByRole('button', { name: 'הורדה' }))

    expect(likeMaterial).toHaveBeenCalledWith(1)
    expect(previewMaterial).toHaveBeenCalledWith(1, 'rhythm.pdf')
    expect(downloadMaterial).toHaveBeenCalledWith(1, 'rhythm.pdf')
    await waitFor(() => expect(getApprovedMaterials).toHaveBeenCalledTimes(2))
  })
})
