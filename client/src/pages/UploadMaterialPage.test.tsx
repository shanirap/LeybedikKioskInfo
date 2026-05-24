import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getInstruments } from '../api/instrumentsApi'
import { uploadMaterial } from '../api/materialsApi'
import { instruments, materials } from '../test/fixtures'
import { UploadMaterialPage } from './UploadMaterialPage'

vi.mock('../api/instrumentsApi', () => ({
  getInstruments: vi.fn(),
}))

vi.mock('../api/materialsApi', () => ({
  uploadMaterial: vi.fn(),
}))

describe('UploadMaterialPage', () => {
  beforeEach(() => {
    vi.mocked(getInstruments).mockReset()
    vi.mocked(uploadMaterial).mockReset()
    vi.mocked(getInstruments).mockResolvedValue(instruments)
    vi.mocked(uploadMaterial).mockResolvedValue(materials[1])
  })

  it('loads instruments and uploads the selected file as form data', async () => {
    render(<UploadMaterialPage />)

    expect(await screen.findByRole('option', { name: 'Piano' })).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('כותרת'), 'New worksheet')
    await userEvent.type(screen.getByLabelText('תיאור'), 'Practice notes')
    await userEvent.selectOptions(screen.getByLabelText('כלי נגינה'), '2')
    await userEvent.selectOptions(screen.getByLabelText('רמת החומר'), 'Advanced')
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(
      fileInput,
      new File(['pdf'], 'worksheet.pdf', { type: 'application/pdf' }),
    )
    expect(screen.getByText('worksheet.pdf')).toBeInTheDocument()
    fireEvent.submit(screen.getByRole('button', { name: 'העלה לבדיקה' }).closest('form')!)

    await waitFor(() =>
      expect(screen.getByText('החומר הועלה וממתין לאישור מנהל.')).toBeInTheDocument(),
    )
    const submittedFormData = vi.mocked(uploadMaterial).mock.calls[0]?.[0] as FormData
    expect(submittedFormData?.get('title')).toBe('New worksheet')
    expect(submittedFormData?.get('description')).toBe('Practice notes')
    expect(submittedFormData?.get('instrumentId')).toBe('2')
    expect(submittedFormData?.get('level')).toBe('Advanced')
    expect((submittedFormData?.get('file') as File).name).toBe('worksheet.pdf')
  })

  it('explains allowed file types and max size', async () => {
    render(<UploadMaterialPage />)

    expect(await screen.findByText(/PDF, Word, PowerPoint ותמונות/)).toBeInTheDocument()
    expect(screen.getAllByText(/50MB/).length).toBeGreaterThan(0)
  })

  it('prevents upload when no instrument is available', async () => {
    vi.mocked(getInstruments).mockResolvedValue([])
    render(<UploadMaterialPage />)

    expect(await screen.findByText('אין לך כרגע כלי נגינה זמינים להעלאה.')).toBeInTheDocument()
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(
      fileInput,
      new File(['pdf'], 'worksheet.pdf', { type: 'application/pdf' }),
    )

    expect(screen.getByRole('button', { name: 'העלה לבדיקה' })).toBeDisabled()
    fireEvent.submit(screen.getByRole('button', { name: 'העלה לבדיקה' }).closest('form')!)
    expect(await screen.findByText('אין כלי נגינה זמינים להעלאה. יש לפנות למנהל לשיוך כלי.')).toBeInTheDocument()
    expect(uploadMaterial).not.toHaveBeenCalled()
  })

  it('shows translated server validation errors', async () => {
    vi.mocked(uploadMaterial).mockRejectedValue({
      isAxiosError: true,
      response: { data: { message: 'File signature does not match file type.' } },
    })
    render(<UploadMaterialPage />)

    await screen.findByRole('option', { name: 'Piano' })
    await userEvent.type(screen.getByLabelText('כותרת'), 'Bad file')
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(
      fileInput,
      new File(['bad'], 'bad.pdf', { type: 'application/pdf' }),
    )
    fireEvent.submit(screen.getByRole('button', { name: 'העלה לבדיקה' }).closest('form')!)

    expect(await screen.findByText('תוכן הקובץ אינו תואם לסוג הקובץ.')).toBeInTheDocument()
  })
})
