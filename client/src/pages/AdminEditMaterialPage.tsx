import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getApiErrorMessage } from '../api/apiClient'
import { getAdminInstruments } from '../api/instrumentsApi'
import {
  downloadMaterialForReview,
  getMaterialPreviewDetails,
  updateAdminMaterial,
} from '../api/materialsApi'
import type { InstrumentDto, MaterialDto } from '../types/material'
import { formatStatus } from '../utils/displayText'
import { useToast } from '../utils/useToast'

function getEditHeading(status: MaterialDto['status']) {
  if (status === 'Approved') return 'עריכת חומר מאושר'
  if (status === 'Rejected') return 'עריכת חומר שנדחה'
  return 'עריכת חומר לפני אישור'
}

export function AdminEditMaterialPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showSuccess, showError } = useToast()
  const materialId = Number(id)
  const isValidId = Number.isFinite(materialId)

  const [material, setMaterial] = useState<MaterialDto | null>(null)
  const [instruments, setInstruments] = useState<InstrumentDto[]>([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [instrumentId, setInstrumentId] = useState('')
  const [level, setLevel] = useState<MaterialDto['level']>('Beginner')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!isValidId) return

    async function loadPage() {
      setLoading(true)
      setLoadError(null)
      try {
        const [loadedMaterial, loadedInstruments] = await Promise.all([
          getMaterialPreviewDetails(materialId),
          getAdminInstruments(),
        ])
        setMaterial(loadedMaterial)
        setInstruments(loadedInstruments)
        setTitle(loadedMaterial.title)
        setDescription(loadedMaterial.description ?? '')
        setInstrumentId(String(loadedMaterial.instrumentId))
        setLevel(loadedMaterial.level)
      } catch (err) {
        const message = getApiErrorMessage(err, 'לא ניתן לטעון את החומר לעריכה.')
        setLoadError(message)
        showError(message)
      } finally {
        setLoading(false)
      }
    }

    void loadPage()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isValidId, materialId])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!material) return
    if (!title.trim()) {
      showError('יש להזין כותרת לחומר.')
      return
    }

    setSaving(true)
    try {
      const formData = new FormData()
      formData.append('title', title.trim())
      formData.append('description', description.trim())
      formData.append('instrumentId', instrumentId)
      formData.append('level', level)
      if (file) formData.append('file', file)

      await updateAdminMaterial(material.id, formData)
      showSuccess('החומר עודכן בהצלחה.')
      navigate('/admin/pending-materials')
    } catch (err) {
      showError(getApiErrorMessage(err, 'אירעה שגיאה בשמירה.'))
    } finally {
      setSaving(false)
    }
  }

  async function handleDownloadCurrentFile() {
    if (!material) return
    try {
      await downloadMaterialForReview(material.id, material.fileName)
    } catch (err) {
      showError(getApiErrorMessage(err, 'לא ניתן להוריד את הקובץ.'))
    }
  }

  if (!isValidId) {
    return (
      <section className="upload-page">
        <p className="error-text">מזהה חומר לא תקין.</p>
        <Link to="/admin/pending-materials" className="secondary-button">
          חזרה לניהול חומרים
        </Link>
      </section>
    )
  }

  if (loading) {
    return (
      <section className="upload-page">
        <p className="empty-state">טוען חומר לעריכה...</p>
      </section>
    )
  }

  if (!material) {
    return (
      <section className="upload-page">
        <p className="error-text">{loadError ?? 'החומר לא נמצא.'}</p>
        <Link to="/admin/pending-materials" className="secondary-button">
          חזרה לניהול חומרים
        </Link>
      </section>
    )
  }

  return (
    <section className="upload-page">
      <div className="page-hero upload-hero">
        <span className="eyebrow">ניהול תוכן</span>
        <h1>{getEditHeading(material.status)}</h1>
        <p className="page-description">
          סטטוס נוכחי: {formatStatus(material.status)} · קובץ נוכחי: {material.fileName}
        </p>
      </div>

      <div className="upload-layout">
        <form className="form-panel upload-form" onSubmit={handleSubmit}>
          <label>
            <span>כותרת</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={250} required />
          </label>
          <label>
            <span>תיאור</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
          </label>
          <label>
            <span>כלי נגינה</span>
            <select value={instrumentId} onChange={(e) => setInstrumentId(e.target.value)} required>
              {instruments.map((instrument) => (
                <option value={instrument.id} key={instrument.id}>
                  {instrument.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>רמת החומר</span>
            <select value={level} onChange={(e) => setLevel(e.target.value as MaterialDto['level'])}>
              <option value="Beginner">מתחילים</option>
              <option value="Advanced">מתקדמים</option>
            </select>
          </label>
          <label className="file-dropzone">
            <span className="file-dropzone-title">החלפת קובץ (אופציונלי)</span>
            <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <span className="file-picker-button">בחירת קובץ</span>
            <strong>{file ? file.name : 'יישאר הקובץ הקיים'}</strong>
          </label>
          <div className="button-row">
            <button type="button" className="secondary-button" onClick={() => void handleDownloadCurrentFile()}>
              הורדת הקובץ הנוכחי
            </button>
            <button type="submit" disabled={saving}>
              {saving ? 'שומר...' : 'שמירה'}
            </button>
            <Link to="/admin/pending-materials" className="secondary-button">
              ביטול
            </Link>
          </div>
        </form>
      </div>
    </section>
  )
}
