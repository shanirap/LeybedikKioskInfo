import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getMyUploadedMaterials, previewMaterial } from '../api/materialsApi'
import { materials } from '../test/fixtures'
import { MyUploadsPage } from './MyUploadsPage'

vi.mock('../api/materialsApi', () => ({
  getMyUploadedMaterials: vi.fn(),
  previewMaterial: vi.fn(),
}))

describe('MyUploadsPage', () => {
  beforeEach(() => {
    vi.mocked(getMyUploadedMaterials).mockReset()
    vi.mocked(previewMaterial).mockReset()
    vi.mocked(getMyUploadedMaterials).mockResolvedValue(materials)
    vi.mocked(previewMaterial).mockResolvedValue()
  })

  it('loads uploads, summarizes status, and filters by status/search', async () => {
    render(<MyUploadsPage />)

    expect(await screen.findByText('Rhythm Basics')).toBeInTheDocument()
    expect(screen.getByText('String Warmup')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()

    await userEvent.selectOptions(screen.getByLabelText('סטטוס'), 'Approved')
    expect(screen.getByText('Rhythm Basics')).toBeInTheDocument()
    expect(screen.queryByText('String Warmup')).not.toBeInTheDocument()

    await userEvent.type(screen.getByLabelText('חיפוש'), 'missing')
    expect(screen.getByText('לא נמצאו חומרים שמתאימים לסינון הנוכחי.')).toBeInTheDocument()
  })

  it('previews an uploaded material', async () => {
    render(<MyUploadsPage />)

    await screen.findByText('Rhythm Basics')
    await userEvent.click(screen.getAllByRole('button', { name: 'צפייה בקובץ' })[0])

    expect(previewMaterial).toHaveBeenCalledWith(1, 'rhythm.pdf')
  })
})
