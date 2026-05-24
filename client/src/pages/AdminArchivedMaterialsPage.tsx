import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getApiErrorMessage } from '../api/apiClient'
import { getArchivedMaterials, restoreMaterial } from '../api/materialsApi'
import { Button } from '../components/Button'
import { MaterialCard, MaterialCardFooter } from '../components/MaterialCard'
import { Pager } from '../components/Pager'
import type { MaterialDto } from '../types/material'
import { formatDateTime, formatMaterialLevel, formatStatus } from '../utils/displayText'

const PAGE_SIZE = 20

export function AdminArchivedMaterialsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [materials, setMaterials] = useState<MaterialDto[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadMaterials()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search])

  async function loadMaterials() {
    setLoading(true)
    setError(null)
    try {
      const result = await getArchivedMaterials({ search: search || undefined, page, pageSize: PAGE_SIZE })
      setMaterials(result.items)
      setTotalCount(result.totalCount)
    } catch (err) {
      setError(getApiErrorMessage(err, 'לא ניתן לטעון את ארכיון החומרים.'))
    } finally {
      setLoading(false)
    }
  }

  async function handleRestore(material: MaterialDto) {
    setError(null)
    setMessage(null)
    try {
      await restoreMaterial(material.id)
      setMessage('החומר שוחזר.')
      await loadMaterials()
    } catch (err) {
      setError(getApiErrorMessage(err, 'לא ניתן לשחזר את החומר.'))
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
    setSearch(searchInput)
  }

  function handlePreview(material: MaterialDto) {
    navigate(`/materials/${material.id}/preview`, { state: { from: location.pathname } })
  }

  return (
    <section className="library-page admin-archived-page">
      <div className="page-hero library-hero">
        <div>
          <span className="eyebrow">ארכיון</span>
          <h1>ארכיון חומרים</h1>
          <p className="page-description">
            חומרים שאורכבו אינם מוצגים בספרייה, בהעלאות שלי או בתצוגה מקדימה.
          </p>
        </div>
        <div className="library-summary" aria-label="סיכום ארכיון">
          <span>
            <strong>{totalCount}</strong>
            בארכיון
          </span>
        </div>
      </div>

      <form className="toolbar my-uploads-toolbar" onSubmit={handleSearch}>
        <label>
          חיפוש
          <input
            placeholder="חיפוש לפי כותרת, מורה, כלי..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </label>
        <button type="submit" className="secondary-button">
          חפש
        </button>
      </form>

      {loading && <p className="empty-state">טוען ארכיון...</p>}
      {message && <p className="success-text">{message}</p>}
      {error && <p className="error-text">{error}</p>}
      {!loading && !error && totalCount === 0 && (
        <p className="empty-state">
          {search ? 'לא נמצאו חומרים התואמים את החיפוש.' : 'אין כרגע חומרים בארכיון.'}
        </p>
      )}

      <div className="card-grid">
        {materials.map((material) => {
          const metaItems = [
            `הועלה על ידי: ${material.uploadedByName}`,
            `קובץ: ${material.fileName}`,
            `הוגש: ${formatDateTime(material.createdAtUtc)}`,
          ]
          if (material.rejectedAtUtc) {
            metaItems.push(`נדחה: ${formatDateTime(material.rejectedAtUtc)}`)
          }

          return (
            <MaterialCard
              key={material.id}
              kicker="בארכיון"
              title={material.title}
              badges={[
                { label: material.instrumentName, className: 'instrument-badge' },
                { label: formatMaterialLevel(material.level) },
                {
                  label: formatStatus(material.status),
                  className: `status-${material.status.toLowerCase()}`,
                },
              ]}
              description={material.description ?? undefined}
              metaItems={metaItems}
              alert={
                material.rejectionReason ? (
                  <p className="empty-state">סיבת דחייה: {material.rejectionReason}</p>
                ) : undefined
              }
              footer={
                <MaterialCardFooter
                  primary={
                    <Button variant="primary" onClick={() => void handleRestore(material)}>
                      שחזור
                    </Button>
                  }
                  tools={
                    <Button variant="ghost" onClick={() => handlePreview(material)}>
                      צפייה
                    </Button>
                  }
                />
              }
            />
          )
        })}
      </div>
      <Pager page={page} pageSize={PAGE_SIZE} totalCount={totalCount} onPageChange={setPage} />
    </section>
  )
}
