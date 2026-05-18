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
    if (!file || !instrumentId) return

    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      const formData = new FormData()
      formData.append('title', title)
      formData.append('description', description)
      formData.append('instrumentId', instrumentId)
      formData.append('file', file)

      await uploadMaterial(formData)
      setTitle('')
      setDescription('')
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
      </div>

      {message && <p className="success-text">{message}</p>}
      {error && <p className="error-text">{error}</p>}

      <div className="upload-layout">
        <form className="form-panel upload-form" onSubmit={handleSubmit}>
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
            >
              {instruments.map((instrument) => (
                <option value={instrument.id} key={instrument.id}>
                  {instrument.name}
                </option>
              ))}
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

          <button className="submit-button" type="submit" disabled={loading || !file}>
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
