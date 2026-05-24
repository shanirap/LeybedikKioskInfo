export function toggleInstrumentIds(
  selectedIds: number[],
  instrumentId: number,
): number[] {
  return selectedIds.includes(instrumentId)
    ? selectedIds.filter((id) => id !== instrumentId)
    : [...selectedIds, instrumentId]
}
