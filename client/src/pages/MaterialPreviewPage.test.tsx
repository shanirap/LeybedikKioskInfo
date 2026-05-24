import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { getMaterialPreviewBlob, getMaterialPreviewDetails } from '../api/materialsApi'
import { materials } from '../test/fixtures'
import { MaterialPreviewPage } from './MaterialPreviewPage'

vi.mock('../api/materialsApi', () => ({
  downloadMaterial: vi.fn(),
  getMaterialPreviewBlob: vi.fn(),
  getMaterialPreviewDetails: vi.fn(),
}))

describe('MaterialPreviewPage', () => {
  beforeEach(() => {
    vi.mocked(getMaterialPreviewBlob).mockReset()
    vi.mocked(getMaterialPreviewDetails).mockReset()
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:preview') })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() })
    vi.mocked(getMaterialPreviewDetails).mockResolvedValue(materials[0])
    vi.mocked(getMaterialPreviewBlob).mockResolvedValue(new Blob(['%PDF-1.4'], { type: 'application/pdf' }))
  })

  it('shows material details and embeds supported files', async () => {
    render(
      <MemoryRouter initialEntries={['/materials/1/preview']}>
        <Routes>
          <Route path="/materials/:id/preview" element={<MaterialPreviewPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'Rhythm Basics' })).toBeInTheDocument()
    expect(screen.getByText('Piano')).toBeInTheDocument()
    expect(screen.getByText('מתחילים')).toBeInTheDocument()
    expect(screen.getByText('rhythm.pdf')).toBeInTheDocument()
    expect(screen.getByTitle('תצוגה מקדימה של Rhythm Basics')).toHaveAttribute('src', 'blob:preview')
  })

  it('shows rejection reason for rejected materials', async () => {
    vi.mocked(getMaterialPreviewDetails).mockResolvedValue(materials[1])

    render(
      <MemoryRouter initialEntries={['/materials/2/preview']}>
        <Routes>
          <Route path="/materials/:id/preview" element={<MaterialPreviewPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText('סיבת דחייה: Needs clearer notation')).toBeInTheDocument()
  })
})
