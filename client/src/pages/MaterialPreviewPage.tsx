import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { getApiErrorMessage } from '../api/apiClient'
import { downloadMaterial, getMaterialPreviewBlob, getMaterialPreviewDetails } from '../api/materialsApi'
import type { MaterialDto } from '../types/material'
import { formatDateTime, formatMaterialLevel, formatStatus } from '../utils/displayText'

type PreviewKind = 'pdf' | 'image' | 'unsupported'

function getPreviewKind(fileName: string): PreviewKind {
  const extension = fileName.split('.').pop()?.toLowerCase()
  if (extension === 'pdf') return 'pdf'
  if (extension === 'png' || extension === 'jpg' || extension === 'jpeg') return 'image'
  return 'unsupported'
}

export function MaterialPreviewPage() {
  const { id } = useParams()
  const location = useLocation()
  const materialId = Number(id)
  const backTo = (location.state as { from?: string } | null)?.from ?? '/teacher-library'
  const backLabel = backTo.startsWith('/admin') ? 'חזרה לניהול' : 'חזרה לספרייה'
  const [material, setMaterial] = useState<MaterialDto | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)

  const previewKind = useMemo(
    () => (material ? getPreviewKind(material.fileName) : 'unsupported'),
    [material],
  )

  useEffect(() => {
    let active = true
    let objectUrl: string | null = null

    async function loadPreview() {
      if (!Number.isInteger(materialId) || materialId <= 0) {
        setError('מזהה החומר אינו תקין.')
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)
      setPreviewError(null)

      try {
        const details = await getMaterialPreviewDetails(materialId)
        if (!active) return
        setMaterial(details)

        const kind = getPreviewKind(details.fileName)
        if (kind === 'unsupported') {
          setPreviewLoading(false)
          return
        }

        setPreviewLoading(true)
        const blob = await getMaterialPreviewBlob(materialId)
        if (!active) return
        objectUrl = URL.createObjectURL(blob)
        setPreviewUrl(objectUrl)
      } catch (err) {
        if (active) setError(getApiErrorMessage(err, 'לא ניתן לטעון את התצוגה המקדימה.'))
      } finally {
        if (active) {
          setLoading(false)
          setPreviewLoading(false)
        }
      }
    }

    loadPreview()

    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [materialId])

  async function handleDownload() {
    if (!material) return
    try {
      await downloadMaterial(material.id, material.fileName)
    } catch (err) {
      setPreviewError(getApiErrorMessage(err, 'לא ניתן להוריד את הקובץ.'))
    }
  }

  return (
    <section className="material-preview-page">
      <div className="page-hero material-preview-hero">
        <div>
          <span className="eyebrow">תצוגה מקדימה</span>
          <h1>{material?.title ?? 'צפייה בקובץ'}</h1>
          <p className="page-description">
            צפייה בקובץ יחד עם פרטי החומר, הסטטוס והנתונים המרכזיים שלו.
          </p>
        </div>
        <Link className="text-link" to={backTo}>
          {backLabel}
        </Link>
      </div>

      {loading && <p className="empty-state">טוען תצוגה מקדימה...</p>}
      {error && <p className="error-text">{error}</p>}

      {!loading && !error && material && (
        <div className="material-preview-layout">
          <aside className="card material-preview-details">
            <div className="badge-stack">
              <span className="badge">{material.instrumentName}</span>
              <span className="badge">{formatMaterialLevel(material.level)}</span>
              <span className={`badge status-${material.status.toLowerCase()}`}>
                {formatStatus(material.status)}
              </span>
            </div>

            {material.description && <p className="card-description">{material.description}</p>}

            <dl className="details-list">
              <div>
                <dt>מורה</dt>
                <dd>{material.uploadedByName}</dd>
              </div>
              <div>
                <dt>קובץ</dt>
                <dd>{material.fileName}</dd>
              </div>
              <div>
                <dt>הועלה</dt>
                <dd>{formatDateTime(material.createdAtUtc)}</dd>
              </div>
              {material.approvedAtUtc && (
                <div>
                  <dt>אושר</dt>
                  <dd>{formatDateTime(material.approvedAtUtc)}</dd>
                </div>
              )}
              {material.rejectedAtUtc && (
                <div>
                  <dt>נדחה</dt>
                  <dd>{formatDateTime(material.rejectedAtUtc)}</dd>
                </div>
              )}
              <div>
                <dt>הורדות</dt>
                <dd>{material.downloadCount}</dd>
              </div>
              <div>
                <dt>לייקים</dt>
                <dd>{material.likeCount}</dd>
              </div>
            </dl>
            {material.rejectionReason && <p className="empty-state">סיבת דחייה: {material.rejectionReason}</p>}

            <div className="button-row">
              <button onClick={handleDownload}>הורדה</button>
            </div>
            {previewError && <p className="error-text">{previewError}</p>}
          </aside>

          <div className="card material-preview-frame">
            {previewKind === 'unsupported' && (
              <div className="empty-state">
                סוג הקובץ הזה לא מוצג ישירות בדפדפן. אפשר להוריד אותו ולפתוח במחשב.
              </div>
            )}
            {previewLoading && <p className="empty-state">טוען קובץ...</p>}
            {previewKind === 'pdf' && previewUrl && (
              <iframe title={`תצוגה מקדימה של ${material.title}`} src={previewUrl} />
            )}
            {previewKind === 'image' && previewUrl && (
              <img src={previewUrl} alt={`תצוגה מקדימה של ${material.title}`} />
            )}
          </div>
        </div>
      )}
    </section>
  )
}
