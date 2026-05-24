interface PagerProps {
  page: number
  pageSize: number
  totalCount: number
  onPageChange: (page: number) => void
}

export function Pager({ page, pageSize, totalCount, onPageChange }: PagerProps) {
  const totalPages = Math.ceil(totalCount / pageSize)
  if (totalPages <= 1) return null

  return (
    <div className="pager">
      <button
        className="secondary-button"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        ← הקודם
      </button>
      <span className="pager-info">
        עמוד {page} מתוך {totalPages} ({totalCount} סה״כ)
      </span>
      <button
        className="secondary-button"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        הבא →
      </button>
    </div>
  )
}
