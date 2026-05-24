import { useEffect, useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getApiErrorMessage } from '../api/apiClient'
import { getAdminInstruments } from '../api/instrumentsApi'
import {
  approveMaterial,
  deleteAdminMaterial,
  downloadMaterialForReview,
  getAdminMaterials,
  rejectMaterial,
  updateAdminMaterial,
} from '../api/materialsApi'
import { ActionMenu } from '../components/ActionMenu'
import { Button } from '../components/Button'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { IconButton } from '../components/IconButton'
import { MaterialCard, MaterialCardFooter } from '../components/MaterialCard'
import { Pager } from '../components/Pager'
import type { InstrumentDto, MaterialDto } from '../types/material'
import { formatDateTime, formatMaterialLevel, formatStatus } from '../utils/displayText'

type StatusFilter = 'All' | MaterialDto['status']

const PAGE_SIZE = 20

function buildAdminMenuItems(
  material: MaterialDto,
  handlers: {
    startEdit: (material: MaterialDto) => void
    handleApprove: (id: number) => void
    handleReject: (id: number) => void
    handleDelete: (material: MaterialDto) => void
  },
) {
  const items = []

  if (material.status !== 'Approved') {
    items.push({
      label: 'עריכה',
      onClick: () => handlers.startEdit(material),
    })
    items.push({
      label: 'אישור',
      onClick: () => handlers.handleApprove(material.id),
    })
  }

  if (material.status !== 'Rejected') {
    items.push({
      label: 'דחייה',
      onClick: () => handlers.handleReject(material.id),
      variant: 'danger' as const,
    })
  }

  items.push({
    label: 'ארכוב',
    onClick: () => handlers.handleDelete(material),
    variant: 'danger' as const,
  })

  return items
}

