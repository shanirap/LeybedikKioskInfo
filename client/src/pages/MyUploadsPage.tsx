import { useEffect, useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getApiErrorMessage } from '../api/apiClient'
import { getInstruments } from '../api/instrumentsApi'
import { deleteMyUploadedMaterial, getMyUploadedMaterials, updateMyUploadedMaterial } from '../api/materialsApi'
import { ActionMenu } from '../components/ActionMenu'
import { Button } from '../components/Button'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { MaterialCard, MaterialCardFooter } from '../components/MaterialCard'
import { Pager } from '../components/Pager'
import type { InstrumentDto, MaterialDto } from '../types/material'
import { formatDateTime, formatMaterialLevel, formatStatus } from '../utils/displayText'

const PAGE_SIZE = 20

export function MyUploadsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [materials, setMaterials] = useState<MaterialDto[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [instruments, setInstruments] = useState<InstrumentDto[]>([])
  const [editingMaterial, setEditingMaterial] = useState<MaterialDto | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editInstrumentId, setEditInstrumentId] = useState('')
  const [editLevel, setEditLevel] = useState<MaterialDto['level']>('Beginner')
  const [editFile, setEditFile] = useState<File | null>(null)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [materialToArchive, setMaterialToArchive] = useState<MaterialDto | null>(null)

  useEffect(() => {
    loadMaterials()
    getInstruments()
      .then(setInstruments)
      .catch(() => setInstruments([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search])

  async function loadMaterials() {
    setLoading(true)
    setError(null)
    try {
      const result = await getMyUploadedMaterials({ search: search || undefined, page, pageSize: PAGE_SIZE })
      setMaterials(result.items)
      setTotalCount(result.totalCount)
    } catch (err) {
      setError(getApiErrorMessage(err, 'לא ניתן לטעון את החומרים שהעלית.'))
    } finally {
      setLoading(false)
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

  async function handleDelete(material: MaterialDto) {
    setMaterialToArchive(material)
  }

  async function confirmArchive() {
    if (!materialToArchive) return

    setError(null)
    setMessage(null)
    try {
      await deleteMyUploadedMaterial(materialToArchive.id)
      setMessage('החומר הועבר לארכיון.')
      setMaterialToArchive(null)
      await loadMaterials()
    } catch (err) {
      setError(getApiErrorMessage(err, 'לא ניתן לארכב את החומר.'))
      setMaterialToArchive(null)
    }
  }

  function startEdit(material: MaterialDto) {
    setEditingMaterial(material)
    setEditTitle(material.title)
    setEditDescription(material.description ?? '')
    setEditInstrumentId(String(material.instrumentId))
    setEditLevel(material.level)
    setEditFile(null)
    setMessage(null)
    setError(null)
  }

  async function handleSaveEdit(e: FormEvent) {
    e.preventDefault()
    if (!editingMaterial) return
    if (!editTitle.trim()) {
      setError('יש להזין כותרת לחומר.')
      return
    }

    setError(null)
    setMessage(null)
    try {
      const formData = new FormData()
      formData.append('title', editTitle.trim())
      formData.append('description', editDescription.trim())
      formData.append('instrumentId', editInstrumentId)
      formData.append('level', editLevel)
      if (editFile) formData.append('file', editFile)

      await updateMyUploadedMaterial(editingMaterial.id, formData)
      setEditingMaterial(null)
      setEditFile(null)
      setMessage('החומר עודכן ונשלח מחדש לבדיקה.')
      await loadMaterials()
    } catch (err) {
      setError(getApiErrorMessage(err, 'לא ניתן לעדכן את החומר.'))
    }
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
            <strong>{totalCount}</strong>
            חומרים
          </span>
        </div>
      </div>

      <form className="toolbar my-uploads-toolbar" onSubmit={handleSearch}>
        <label>
          חיפוש
          <input
            placeholder="חיפוש לפי כותרת, כלי..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </label>
        <button type="submit" className="secondary-button">
          חפש
        </button>
      </form>

      {loading && <p className="empty-state">טוען את החומרים שהעלית...</p>}
      {message && <p className="success-text">{message}</p>}
      {error && <p className="error-text">{error}</p>}
      {editingMaterial && (
        <form className="form-panel upload-form" onSubmit={handleSaveEdit}>
          <h2>עריכת חומר</h2>
          <label>
            <span>כותרת</span>
            <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} maxLength={250} required />
          </label>
          <label>
            <span>תיאור</span>
            <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={3} />
          </label>
          <label>
            <span>כלי נגינה</span>
            <select value={editInstrumentId} onChange={(e) => setEditInstrumentId(e.target.value)} required>
              {instruments.map((instrument) => (
                <option value={instrument.id} key={instrument.id}>
                  {instrument.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>רמת החומר</span>
            <select value={editLevel} onChange={(e) => setEditLevel(e.target.value as MaterialDto['level'])}>
              <option value="Beginner">מתחילים</option>
              <option value="Advanced">מתקדמים</option>
            </select>
          </label>
          <label className="file-dropzone">
            <span className="file-dropzone-title">קובץ חדש (אופציונלי)</span>
            <input type="file" onChange={(e) => setEditFile(e.target.files?.[0] ?? null)} />
            <span className="file-picker-button">בחירת קובץ</span>
            <strong>{editFile ? editFile.name : 'יישאר הקובץ הקיים'}</strong>
          </label>
          <div className="button-row">
            <button type="submit">שמירה</button>
            <button type="button" className="secondary-button" onClick={() => setEditingMaterial(null)}>
              ביטול
            </button>
          </div>
        </form>
      )}
      {!loading && !error && totalCount === 0 && (
        <p className="empty-state">
          {search ? 'לא נמצאו חומרים התואמים את החיפוש.' : 'עדיין לא העלית חומרים למערכת.'}
        </p>
      )}

      <div className="card-grid">
        {materials.map((material) => {
          const metaItems = [
            `קובץ: ${material.fileName}`,
            `הועלה: ${formatDateTime(material.createdAtUtc)}`,
          ]
          if (material.approvedAtUtc) {
            metaItems.push(`אושר: ${formatDateTime(material.approvedAtUtc)}`)
          }
          if (material.rejectedAtUtc) {
            metaItems.push(`נדחה: ${formatDateTime(material.rejectedAtUtc)}`)
          }

          const canManage = material.status !== 'Approved'
          const menuItems = canManage
            ? [
                {
                  label: 'עריכה',
                  onClick: () => startEdit(material),
                },
                {
                  label: 'ארכוב',
                  onClick: () => void handleDelete(material),
                  variant: 'danger' as const,
                },
              ]
            : []

          return (
            <MaterialCard
              key={material.id}
              kicker="חומר שהעלית"
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
                  tools={canManage ? <ActionMenu items={menuItems} /> : undefined}
                />
              }
              footerNote={
                !canManage ? (
                  <p className="card-footer-note">חומר מאושר — לארכוב יש לפנות למנהל.</p>
                ) : undefined
              }
            />
          )
        })}
      </div>
      <Pager page={page} pageSize={PAGE_SIZE} totalCount={totalCount} onPageChange={setPage} />
      {materialToArchive && (
        <ConfirmDialog
          title="ארכוב חומר"
          message="לארכב את החומר הזה? הוא יוסר מהרשימה אך הקובץ לא יימחק פיזית."
          confirmLabel="ארכוב"
          onConfirm={() => void confirmArchive()}
          onCancel={() => setMaterialToArchive(null)}
        />
      )}
    </section>
  )
}
