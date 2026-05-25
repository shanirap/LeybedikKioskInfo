import { useEffect, useState, type DragEvent, type FormEvent } from 'react'
import { getApiErrorMessage } from '../api/apiClient'
import { getInstruments } from '../api/instrumentsApi'
import { uploadMaterial } from '../api/materialsApi'
import type { InstrumentDto } from '../types/material'
import {
  formatFileSize,
  isMaterialUploadTooLarge,
  MATERIAL_UPLOAD_TOO_LARGE_MESSAGE,
} from '../utils/materialUploadFile'
import { useToast } from '../utils/useToast'

export function UploadMaterialPage() {
  const { showSuccess, showError } = useToast()
  const [instruments, setInstruments] = useState<InstrumentDto[]>([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [instrumentId, setInstrumentId] = useState('')
  const [level, setLevel] = useState<'Beginner' | 'Advanced'>('Beginner')
  const [file, setFile] = useState<File | null>(null)
  const [fileInputKey, setFileInputKey] = useState(0)
  const [loading, setLoading] = useState(false)
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const fileTooLarge = file !== null && isMaterialUploadTooLarge(file)

  function selectFile(selectedFile: File | null) {
    setFile(selectedFile)
  }

  function handleDragEnter(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    event.stopPropagation()
    setIsDraggingOver(true)
  }

  function handleDragOver(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    event.stopPropagation()
    setIsDraggingOver(true)
  }

  function handleDragLeave(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    event.stopPropagation()
    setIsDraggingOver(false)
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    event.stopPropagation()
    setIsDraggingOver(false)
    selectFile(event.dataTransfer.files?.[0] ?? null)
  }

  useEffect(() => {
    async function loadInstruments() {
      try {
        const items = await getInstruments()
        setInstruments(items)
        if (items.length > 0) setInstrumentId(String(items[0].id))
      } catch (err) {
        showError(getApiErrorMessage(err, 'לא ניתן לטעון את רשימת הכלים.'))
      }
    }

    loadInstruments()
  }, [showError])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!instrumentId) {
      showError('אין כלי נגינה זמינים להעלאה. יש לפנות למנהל לשיוך כלי.')
      return
    }
    if (!title.trim()) {
      showError('יש להזין כותרת לחומר.')
      return
    }
    if (!file) {
      showError('יש לבחור קובץ להעלאה.')
      return
    }
    if (isMaterialUploadTooLarge(file)) {
      showError(MATERIAL_UPLOAD_TOO_LARGE_MESSAGE)
      return
    }

    setLoading(true)

    try {
      const formData = new FormData()
      formData.append('title', title.trim())
      formData.append('description', description.trim())
      formData.append('instrumentId', instrumentId)
      formData.append('level', level)
      formData.append('file', file)

      await uploadMaterial(formData)
      setTitle('')
      setDescription('')
      setLevel('Beginner')
      setFile(null)
      setFileInputKey((current) => current + 1)
      showSuccess('החומר הועלה וממתין לאישור מנהל.')
    } catch (err) {
      showError(getApiErrorMessage(err, 'לא ניתן להעלות את החומר.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="upload-page">
      <div className="page-hero upload-hero">
        <span className="eyebrow">שיתוף חומרי לימוד</span>
        <h1>העלאת חומר</h1>
        <p className="page-description">
          העלה קובץ מסודר לבדיקה ואישור. לאחר האישור הוא יופיע בספרייה למורים המתאימים.
        </p>
        <p className="page-description">
          סוגי קבצים מותרים: PDF, Word, PowerPoint ותמונות. הגודל המרבי הוא 50MB.
        </p>
      </div>

      <div className="upload-layout">
        <form className="form-panel upload-form" onSubmit={handleSubmit}>
          {instruments.length === 0 && (
            <p className="empty-state">אין לך כרגע כלי נגינה זמינים להעלאה.</p>
          )}
          <label>
            <span>כותרת</span>
            <input
              placeholder="לדוגמה: דף תרגול לקצב בסיסי"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={250}
            />
          </label>

          <label>
            <span>תיאור</span>
            <textarea
              placeholder="כמה מילים שיעזרו למורה להבין למי החומר מתאים."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </label>

          <label>
            <span>כלי נגינה</span>
            <select
              value={instrumentId}
              onChange={(e) => setInstrumentId(e.target.value)}
              required
              disabled={instruments.length === 0}
            >
              {instruments.map((instrument) => (
                <option value={instrument.id} key={instrument.id}>
                  {instrument.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>רמת החומר</span>
            <select value={level} onChange={(e) => setLevel(e.target.value as 'Beginner' | 'Advanced')}>
              <option value="Beginner">מתחילים</option>
              <option value="Advanced">מתקדמים</option>
            </select>
          </label>

          <label
            className={`file-dropzone${isDraggingOver ? ' file-dropzone-active' : ''}${fileTooLarge ? ' file-dropzone-invalid' : ''}`}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <span className="file-dropzone-title">קובץ</span>
            <input
              key={fileInputKey}
              type="file"
              onChange={(e) => selectFile(e.target.files?.[0] ?? null)}
              required
            />
            <span className="file-picker-button">בחירת קובץ</span>
            <strong>{file ? file.name : 'לא נבחר קובץ'}</strong>
            {file && <span className="file-dropzone-meta">גודל: {formatFileSize(file.size)}</span>}
            {fileTooLarge && (
              <p className="file-dropzone-error" role="alert">
                {MATERIAL_UPLOAD_TOO_LARGE_MESSAGE}
              </p>
            )}
            <small>PDF, Word, PowerPoint או תמונה עד 50MB. ניתן גם לגרור קובץ לכאן.</small>
          </label>

          <button
            className="submit-button"
            type="submit"
            disabled={loading || !file || fileTooLarge || instruments.length === 0}
          >
            {loading ? 'מעלה...' : 'העלה לבדיקה'}
          </button>
        </form>

        <aside className="upload-help-card">
          <h2>מה קורה אחרי ההעלאה?</h2>
          <p>החומר נשמר כטיוטה ממתינה, ומנהל בודק אותו לפני שהוא נכנס לספרייה.</p>
          <ul>
            <li>אפשר לעקוב אחרי סטטוס החומר בעמוד “החומרים שלי”.</li>
            <li>לאחר אישור, מורים מתאימים יוכלו לצפות, להוריד ולסמן לייק.</li>
            <li>שם ברור ותיאור קצר יעזרו למצוא את החומר מהר יותר.</li>
          </ul>
        </aside>
      </div>
    </section>
  )
}
