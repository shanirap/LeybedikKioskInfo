import { useState } from 'react'

type RejectMaterialDialogProps = {
  onConfirm: (reason: string) => void
  onCancel: () => void
}

export function RejectMaterialDialog({ onConfirm, onCancel }: RejectMaterialDialogProps) {
  const [reason, setReason] = useState('')
  const trimmedReason = reason.trim()
  const canReject = trimmedReason.length > 0

  return (
    <div className="confirm-dialog-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reject-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="reject-dialog-title">דחיית חומר</h2>
        <label className="confirm-dialog-field" htmlFor="reject-reason">
          סיבת דחייה
          <textarea
            id="reject-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            autoFocus
          />
        </label>
        <div className="button-row">
          <button
            type="button"
            className="danger-button"
            disabled={!canReject}
            onClick={() => onConfirm(trimmedReason)}
          >
            דחיית חומר
          </button>
          <button type="button" className="secondary-button" onClick={onCancel}>
            ביטול
          </button>
        </div>
      </div>
    </div>
  )
}
