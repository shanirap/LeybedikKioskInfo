import { render, screen, waitFor } from '@testing-library/react'
import { within } from '@testing-library/dom'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  approveMaterial,
  downloadMaterialForReview,
  getAdminMaterials,
  previewMaterial,
  rejectMaterial,
} from '../api/materialsApi'
import { materials } from '../test/fixtures'
import { AdminPendingMaterialsPage } from './AdminPendingMaterialsPage'

vi.mock('../api/materialsApi', () => ({
  approveMaterial: vi.fn(),
  downloadMaterialForReview: vi.fn(),
  getAdminMaterials: vi.fn(),
  previewMaterial: vi.fn(),
  rejectMaterial: vi.fn(),
}))

describe('AdminPendingMaterialsPage', () => {
  beforeEach(() => {
    vi.mocked(approveMaterial).mockReset()
    vi.mocked(downloadMaterialForReview).mockReset()
    vi.mocked(getAdminMaterials).mockReset()
    vi.mocked(previewMaterial).mockReset()
    vi.mocked(rejectMaterial).mockReset()
    vi.mocked(getAdminMaterials).mockResolvedValue(materials)
    vi.mocked(approveMaterial).mockResolvedValue({ ...materials[1], status: 'Approved' })
    vi.mocked(rejectMaterial).mockResolvedValue({ ...materials[1], status: 'Rejected' })
    vi.mocked(downloadMaterialForReview).mockResolvedValue()
    vi.mocked(previewMaterial).mockResolvedValue()
  })

  it('loads materials by selected status and filters the visible cards', async () => {
    render(<AdminPendingMaterialsPage />)

    expect(await screen.findByText('Rhythm Basics')).toBeInTheDocument()
    expect(getAdminMaterials).toHaveBeenCalledWith('Pending')

    await userEvent.type(screen.getByLabelText('חיפוש'), 'string')
    expect(screen.queryByText('Rhythm Basics')).not.toBeInTheDocument()
    expect(screen.getByText('String Warmup')).toBeInTheDocument()

    await userEvent.selectOptions(screen.getByLabelText('סטטוס'), 'All')
    await waitFor(() => expect(getAdminMaterials).toHaveBeenCalledWith(undefined))
  })

  it('runs approval, rejection, preview, and review download actions', async () => {
    render(<AdminPendingMaterialsPage />)

    await screen.findByText('String Warmup')
    const stringCard = screen.getByText('String Warmup').closest('article')
    expect(stringCard).not.toBeNull()
    await userEvent.click(within(stringCard!).getByRole('button', { name: 'צפייה' }))
    await userEvent.click(within(stringCard!).getByRole('button', { name: 'הורדה לבדיקה' }))
    await userEvent.click(within(stringCard!).getByRole('button', { name: 'אישור' }))
    await userEvent.click(within(stringCard!).getByRole('button', { name: 'דחייה' }))

    expect(previewMaterial).toHaveBeenCalledWith(2, 'strings.pdf')
    expect(downloadMaterialForReview).toHaveBeenCalledWith(2, 'strings.pdf')
    expect(approveMaterial).toHaveBeenCalledWith(2)
    expect(rejectMaterial).toHaveBeenCalledWith(2)
    await waitFor(() => expect(getAdminMaterials).toHaveBeenCalledTimes(3))
  })
})
