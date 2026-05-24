import { useEffect, useState, type FormEvent } from 'react'
import { getApiErrorMessage } from '../api/apiClient'
import { getInstruments } from '../api/instrumentsApi'
import { uploadMaterial } from '../api/materialsApi'
import type { InstrumentDto } from '../types/material'

export function UploadMaterialPage() {
  const [instruments, setInstruments] = useState<InstrumentDto[]>([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [instrumentId, setInstrumentId] = useState('')
  const [level, setLevel] = useState<'Beginner' | 'Advanced'>('Beginner')
  const [file, setFile] = useState<File | null>(null)
  const [fileInputKey, setFileInputKey] = useState(0)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadInstruments() {
      try {
        const items = await getInstruments()
        setInstruments(items)
        if (items.length > 0) setInstrumentId(String(items[0].id))
      } catch (err) {
        setError(getApiErrorMessage(err, 'לא ניתן לטעון את רשימת הכלים.'))
      }
    }

    loadInstruments()
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!instrumentId) {
      setError('אין כלי נגינה זמינים להעלאה. יש לפנות למנהל לשיוך כלי.')
      return
    }
    if (!title.trim()) {
      setError('יש להזין כותרת לחומר.')
      return
    }
    if (!file) {
      setError('יש לבחור קובץ להעלאה.')
      return
    }

    setLoading(true)
    setError(null)
    setMessage(null)

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
      setMessage('החומר הועלה וממתין לאישור מנהל.')
    } catch (err) {
      setError(getApiErrorMessage(err, 'לא ניתן להעלות את החומר.'))
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

      {message && <p className="success-text">{message}</p>}
      {error && <p className="error-text">{error}</p>}

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

          <label className="file-dropzone">
            <span className="file-dropzone-title">קובץ</span>
            <input
              key={fileInputKey}
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              required
            />
            <span className="file-picker-button">בחירת קובץ</span>
            <strong>{file ? file.name : 'לא נבחר קובץ'}</strong>
            <small>PDF, Word, PowerPoint או תמונה עד 50MB</small>
          </label>

          <button
            className="submit-button"
            type="submit"
            disabled={loading || !file || instruments.length === 0}
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
