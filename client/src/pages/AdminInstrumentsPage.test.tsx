import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createAdminInstrument,
  getAdminInstruments,
  updateAdminInstrument,
} from '../api/instrumentsApi'
import { instruments } from '../test/fixtures'
import { AdminInstrumentsPage } from './AdminInstrumentsPage'

vi.mock('../api/instrumentsApi', () => ({
  createAdminInstrument: vi.fn(),
  getAdminInstruments: vi.fn(),
  updateAdminInstrument: vi.fn(),
}))

describe('AdminInstrumentsPage', () => {
  beforeEach(() => {
    vi.mocked(createAdminInstrument).mockReset()
    vi.mocked(getAdminInstruments).mockReset()
    vi.mocked(updateAdminInstrument).mockReset()
    vi.mocked(getAdminInstruments).mockResolvedValue(instruments)
  })

  it('loads instruments', async () => {
    render(<AdminInstrumentsPage />)

    expect(await screen.findByText('Piano')).toBeInTheDocument()
    expect(screen.getByText('Violin')).toBeInTheDocument()
    expect(getAdminInstruments).toHaveBeenCalledTimes(1)
  })

  it('creates an instrument', async () => {
    vi.mocked(createAdminInstrument).mockResolvedValue({ id: 3, name: 'Flute', isActive: true })
    vi.mocked(getAdminInstruments)
      .mockResolvedValueOnce(instruments)
      .mockResolvedValueOnce([...instruments, { id: 3, name: 'Flute', isActive: true }])

    render(<AdminInstrumentsPage />)

    await screen.findByText('Piano')
    await userEvent.type(screen.getByLabelText('שם כלי חדש'), 'Flute')
    await userEvent.click(screen.getByRole('button', { name: 'הוסף כלי' }))

    await waitFor(() => expect(screen.getByText('הכלי נוצר.')).toBeInTheDocument())
    expect(createAdminInstrument).toHaveBeenCalledWith({ name: 'Flute', isActive: true })
    expect(await screen.findByText('Flute')).toBeInTheDocument()
  })

  it('updates an instrument', async () => {
    vi.mocked(updateAdminInstrument).mockResolvedValue({ id: 1, name: 'Grand Piano', isActive: false })
    vi.mocked(getAdminInstruments)
      .mockResolvedValueOnce(instruments)
      .mockResolvedValueOnce([
        { id: 1, name: 'Grand Piano', isActive: false },
        instruments[1],
      ])

    render(<AdminInstrumentsPage />)

    await screen.findByText('Piano')
    const pianoRow = screen.getByText('Piano').closest('tr')
    expect(pianoRow).not.toBeNull()
    await userEvent.click(within(pianoRow!).getByRole('button', { name: 'עריכה' }))
    await userEvent.clear(screen.getByLabelText('שם כלי לעריכה'))
    await userEvent.type(screen.getByLabelText('שם כלי לעריכה'), 'Grand Piano')
    await userEvent.click(screen.getByLabelText('שם כלי לעריכה').closest('tr')!.querySelector('input[type="checkbox"]')!)
    await userEvent.click(screen.getByRole('button', { name: 'שמירה' }))

    await waitFor(() => expect(screen.getByText('הכלי עודכן.')).toBeInTheDocument())
    expect(updateAdminInstrument).toHaveBeenCalledWith(1, {
      name: 'Grand Piano',
      isActive: false,
    })
    expect(await screen.findByText('Grand Piano')).toBeInTheDocument()
  })

  it('displays API error messages', async () => {
    vi.mocked(createAdminInstrument).mockRejectedValue({
      isAxiosError: true,
      response: { data: { message: 'Instrument name is already in use.' } },
    })

    render(<AdminInstrumentsPage />)

    await screen.findByText('Piano')
    await userEvent.type(screen.getByLabelText('שם כלי חדש'), 'Piano')
    await userEvent.click(screen.getByRole('button', { name: 'הוסף כלי' }))

    expect(await screen.findByText('שם הכלי כבר נמצא בשימוש.')).toBeInTheDocument()
  })
})