export function AdminPendingMaterialsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [materials, setMaterials] = useState<MaterialDto[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('Pending')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [instruments, setInstruments] = useState<InstrumentDto[]>([])
  const [editingMaterial, setEditingMaterial] = useState<MaterialDto | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editInstrumentId, setEditInstrumentId] = useState('')
  const [editLevel, setEditLevel] = useState<MaterialDto['level']>('Beginner')
  const [editFile, setEditFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [materialToArchive, setMaterialToArchive] = useState<MaterialDto | null>(null)

  useEffect(() => {
    loadMaterials()
    getAdminInstruments()
      .then(setInstruments)
      .catch(() => setInstruments([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, page, search])

  async function loadMaterials() {
    setLoading(true)
    setError(null)
    try {
      const result = await getAdminMaterials({
        status: statusFilter === 'All' ? undefined : statusFilter,
        search: search || undefined,
        page,
        pageSize: PAGE_SIZE,
      })
      setMaterials(result.items)
      setTotalCount(result.totalCount)
    } catch (err) {
      setError(getApiErrorMessage(err, 'לא ניתן לטעון את החומרים.'))
    } finally {
      setLoading(false)
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
    setSearch(searchInput)
  }

  function handleStatusChange(value: StatusFilter) {
    setStatusFilter(value)
    setPage(1)
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

      await updateAdminMaterial(editingMaterial.id, formData)
      setEditingMaterial(null)
      setEditFile(null)
      setMessage('החומר עודכן.')
      await loadMaterials()
    } catch (err) {
      setError(getApiErrorMessage(err, 'לא ניתן לעדכן את החומר.'))
    }
  }

  async function handleApprove(id: number) {
    setMessage(null)
    setError(null)
    try {
      await approveMaterial(id)
      setMessage('החומר אושר.')
      await loadMaterials()
    } catch (err) {
      setError(getApiErrorMessage(err, 'לא ניתן לאשר את החומר.'))
    }
  }

  async function handleReject(id: number) {
    const reason = window.prompt('סיבת דחייה (אופציונלי):') ?? undefined
    setMessage(null)
    setError(null)
    try {
      await rejectMaterial(id, reason)
      setMessage('החומר נדחה.')
      await loadMaterials()
    } catch (err) {
      setError(getApiErrorMessage(err, 'לא ניתן לדחות את החומר.'))
    }
  }

  async function handleDownload(material: MaterialDto) {
    setError(null)
    try {
      await downloadMaterialForReview(material.id, material.fileName)
    } catch (err) {
      setError(getApiErrorMessage(err, 'לא ניתן להוריד את הקובץ.'))
    }
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
      await deleteAdminMaterial(materialToArchive.id)
      setMessage('החומר הועבר לארכיון.')
      setMaterialToArchive(null)
      await loadMaterials()
    } catch (err) {
      setError(getApiErrorMessage(err, 'לא ניתן לארכב את החומר.'))
      setMaterialToArchive(null)
    }
  }

  const pendingCount = materials.filter((material) => material.status === 'Pending').length

  return (
    <section className="library-page admin-materials-page">
      <div className="page-hero library-hero">
        <div>
          <span className="eyebrow">ניהול תוכן</span>
          <h1>ניהול חומרים</h1>
          <p className="page-description">
            בדיקת חומרים לפי סטטוס, עריכה לפני אישור, אישור, דחייה וארכוב בטוח.
          </p>
        </div>
        <div className="library-summary" aria-label="סיכום ניהול חומרים">
          <span>
            <strong>{totalCount}</strong>
            חומרים
          </span>
          <span>
            <strong>{pendingCount}</strong>
            ממתינים
          </span>
        </div>
      </div>

      <form className="toolbar library-toolbar" onSubmit={handleSearch}>
        <label>
          חיפוש
          <input
            placeholder="חיפוש לפי כותרת, מורה, כלי או קובץ..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </label>
        <label>
          סטטוס
          <select
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value as StatusFilter)}
          >
            <option value="All">הכל</option>
            <option value="Pending">{formatStatus('Pending')}</option>
            <option value="Approved">{formatStatus('Approved')}</option>
            <option value="Rejected">{formatStatus('Rejected')}</option>
          </select>
        </label>
        <button type="submit" className="secondary-button">
          חפש
        </button>
      </form>

      {loading && <p className="empty-state">טוען חומרים...</p>}
      {message && <p className="success-text">{message}</p>}
      {error && <p className="error-text">{error}</p>}
      {editingMaterial && (
        <form className="form-panel upload-form" onSubmit={handleSaveEdit}>
          <h2>עריכת חומר לפני אישור</h2>
          <p className="muted">קובץ נוכחי: {editingMaterial.fileName}</p>
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
            <span className="file-dropzone-title">החלפת קובץ (אופציונלי)</span>
            <input type="file" onChange={(e) => setEditFile(e.target.files?.[0] ?? null)} />
            <span className="file-picker-button">בחירת קובץ</span>
            <strong>{editFile ? editFile.name : 'יישאר הקובץ הקיים'}</strong>
          </label>
          <div className="button-row">
            <button type="button" className="secondary-button" onClick={() => void handleDownload(editingMaterial)}>
              הורדת הקובץ הנוכחי
            </button>
            <button type="submit">שמירה</button>
            <button type="button" className="secondary-button" onClick={() => setEditingMaterial(null)}>
              ביטול
            </button>
          </div>
        </form>
      )}
      {!loading && !error && totalCount === 0 && (
        <p className="empty-state">
          {search ? 'לא נמצאו חומרים התואמים את החיפוש.' : 'אין כרגע חומרים בסטטוס שנבחר.'}
        </p>
      )}

      <div className="card-grid">
        {materials.map((material) => {
          const metaItems = [
            `הועלה על ידי: ${material.uploadedByName}`,
            `מייל: ${material.uploadedByEmail}`,
            `קובץ: ${material.fileName}`,
            `הוגש: ${formatDateTime(material.createdAtUtc)}`,
          ]
          if (material.approvedAtUtc) {
            metaItems.push(`אושר: ${formatDateTime(material.approvedAtUtc)}`)
          }
          if (material.rejectedAtUtc) {
            metaItems.push(`נדחה: ${formatDateTime(material.rejectedAtUtc)}`)
          }

          return (
            <MaterialCard
              key={material.id}
              kicker={material.status === 'Pending' ? 'ממתין לאישור' : 'חומר לבדיקה'}
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
                    <Button variant="preview" onClick={() => handlePreview(material)}>
                      צפייה
                    </Button>
                  }
                  tools={
                    <>
                      <IconButton
                        label="הורדה לבדיקה"
                        variant="ghost"
                        onClick={() => void handleDownload(material)}
                      >
                        <span aria-hidden="true">↓</span>
                      </IconButton>
                      <ActionMenu
                        items={buildAdminMenuItems(material, {
                          startEdit,
                          handleApprove,
                          handleReject,
                          handleDelete,
                        })}
                      />
                    </>
                  }
                />
              }
            />
          )
        })}
      </div>
      <Pager page={page} pageSize={PAGE_SIZE} totalCount={totalCount} onPageChange={setPage} />
      {materialToArchive && (
        <ConfirmDialog
          title="ארכוב חומר"
          message="לארכב את החומר הזה? הוא יוסר מהרשימות אך הקובץ לא יימחק פיזית."
          confirmLabel="ארכוב"
          onConfirm={() => void confirmArchive()}
          onCancel={() => setMaterialToArchive(null)}
        />
      )}
    </section>
  )
}
