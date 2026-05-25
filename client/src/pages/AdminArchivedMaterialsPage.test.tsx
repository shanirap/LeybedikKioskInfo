import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { getArchivedMaterials, restoreMaterial, deleteArchivedMaterialPermanently } from '../api/materialsApi'
import { materials, pagedMaterials } from '../test/fixtures'
import { ToastProvider } from '../utils/ToastContext'
import { AdminArchivedMaterialsPage } from './AdminArchivedMaterialsPage'

vi.mock('../api/materialsApi', () => ({
  getArchivedMaterials: vi.fn(),
  restoreMaterial: vi.fn(),
  deleteArchivedMaterialPermanently: vi.fn(),
}))

async function expandCardDetails(card: HTMLElement) {
  await userEvent.click(within(card).getByText('פרטים נוספים'))
}

describe('AdminArchivedMaterialsPage', () => {
  beforeEach(() => {
    vi.mocked(getArchivedMaterials).mockReset()
    vi.mocked(restoreMaterial).mockReset()
    vi.mocked(deleteArchivedMaterialPermanently).mockReset()
    vi.mocked(getArchivedMaterials).mockResolvedValue(pagedMaterials())
    vi.mocked(restoreMaterial).mockResolvedValue(materials[0])
    vi.mocked(deleteArchivedMaterialPermanently).mockResolvedValue(undefined)
  })

  function renderPage(initialEntry = '/admin/archived-materials') {
    render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <ToastProvider>
          <Routes>
            <Route path="/admin/archived-materials" element={<AdminArchivedMaterialsPage />} />
            <Route path="/materials/:id/preview" element={<div>Preview page</div>} />
          </Routes>
        </ToastProvider>
      </MemoryRouter>,
    )
  }

  it('loads archived materials and allows restoring', async () => {
    vi.mocked(getArchivedMaterials)
      .mockResolvedValueOnce(pagedMaterials())
      .mockResolvedValueOnce(pagedMaterials([materials[1]]))

    renderPage()

    expect(await screen.findByText('Rhythm Basics')).toBeInTheDocument()
    expect(screen.getByText('String Warmup')).toBeInTheDocument()

    await userEvent.click(screen.getAllByRole('button', { name: 'שחזור' })[0])

    expect(restoreMaterial).toHaveBeenCalledWith(1)
    await waitFor(() => expect(screen.getByText('החומר שוחזר.')).toBeInTheDocument())
  })

  it('searches archived materials server-side', async () => {
    renderPage()

    await screen.findByText('Rhythm Basics')
    await userEvent.type(screen.getByLabelText('חיפוש'), 'violin')
    await userEvent.click(screen.getByRole('button', { name: 'חפש' }))

    await waitFor(() =>
      expect(getArchivedMaterials).toHaveBeenCalledWith({
        search: 'violin',
        page: 1,
        pageSize: 20,
      }),
    )
  })

  it('opens preview from an archived card', async () => {
    renderPage()

    await screen.findByText('Rhythm Basics')
    await userEvent.click(screen.getAllByRole('button', { name: 'צפייה' })[0])

    expect(await screen.findByText('Preview page')).toBeInTheDocument()
  })

  it('shows rejection reason in expanded card details', async () => {
    renderPage()

    await screen.findByText('String Warmup')
    const stringCard = screen.getByText('String Warmup').closest('article')
    expect(stringCard).not.toBeNull()

    await expandCardDetails(stringCard!)
    expect(screen.getByText('סיבת דחייה: Needs clearer notation')).toBeInTheDocument()
  })

  it('shows empty state when no archived materials', async () => {
    vi.mocked(getArchivedMaterials).mockResolvedValue(pagedMaterials([]))

    renderPage()

    expect(await screen.findByText('אין כרגע חומרים בארכיון.')).toBeInTheDocument()
  })

  it('shows search empty state when no archived materials match', async () => {
    vi.mocked(getArchivedMaterials).mockResolvedValue(pagedMaterials([]))

    renderPage()

    await screen.findByText('אין כרגע חומרים בארכיון.')
    await userEvent.type(screen.getByLabelText('חיפוש'), 'missing')
    await userEvent.click(screen.getByRole('button', { name: 'חפש' }))

    expect(await screen.findByText('לא נמצאו חומרים התואמים את החיפוש.')).toBeInTheDocument()
  })

  it('shows API errors when loading archived materials fails', async () => {
    vi.mocked(getArchivedMaterials).mockRejectedValue({ isAxiosError: true })

    renderPage()

    expect(await screen.findByText('לא ניתן לטעון את ארכיון החומרים.')).toBeInTheDocument()
  })

  it('shows API errors when restore fails', async () => {
    vi.mocked(restoreMaterial).mockRejectedValue({ isAxiosError: true })

    renderPage()

    await screen.findByText('Rhythm Basics')
    await userEvent.click(screen.getAllByRole('button', { name: 'שחזור' })[0])

    expect(await screen.findByText('לא ניתן לשחזר את החומר.')).toBeInTheDocument()
  })

  it('permanently deletes an archived material after confirmation', async () => {
    vi.mocked(getArchivedMaterials)
      .mockResolvedValueOnce(pagedMaterials())
      .mockResolvedValueOnce(pagedMaterials([materials[1]]))

    renderPage()

    await screen.findByText('Rhythm Basics')
    await userEvent.click(screen.getAllByRole('button', { name: 'מחיקה לצמיתות' })[0])
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('הפעולה תמחק את החומר מהמערכת לצמיתות ולא ניתן יהיה לשחזר אותו. להמשיך?')).toBeInTheDocument()

    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'מחיקה לצמיתות' }))

    expect(deleteArchivedMaterialPermanently).toHaveBeenCalledWith(1)
    await waitFor(() => expect(screen.getByText('החומר נמחק לצמיתות.')).toBeInTheDocument())
  })

  it('shows an error when permanent delete fails', async () => {
    vi.mocked(deleteArchivedMaterialPermanently).mockRejectedValue({ isAxiosError: true })

    renderPage()

    await screen.findByText('Rhythm Basics')
    await userEvent.click(screen.getAllByRole('button', { name: 'מחיקה לצמיתות' })[0])
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'מחיקה לצמיתות' }))

    expect(await screen.findByText('לא ניתן למחוק את החומר לצמיתות.')).toBeInTheDocument()
  })
})
