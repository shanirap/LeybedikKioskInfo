import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getTeacherWallet } from '../api/materialsApi'
import { TeacherWalletPage } from './TeacherWalletPage'

vi.mock('../api/materialsApi', () => ({
  getTeacherWallet: vi.fn(),
}))

describe('TeacherWalletPage', () => {
  beforeEach(() => {
    vi.mocked(getTeacherWallet).mockReset()
  })

  it('shows summary cards and material breakdown', async () => {
    vi.mocked(getTeacherWallet).mockResolvedValue({
      totalLikes: 5,
      totalUniqueDownloads: 3,
      totalMaterials: 1,
      materials: [
        {
          materialId: 1,
          title: 'Assigned Approved',
          instrumentName: 'Piano',
          status: 'Approved',
          likesCount: 5,
          uniqueDownloadsCount: 3,
        },
      ],
    })

    render(<TeacherWalletPage />)

    expect(await screen.findByText('סך הלייקים שקיבלתי')).toBeInTheDocument()
    expect(document.querySelector('.summary-card .summary-value')?.textContent).toBe('5')
    expect(screen.getByText('Assigned Approved')).toBeInTheDocument()
    expect(screen.getByText('מאושר')).toBeInTheDocument()
  })

  it('shows empty state when there are no materials', async () => {
    vi.mocked(getTeacherWallet).mockResolvedValue({
      totalLikes: 0,
      totalUniqueDownloads: 0,
      totalMaterials: 0,
      materials: [],
    })

    render(<TeacherWalletPage />)

    expect(await screen.findByText('עדיין אין נתונים להצגה.')).toBeInTheDocument()
  })
})
