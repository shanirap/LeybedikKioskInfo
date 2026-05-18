import { useEffect, useMemo, useState } from 'react'
import { getApiErrorMessage } from '../api/apiClient'
import {
  approveMaterial,
  downloadMaterialForReview,
  getAdminMaterials,
  previewMaterial,
  rejectMaterial,
} from '../api/materialsApi'
import type { MaterialDto } from '../types/material'
import { formatDateTime, formatStatus } from '../utils/displayText'

type StatusFilter = 'All' | MaterialDto['status']

export function AdminPendingMaterialsPage() {
  const [materials, setMaterials] = useState<MaterialDto[]>([])
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('Pending')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const visibleMaterials = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return materials

    return materials.filter((material) =>
      [
        material.title,
        material.description ?? '',
        material.instrumentName,
        material.uploadedByName,
        material.fileName,
        material.status,
      ]
        .join(' ')
        .toLowerCase()
        .includes(query),
    )
  }, [materials, search])

  useEffect(() => {
    loadMaterials()
    // loadMaterials intentionally reads the latest statusFilter for this page refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter])

  async function loadMaterials() {
    setLoading(true)
    setError(null)
    try {
      setMaterials(
        await getAdminMaterials(statusFilter === 'All' ? undefined : statusFilter),
      )
    } catch (err) {
      setError(getApiErrorMessage(err, 'לא ניתן לטעון את החומרים.'))
    } finally {
      setLoading(false)
    }
  }

  async function handleApprove(id: number) {
    await approveMaterial(id)
    await loadMaterials()
  }

  async function handleReject(id: number) {
    await rejectMaterial(id)
    await loadMaterials()
  }

  async function handleDownload(material: MaterialDto) {
    await downloadMaterialForReview(material.id, material.fileName)
  }

  async function handlePreview(material: MaterialDto) {
    await previewMaterial(material.id, material.fileName)
  }

  return (
    <section>
      <h1>חומרים</h1>
      <p className="page-description">בדיקת חומרים ממתינים וצפייה בהיסטוריית האישורים.</p>

      <div className="toolbar">
        <label>
          חיפוש
          <input
            placeholder="חיפוש לפי כותרת, מורה, כלי או קובץ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <label>
          סטטוס
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          >
            <option value="All">הכל</option>
            <option value="Pending">{formatStatus('Pending')}</option>
            <option value="Approved">{formatStatus('Approved')}</option>
            <option value="Rejected">{formatStatus('Rejected')}</option>
          </select>
        </label>
      </div>

      {loading && <p className="empty-state">טוען חומרים...</p>}
      {error && <p className="error-text">{error}</p>}
      {!loading && !error && materials.length === 0 && (
        <p className="empty-state">אין כרגע חומרים בסטטוס שנבחר.</p>
      )}
      {!loading && !error && materials.length > 0 && visibleMaterials.length === 0 && (
        <p className="empty-state">לא נמצאו חומרים שמתאימים לחיפוש הנוכחי.</p>
      )}

      <div className="card-grid">
        {visibleMaterials.map((material) => (
          <article className="card" key={material.id}>
            <div className="card-header">
              <h2>{material.title}</h2>
              <div className="badge-stack">
                <span className="badge">{material.instrumentName}</span>
                <span className={`badge status-${material.status.toLowerCase()}`}>
                  {formatStatus(material.status)}
                </span>
              </div>
            </div>
            {material.description && <p>{material.description}</p>}
            <p className="muted">הועלה על ידי: {material.uploadedByName}</p>
            <p className="muted">קובץ: {material.fileName}</p>
            <p className="muted">הוגש: {formatDateTime(material.createdAtUtc)}</p>
            {material.approvedAtUtc && (
              <p className="muted">
                אושר: {formatDateTime(material.approvedAtUtc)}
              </p>
            )}
            <div className="button-row">
              <button className="secondary-button" onClick={() => handlePreview(material)}>
                צפייה
              </button>
              <button className="secondary-button" onClick={() => handleDownload(material)}>
                הורדה לבדיקה
              </button>
              {material.status !== 'Approved' && (
                <button onClick={() => handleApprove(material.id)}>אישור</button>
              )}
              {material.status !== 'Rejected' && (
                <button className="danger-button" onClick={() => handleReject(material.id)}>
                  דחייה
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
