import { useEffect, useMemo, useState } from 'react'
import { getApiErrorMessage } from '../api/apiClient'
import { getMyUploadedMaterials, previewMaterial } from '../api/materialsApi'
import type { MaterialDto } from '../types/material'
import { formatDateTime, formatStatus } from '../utils/displayText'

type StatusFilter = 'All' | MaterialDto['status']

export function MyUploadsPage() {
  const [materials, setMaterials] = useState<MaterialDto[]>([])
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const visibleMaterials = useMemo(() => {
    const query = search.trim().toLowerCase()

    return materials.filter((material) => {
      const matchesStatus = statusFilter === 'All' || material.status === statusFilter
      const haystack = [
        material.title,
        material.description ?? '',
        material.instrumentName,
        material.uploadedByName,
        material.fileName,
        formatStatus(material.status),
      ]
        .join(' ')
        .toLowerCase()

      return matchesStatus && (!query || haystack.includes(query))
    })
  }, [materials, search, statusFilter])

  const approvedCount = materials.filter((material) => material.status === 'Approved').length
  const totalLikes = materials.reduce((sum, material) => sum + material.likeCount, 0)

  useEffect(() => {
    async function loadMaterials() {
      setLoading(true)
      setError(null)
      try {
        setMaterials(await getMyUploadedMaterials())
      } catch (err) {
        setError(getApiErrorMessage(err, 'לא ניתן לטעון את החומרים שהעלית.'))
      } finally {
        setLoading(false)
      }
    }

    loadMaterials()
  }, [])

  async function handlePreview(material: MaterialDto) {
    await previewMaterial(material.id, material.fileName)
  }

  return (
    <section className="library-page my-uploads-page">
      <div className="page-hero library-hero">
        <div>
          <span className="eyebrow">מעקב אישי</span>
          <h1>החומרים שהעליתי</h1>
          <p className="page-description">
            כאן אפשר לעקוב אחרי החומרים שהעלית, לראות סטטוס אישור ולבדוק כמה לייקים הם קיבלו.
          </p>
        </div>
        <div className="library-summary" aria-label="סיכום החומרים שלי">
          <span>
            <strong>{materials.length}</strong>
            חומרים
          </span>
          <span>
            <strong>{approvedCount}</strong>
            מאושרים
          </span>
          <span>
            <strong>{totalLikes}</strong>
            לייקים
          </span>
        </div>
      </div>

      <div className="toolbar my-uploads-toolbar">
        <label>
          חיפוש
          <input
            placeholder="חיפוש לפי כותרת, מורה, כלי, סטטוס או קובץ..."
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

      {loading && <p className="empty-state">טוען את החומרים שהעלית...</p>}
      {error && <p className="error-text">{error}</p>}
      {!loading && !error && materials.length === 0 && (
        <p className="empty-state">עדיין לא העלית חומרים למערכת.</p>
      )}
      {!loading && !error && materials.length > 0 && visibleMaterials.length === 0 && (
        <p className="empty-state">לא נמצאו חומרים שמתאימים לסינון הנוכחי.</p>
      )}

      <div className="card-grid">
        {visibleMaterials.map((material) => (
          <article className="card library-card" key={material.id}>
            <div className="card-header">
              <div>
                <span className="card-kicker">חומר שהעלית</span>
                <h2>{material.title}</h2>
              </div>
              <div className="badge-stack">
                <span className="badge instrument-badge">{material.instrumentName}</span>
                <span className={`badge status-${material.status.toLowerCase()}`}>
                  {formatStatus(material.status)}
                </span>
              </div>
            </div>
            {material.description && <p className="card-description">{material.description}</p>}

            <div className="material-meta">
              <span>קובץ: {material.fileName}</span>
              <span>הועלה: {formatDateTime(material.createdAtUtc)}</span>
              {material.approvedAtUtc && <span>אושר: {formatDateTime(material.approvedAtUtc)}</span>}
            </div>

            <div className="material-stats">
              <span>{material.downloadCount} הורדות</span>
              <span>{material.likeCount} לייקים</span>
            </div>

            <div className="button-row library-actions">
              <button className="secondary-button preview-button" onClick={() => handlePreview(material)}>
                צפייה בקובץ
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
