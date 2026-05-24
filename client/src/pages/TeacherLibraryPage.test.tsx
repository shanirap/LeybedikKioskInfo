import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import {
  downloadMaterial,
  getApprovedMaterials,
  likeMaterial,
} from '../api/materialsApi'
import { materials, teacherUser } from '../test/fixtures'
import { useAuth } from '../utils/useAuth'
import { TeacherLibraryPage } from './TeacherLibraryPage'

vi.mock('../api/materialsApi', () => ({
  downloadMaterial: vi.fn(),
  getApprovedMaterials: vi.fn(),
  likeMaterial: vi.fn(),
}))

vi.mock('../utils/useAuth', () => ({
  useAuth: vi.fn(),
}))

describe('TeacherLibraryPage', () => {
  beforeEach(() => {
    vi.mocked(downloadMaterial).mockReset()
    vi.mocked(getApprovedMaterials).mockReset()
    vi.mocked(likeMaterial).mockReset()
    vi.mocked(useAuth).mockReturnValue({
      user: teacherUser,
      login: vi.fn(),
      logout: vi.fn(),
    })
    vi.mocked(getApprovedMaterials).mockResolvedValue(materials)
  })

  function renderPage() {
    render(
      <MemoryRouter>
        <TeacherLibraryPage />
      </MemoryRouter>,
    )
  }

  it('loads approved materials and filters by search and instrument', async () => {
    renderPage()

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
    renderPage()

    await screen.findByText('Rhythm Basics')
    await userEvent.selectOptions(screen.getByLabelText('מיון לפי'), 'title')
    const cards = screen.getAllByRole('article')

    expect(within(cards[0]).getByText('Rhythm Basics')).toBeInTheDocument()
    expect(within(cards[1]).getByText('String Warmup')).toBeInTheDocument()
  })

  it('likes and downloads materials through the API helpers', async () => {
    const likeableMaterials = [
      { ...materials[0], uploadedByEmail: 'other.teacher@test.local' },
      materials[1],
    ]
    vi.mocked(likeMaterial).mockResolvedValue({
      ...likeableMaterials[0],
      likeCount: 4,
      isLikedByCurrentUser: true,
    })
    vi.mocked(downloadMaterial).mockResolvedValue()
    vi.mocked(getApprovedMaterials)
      .mockResolvedValueOnce(likeableMaterials)
      .mockResolvedValueOnce([{ ...likeableMaterials[0], downloadCount: 3 }, materials[1]])

    renderPage()

    await screen.findByText('Rhythm Basics')
    await userEvent.click(screen.getAllByRole('button', { name: 'סמן לייק' })[0])
    await waitFor(() => expect(screen.getByText('4 לייקים')).toBeInTheDocument())

    const rhythmCard = screen.getByText('Rhythm Basics').closest('article')
    expect(rhythmCard).not.toBeNull()
    await userEvent.click(within(rhythmCard!).getByRole('button', { name: 'צפייה בקובץ' }))
    await userEvent.click(within(rhythmCard!).getByRole('button', { name: 'הורדה' }))

    expect(likeMaterial).toHaveBeenCalledWith(1)
    expect(downloadMaterial).toHaveBeenCalledWith(1, 'rhythm.pdf')
    await waitFor(() => expect(getApprovedMaterials).toHaveBeenCalledTimes(2))
  })

  it('does not allow teachers to like their own materials', async () => {
    renderPage()

    await screen.findByText('Rhythm Basics')
    const rhythmCard = screen.getByText('Rhythm Basics').closest('article')
    expect(rhythmCard).not.toBeNull()
    expect(
      within(rhythmCard!).getByRole('button', { name: 'לא ניתן לסמן לייק לחומר שלך' }),
    ).toBeDisabled()
  })

  it('disables action buttons while an action is running', async () => {
    let resolveDownload!: () => void
    vi.mocked(downloadMaterial).mockReturnValue(
      new Promise<void>((resolve) => {
        resolveDownload = resolve
      }),
    )

    renderPage()

    await screen.findByText('Rhythm Basics')
    const rhythmCard = screen.getByText('Rhythm Basics').closest('article')
    expect(rhythmCard).not.toBeNull()
    await userEvent.click(within(rhythmCard!).getByRole('button', { name: 'הורדה' }))

    expect(within(rhythmCard!).getByRole('button', { name: 'מוריד...' })).toBeDisabled()
    resolveDownload()
    await waitFor(() => expect(downloadMaterial).toHaveBeenCalledWith(1, 'rhythm.pdf'))
  })
})
