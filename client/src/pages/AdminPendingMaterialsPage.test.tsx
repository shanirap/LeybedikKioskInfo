import { render, screen, waitFor } from '@testing-library/react'
import { within } from '@testing-library/dom'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { getAdminInstruments } from '../api/instrumentsApi'
import {
  approveMaterial,
  deleteAdminMaterial,
  downloadMaterialForReview,
  getAdminMaterials,
  getMaterialPreviewDetails,
  rejectMaterial,
  updateAdminMaterial,
} from '../api/materialsApi'
import { instruments, materials, pagedMaterials } from '../test/fixtures'
import { AdminEditMaterialPage } from './AdminEditMaterialPage'
import { AdminPendingMaterialsPage } from './AdminPendingMaterialsPage'

vi.mock('../api/instrumentsApi', () => ({
  getAdminInstruments: vi.fn(),
}))

vi.mock('../api/materialsApi', () => ({
  approveMaterial: vi.fn(),
  deleteAdminMaterial: vi.fn(),
  downloadMaterialForReview: vi.fn(),
  getAdminMaterials: vi.fn(),
  getMaterialPreviewDetails: vi.fn(),
  rejectMaterial: vi.fn(),
  updateAdminMaterial: vi.fn(),
}))

async function openCardMenu(card: HTMLElement) {
  await userEvent.click(within(card).getByRole('button', { name: 'פעולות נוספות' }))
}

describe('AdminPendingMaterialsPage', () => {
  beforeEach(() => {
    vi.mocked(getAdminInstruments).mockReset()
    vi.mocked(approveMaterial).mockReset()
    vi.mocked(deleteAdminMaterial).mockReset()
    vi.mocked(downloadMaterialForReview).mockReset()
    vi.mocked(getAdminMaterials).mockReset()
    vi.mocked(getMaterialPreviewDetails).mockReset()
    vi.mocked(rejectMaterial).mockReset()
    vi.mocked(updateAdminMaterial).mockReset()
    vi.mocked(getAdminInstruments).mockResolvedValue(instruments)
    vi.mocked(getAdminMaterials).mockResolvedValue(pagedMaterials())
    vi.mocked(getMaterialPreviewDetails).mockResolvedValue(materials[1])
    vi.mocked(approveMaterial).mockResolvedValue({ ...materials[1], status: 'Approved' })
    vi.mocked(rejectMaterial).mockResolvedValue({ ...materials[1], status: 'Rejected' })
    vi.mocked(updateAdminMaterial).mockResolvedValue({ ...materials[1], title: 'Updated By Admin' })
    vi.mocked(deleteAdminMaterial).mockResolvedValue()
    vi.mocked(downloadMaterialForReview).mockResolvedValue()
  })

  function renderPage(initialEntry = '/admin/pending-materials') {
    render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/admin/pending-materials" element={<AdminPendingMaterialsPage />} />
          <Route path="/admin/materials/:id/edit" element={<AdminEditMaterialPage />} />
          <Route path="/materials/:id/preview" element={<div>Preview page</div>} />
        </Routes>
      </MemoryRouter>,
    )
  }

  it('loads materials by selected status', async () => {
    renderPage()

    expect(await screen.findByText('Rhythm Basics')).toBeInTheDocument()
    expect(getAdminMaterials).toHaveBeenCalledWith({
      status: 'Pending',
      search: undefined,
      page: 1,
      pageSize: 20,
    })

    await userEvent.selectOptions(screen.getByLabelText('סטטוס'), 'All')
    await waitFor(() =>
      expect(getAdminMaterials).toHaveBeenCalledWith({
        status: undefined,
        search: undefined,
        page: 1,
        pageSize: 20,
      }),
    )
  })

  it('runs approval, rejection, and review download actions', async () => {
    vi.spyOn(window, 'prompt').mockReturnValue('Needs work')
    renderPage()

    await screen.findByText('String Warmup')
    const stringCard = screen.getByText('String Warmup').closest('article')
    expect(stringCard).not.toBeNull()
    await userEvent.click(within(stringCard!).getByRole('button', { name: 'הורדה לבדיקה' }))

    await openCardMenu(stringCard!)
    await userEvent.click(screen.getByRole('menuitem', { name: 'אישור' }))

    await openCardMenu(stringCard!)
    await userEvent.click(screen.getByRole('menuitem', { name: 'דחייה' }))

    expect(downloadMaterialForReview).toHaveBeenCalledWith(2, 'strings.pdf')
    expect(approveMaterial).toHaveBeenCalledWith(2)
    expect(rejectMaterial).toHaveBeenCalledWith(2, 'Needs work')
    await waitFor(() => expect(getAdminMaterials).toHaveBeenCalledTimes(3))
  })

  it('opens edit on a separate page and saves changes', async () => {
    renderPage()

    await screen.findByText('String Warmup')
    const stringCard = screen.getByText('String Warmup').closest('article')
    expect(stringCard).not.toBeNull()

    await openCardMenu(stringCard!)
    await userEvent.click(screen.getByRole('menuitem', { name: 'עריכה' }))

    expect(await screen.findByRole('heading', { name: 'עריכת חומר לפני אישור' })).toBeInTheDocument()
    expect(getMaterialPreviewDetails).toHaveBeenCalledWith(2)

    await userEvent.clear(screen.getByLabelText('כותרת'))
    await userEvent.type(screen.getByLabelText('כותרת'), 'Updated By Admin')
    await userEvent.click(screen.getByRole('button', { name: 'שמירה' }))

    expect(updateAdminMaterial).toHaveBeenCalledWith(2, expect.any(FormData))
    expect(await screen.findByText('החומר עודכן בהצלחה.')).toBeInTheDocument()
  })

  it('archives a material after confirmation', async () => {
    renderPage()

    await screen.findByText('String Warmup')
    const stringCard = screen.getByText('String Warmup').closest('article')
    expect(stringCard).not.toBeNull()

    await openCardMenu(stringCard!)
    await userEvent.click(screen.getByRole('menuitem', { name: 'ארכוב' }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'ארכוב' }))

    expect(deleteAdminMaterial).toHaveBeenCalledWith(2)
    await waitFor(() => expect(screen.getByText('החומר הועבר לארכיון.')).toBeInTheDocument())
  })
})
