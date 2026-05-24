import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { getArchivedMaterials, restoreMaterial } from '../api/materialsApi'
import { materials, pagedMaterials } from '../test/fixtures'
import { AdminArchivedMaterialsPage } from './AdminArchivedMaterialsPage'

vi.mock('../api/materialsApi', () => ({
  getArchivedMaterials: vi.fn(),
  restoreMaterial: vi.fn(),
}))

describe('AdminArchivedMaterialsPage', () => {
  beforeEach(() => {
    vi.mocked(getArchivedMaterials).mockReset()
    vi.mocked(restoreMaterial).mockReset()
    vi.mocked(getArchivedMaterials).mockResolvedValue(pagedMaterials())
    vi.mocked(restoreMaterial).mockResolvedValue(materials[0])
  })

  it('loads archived materials and allows restoring', async () => {
    vi.mocked(getArchivedMaterials)
      .mockResolvedValueOnce(pagedMaterials())
      .mockResolvedValueOnce(pagedMaterials([materials[1]]))

    render(
      <MemoryRouter>
        <AdminArchivedMaterialsPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Rhythm Basics')).toBeInTheDocument()
    expect(screen.getByText('String Warmup')).toBeInTheDocument()

    await userEvent.click(screen.getAllByRole('button', { name: 'שחזור' })[0])

    expect(restoreMaterial).toHaveBeenCalledWith(1)
    await waitFor(() => expect(screen.getByText('החומר שוחזר.')).toBeInTheDocument())
  })

  it('shows empty state when no archived materials', async () => {
    vi.mocked(getArchivedMaterials).mockResolvedValue(pagedMaterials([]))

    render(
      <MemoryRouter>
        <AdminArchivedMaterialsPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('אין כרגע חומרים בארכיון.')).toBeInTheDocument()
  })
})
