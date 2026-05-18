import { useEffect, useMemo, useState } from 'react'
import { getApiErrorMessage } from '../api/apiClient'
import { downloadMaterial, getApprovedMaterials, likeMaterial, previewMaterial } from '../api/materialsApi'
import type { MaterialDto } from '../types/material'
import { formatDate } from '../utils/displayText'

type SortMode = 'newest' | 'popular' | 'liked' | 'title'

export function TeacherLibraryPage() {
  const [materials, setMaterials] = useState<MaterialDto[]>([])
  const [search, setSearch] = useState('')
  const [instrumentId, setInstrumentId] = useState('all')
  const [sortMode, setSortMode] = useState<SortMode>('newest')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const instruments = useMemo(() => {
    const unique = new Map<number, string>()
    for (const material of materials) unique.set(material.instrumentId, material.instrumentName)
    return Array.from(unique, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name),
    )
  }, [materials])

  const visibleMaterials = useMemo(() => {
    const query = search.trim().toLowerCase()

    return materials
      .filter((material) => {
        const matchesInstrument =
          instrumentId === 'all' || material.instrumentId === Number(instrumentId)
        const haystack = [
          material.title,
          material.description ?? '',
          material.instrumentName,
          material.uploadedByName,
          material.fileName,
        ]
          .join(' ')
          .toLowerCase()
        return matchesInstrument && (!query || haystack.includes(query))
      })
      .sort((a, b) => {
        switch (sortMode) {
          case 'popular':
            return b.downloadCount - a.downloadCount
          case 'liked':
            return b.likeCount - a.likeCount
          case 'title':
            return a.title.localeCompare(b.title)
          case 'newest':
          default:
            return (
              new Date(b.approvedAtUtc ?? b.createdAtUtc).getTime() -
              new Date(a.approvedAtUtc ?? a.createdAtUtc).getTime()
            )
        }
      })
  }, [instrumentId, materials, search, sortMode])

  useEffect(() => {
    loadMaterials()
  }, [])

  async function loadMaterials() {
    setLoading(true)
    setError(null)
    try {
      setMaterials(await getApprovedMaterials())
    } catch (err) {
      setError(getApiErrorMessage(err, 'לא ניתן לטעון את החומרים.'))
    } finally {
      setLoading(false)
    }
  }

  async function handleLike(material: MaterialDto) {
    if (material.isLikedByCurrentUser) return

    const updated = await likeMaterial(material.id)
    setMaterials((current) =>
      current.map((item) => (item.id === updated.id ? updated : item)),
    )
  }

  async function handleDownload(material: MaterialDto) {
    await downloadMaterial(material.id, material.fileName)
    await loadMaterials()
  }

  async function handlePreview(material: MaterialDto) {
    await previewMaterial(material.id, material.fileName)
  }

  return (
    <section className="library-page">
      <div className="page-hero library-hero">
        <div>
          <span className="eyebrow">מאגר חומרים מאושר</span>
          <h1>ספריית חומרים</h1>
          <p className="page-description">
            חומרים מאושרים הזמינים לכלים המשויכים אליך, עם צפייה מהירה, הורדה ולייק למורים אחרים.
          </p>
        </div>
        <div className="library-summary" aria-label="סיכום ספרייה">
          <span>
            <strong>{materials.length}</strong>
            חומרים
          </span>
          <span>
            <strong>{instruments.length}</strong>
            כלים
          </span>
          <span>
            <strong>{visibleMaterials.length}</strong>
            מוצגים
          </span>
        </div>
      </div>

      <div className="toolbar library-toolbar">
        <label>
          חיפוש
          <input
            placeholder="חיפוש לפי כותרת, מורה, תיאור או קובץ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <label>
          כלי נגינה
          <select value={instrumentId} onChange={(e) => setInstrumentId(e.target.value)}>
            <option value="all">כל הכלים</option>
            {instruments.map((instrument) => (
              <option key={instrument.id} value={instrument.id}>
                {instrument.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          מיון לפי
          <select value={sortMode} onChange={(e) => setSortMode(e.target.value as SortMode)}>
            <option value="newest">החדשים ביותר</option>
            <option value="popular">הכי הרבה הורדות</option>
            <option value="liked">הכי הרבה לייקים</option>
            <option value="title">כותרת</option>
          </select>
        </label>
      </div>

      {loading && <p className="empty-state">טוען חומרים...</p>}
      {error && <p className="error-text">{error}</p>}
      {!loading && !error && materials.length === 0 && (
        <p className="empty-state">עדיין אין חומרים מאושרים להצגה.</p>
      )}
      {!loading && !error && materials.length > 0 && visibleMaterials.length === 0 && (
        <p className="empty-state">לא נמצאו חומרים שמתאימים לסינון הנוכחי.</p>
      )}

      <div className="card-grid">
        {visibleMaterials.map((material) => (
          <article className="card library-card" key={material.id}>
            <div className="card-header">
              <div>
                <span className="card-kicker">חומר לימוד</span>
                <h2>{material.title}</h2>
              </div>
              <span className="badge instrument-badge">{material.instrumentName}</span>
            </div>
            {material.description && <p className="card-description">{material.description}</p>}

            <div className="material-meta">
              <span>מורה: {material.uploadedByName}</span>
              <span>אושר: {formatDate(material.approvedAtUtc ?? material.createdAtUtc)}</span>
              <span>קובץ: {material.fileName}</span>
            </div>

            <div className="material-stats">
              <span>{material.downloadCount} הורדות</span>
              <span>{material.likeCount} לייקים</span>
            </div>

            <div className="button-row library-actions">
              <button className="secondary-button preview-button" onClick={() => handlePreview(material)}>
                צפייה בקובץ
              </button>
              <button onClick={() => handleDownload(material)}>הורדה</button>
              <button
                className="like-button"
                disabled={material.isLikedByCurrentUser}
                aria-label={material.isLikedByCurrentUser ? 'כבר סימנת לייק' : 'סמן לייק'}
                onClick={() => handleLike(material)}
              >
                <span aria-hidden="true">
                  {material.isLikedByCurrentUser ? '♥' : '👍'}
                </span>
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
