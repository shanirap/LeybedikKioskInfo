import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import {
  downloadMaterial,
  getFavoriteMaterials,
  likeMaterial,
  removeFavoriteMaterial,
} from '../api/materialsApi'
import { materials, teacherUser } from '../test/fixtures'
import { useAuth } from '../utils/useAuth'
import { MyFavoritesPage } from './MyFavoritesPage'

vi.mock('../api/materialsApi', () => ({
  downloadMaterial: vi.fn(),
  getFavoriteMaterials: vi.fn(),
  likeMaterial: vi.fn(),
  removeFavoriteMaterial: vi.fn(),
}))

vi.mock('../utils/useAuth', () => ({
  useAuth: vi.fn(),
}))

describe('MyFavoritesPage', () => {
  beforeEach(() => {
    vi.mocked(downloadMaterial).mockReset()
    vi.mocked(getFavoriteMaterials).mockReset()
    vi.mocked(likeMaterial).mockReset()
    vi.mocked(removeFavoriteMaterial).mockReset()
    vi.mocked(useAuth).mockReturnValue({
      user: teacherUser,
      login: vi.fn(),
      logout: vi.fn(),
    })
    vi.mocked(getFavoriteMaterials).mockResolvedValue([
      { ...materials[0], isFavoritedByCurrentUser: true },
    ])
  })

  function renderPage() {
    render(
      <MemoryRouter>
        <MyFavoritesPage />
      </MemoryRouter>,
    )
  }

  it('shows an empty state when there are no favorites', async () => {
    vi.mocked(getFavoriteMaterials).mockResolvedValue([])

    renderPage()

    expect(await screen.findByText('עדיין לא שמרת חומרים למועדפים.')).toBeInTheDocument()
  })

  it('loads favorite materials and removes one from favorites', async () => {
    vi.mocked(removeFavoriteMaterial).mockResolvedValue({
      ...materials[0],
      isFavoritedByCurrentUser: false,
    })

    renderPage()

    expect(await screen.findByText('Rhythm Basics')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'הסר מהמועדפים' }))

    await waitFor(() => expect(removeFavoriteMaterial).toHaveBeenCalledWith(1))
    await waitFor(() => expect(screen.queryByText('Rhythm Basics')).not.toBeInTheDocument())
  })

  it('likes a favorite material without removing it from the list', async () => {
    const likeableMaterial = {
      ...materials[0],
      uploadedByEmail: 'other.teacher@test.local',
      isFavoritedByCurrentUser: true,
    }
    vi.mocked(getFavoriteMaterials).mockResolvedValue([likeableMaterial])
    vi.mocked(likeMaterial).mockResolvedValue({
      ...likeableMaterial,
      likeCount: 4,
      isLikedByCurrentUser: true,
    })

    renderPage()

    await screen.findByText('Rhythm Basics')
    await userEvent.click(screen.getByRole('button', { name: 'סמן לייק' }))

    expect(likeMaterial).toHaveBeenCalledWith(1)
    await waitFor(() => expect(screen.getByText('4 לייקים')).toBeInTheDocument())
    expect(screen.getByText('Rhythm Basics')).toBeInTheDocument()
  })

  it('downloads a favorite material through the API helper', async () => {
    vi.mocked(downloadMaterial).mockResolvedValue()
    vi.mocked(getFavoriteMaterials)
      .mockResolvedValueOnce([{ ...materials[0], isFavoritedByCurrentUser: true }])
      .mockResolvedValueOnce([{ ...materials[0], downloadCount: 3, isFavoritedByCurrentUser: true }])

    renderPage()

    const card = (await screen.findByText('Rhythm Basics')).closest('article')
    expect(card).not.toBeNull()
    await userEvent.click(within(card!).getByRole('button', { name: 'הורדה' }))

    expect(downloadMaterial).toHaveBeenCalledWith(1, 'rhythm.pdf')
    await waitFor(() => expect(getFavoriteMaterials).toHaveBeenCalledTimes(2))
  })
})
