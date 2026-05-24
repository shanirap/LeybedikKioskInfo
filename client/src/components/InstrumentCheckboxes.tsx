import type { InstrumentDto } from '../types/material'

export function InstrumentCheckboxes({
  instruments,
  selectedIds,
  onToggle,
}: {
  instruments: InstrumentDto[]
  selectedIds: number[]
  onToggle: (instrumentId: number) => void
}) {
  return (
    <div className="checkbox-grid">
      {instruments.map((instrument) => (
        <label className="checkbox-label" key={instrument.id}>
          <input
            type="checkbox"
            checked={selectedIds.includes(instrument.id)}
            onChange={() => onToggle(instrument.id)}
          />
          {instrument.name}
        </label>
      ))}
    </div>
  )
}
