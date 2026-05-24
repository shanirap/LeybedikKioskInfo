import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getApiErrorMessage } from '../api/apiClient'
import { downloadMaterial, getApprovedMaterials, likeMaterial } from '../api/materialsApi'
import { Button } from '../components/Button'
import { IconButton } from '../components/IconButton'
import { MaterialCard, MaterialCardFooter } from '../components/MaterialCard'
import type { MaterialDto } from '../types/material'
import { formatDate, formatMaterialLevel } from '../utils/displayText'
import { useAuth } from '../utils/useAuth'

type SortMode = 'newest' | 'popular' | 'liked' | 'title'

export function TeacherLibraryPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [materials, setMaterials] = useState<MaterialDto[]>([])
  const [search, setSearch] = useState('')
  const [instrumentId, setInstrumentId] = useState('all')
  const [sortMode, setSortMode] = useState<SortMode>('newest')
  const [loading, setLoading] = useState(true)
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

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
          formatMaterialLevel(material.level),
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

  const loadMaterials = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setMaterials(await getApprovedMaterials())
    } catch (err) {
      setError(getApiErrorMessage(err, 'לא ניתן לטעון את החומרים.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadMaterials()
  }, [loadMaterials])

  async function handleLike(material: MaterialDto) {
    if (material.isLikedByCurrentUser || material.uploadedByEmail === user?.email || busyAction) return

    setBusyAction(`like-${material.id}`)
    setActionError(null)
    try {
      const updated = await likeMaterial(material.id)
      setMaterials((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      )
    } catch (err) {
      setActionError(getApiErrorMessage(err, 'לא ניתן לסמן לייק.'))
    } finally {
      setBusyAction(null)
    }
  }

  async function handleDownload(material: MaterialDto) {
    if (busyAction) return

    setBusyAction(`download-${material.id}`)
    setActionError(null)
    try {
      await downloadMaterial(material.id, material.fileName)
      await loadMaterials()
    } catch (err) {
      setActionError(getApiErrorMessage(err, 'לא ניתן להוריד את הקובץ.'))
    } finally {
      setBusyAction(null)
    }
  }

  function handlePreview(material: MaterialDto) {
    navigate(`/materials/${material.id}/preview`, { state: { from: location.pathname } })
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
      {actionError && <p className="error-text">{actionError}</p>}
      {!loading && !error && materials.length === 0 && (
        <p className="empty-state">עדיין אין חומרים מאושרים להצגה.</p>
      )}
      {!loading && !error && materials.length > 0 && visibleMaterials.length === 0 && (
        <p className="empty-state">לא נמצאו חומרים שמתאימים לסינון הנוכחי.</p>
      )}

      <div className="card-grid">
        {visibleMaterials.map((material) => (
          <MaterialCard
            key={material.id}
            kicker="חומר לימוד"
            title={material.title}
            badges={[
              { label: material.instrumentName, className: 'instrument-badge' },
              { label: formatMaterialLevel(material.level) },
            ]}
            description={material.description ?? undefined}
            metaItems={[
              `מורה: ${material.uploadedByName}`,
              `אושר: ${formatDate(material.approvedAtUtc ?? material.createdAtUtc)}`,
              `קובץ: ${material.fileName}`,
            ]}
            stats={
              <div className="material-stats">
                <span>{material.downloadCount} הורדות</span>
                <span>{material.likeCount} לייקים</span>
              </div>
            }
            footer={
              <MaterialCardFooter
                primary={
                  <Button variant="preview" onClick={() => handlePreview(material)}>
                    צפייה בקובץ
                  </Button>
                }
                tools={
                  <>
                    <IconButton
                      label={busyAction === `download-${material.id}` ? 'מוריד...' : 'הורדה'}
                      variant="ghost"
                      disabled={busyAction === `download-${material.id}`}
                      onClick={() => void handleDownload(material)}
                    >
                      <span aria-hidden="true">↓</span>
                    </IconButton>
                    <IconButton
                      variant="like"
                      label={
                        material.uploadedByEmail === user?.email
                          ? 'לא ניתן לסמן לייק לחומר שלך'
                          : material.isLikedByCurrentUser
                            ? 'כבר סימנת לייק'
                            : 'סמן לייק'
                      }
                      disabled={
                        material.isLikedByCurrentUser ||
                        material.uploadedByEmail === user?.email ||
                        busyAction === `like-${material.id}`
                      }
                      onClick={() => void handleLike(material)}
                    >
                      <span aria-hidden="true">{material.isLikedByCurrentUser ? '♥' : '👍'}</span>
                    </IconButton>
                  </>
                }
              />
            }
          />
        ))}
      </div>
    </section>
  )
}
