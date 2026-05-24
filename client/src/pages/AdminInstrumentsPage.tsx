import { useEffect, useState, type FormEvent } from 'react'
import { getApiErrorMessage } from '../api/apiClient'
import {
  createAdminInstrument,
  getAdminInstruments,
  updateAdminInstrument,
} from '../api/instrumentsApi'
import type { InstrumentDto } from '../types/material'

export function AdminInstrumentsPage() {
  const [instruments, setInstruments] = useState<InstrumentDto[]>([])
  const [newName, setNewName] = useState('')
  const [newIsActive, setNewIsActive] = useState(true)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [editIsActive, setEditIsActive] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    loadInstruments()
  }, [])

  async function loadInstruments() {
    setLoading(true)
    setError(null)
    try {
      setInstruments(await getAdminInstruments())
    } catch (err) {
      setError(getApiErrorMessage(err, 'לא ניתן לטעון את כלי הנגינה.'))
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    const name = newName.trim()
    if (!name) {
      setError('יש להזין שם כלי.')
      return
    }

    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      await createAdminInstrument({ name, isActive: newIsActive })
      setNewName('')
      setNewIsActive(true)
      setMessage('הכלי נוצר.')
      await loadInstruments()
    } catch (err) {
      setError(getApiErrorMessage(err, 'לא ניתן ליצור כלי. ודא שהשם ייחודי.'))
    } finally {
      setSaving(false)
    }
  }

  function startEdit(instrument: InstrumentDto) {
    setEditingId(instrument.id)
    setEditName(instrument.name)
    setEditIsActive(instrument.isActive)
    setError(null)
    setMessage(null)
  }

  async function handleUpdate(instrumentId: number) {
    const name = editName.trim()
    if (!name) {
      setError('יש להזין שם כלי.')
      return
    }

    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      await updateAdminInstrument(instrumentId, { name, isActive: editIsActive })
      setEditingId(null)
      setMessage('הכלי עודכן.')
      await loadInstruments()
    } catch (err) {
      setError(getApiErrorMessage(err, 'לא ניתן לעדכן כלי. ודא שהשם ייחודי.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section>
      <h1>כלי נגינה</h1>
      <p className="page-description">ניהול רשימת כלי הנגינה הזמינים לשיוך, העלאה וסינון.</p>

      {error && <p className="error-text">{error}</p>}
      {message && <p className="success-text">{message}</p>}

      <section className="admin-section">
        <h2>הוספת כלי</h2>
        <form className="inline-form" onSubmit={handleCreate}>
          <label>
            שם כלי חדש
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              maxLength={100}
              required
            />
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={newIsActive}
              onChange={(e) => setNewIsActive(e.target.checked)}
            />
            פעיל
          </label>
          <button type="submit" disabled={saving || !newName.trim()}>
            {saving ? 'שומר...' : 'הוסף כלי'}
          </button>
        </form>
      </section>

      <section className="admin-section">
        <h2>כלים קיימים</h2>
        {loading && <p className="empty-state">טוען כלי נגינה...</p>}
        {!loading && !error && instruments.length === 0 && (
          <p className="empty-state">עדיין לא הוגדרו כלי נגינה.</p>
        )}

        {!loading && instruments.length > 0 && (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>שם כלי</th>
                  <th>סטטוס</th>
                  <th>פעולות</th>
                </tr>
              </thead>
              <tbody>
                {instruments.map((instrument) => (
                  <tr key={instrument.id}>
                    {editingId === instrument.id ? (
                      <>
                        <td>
                          <label>
                            שם כלי לעריכה
                            <input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              maxLength={100}
                              required
                            />
                          </label>
                        </td>
                        <td>
                          <label className="checkbox-label">
                            <input
                              type="checkbox"
                              checked={editIsActive}
                              onChange={(e) => setEditIsActive(e.target.checked)}
                            />
                            פעיל
                          </label>
                        </td>
                        <td>
                          <div className="button-row">
                            <button
                              onClick={() => handleUpdate(instrument.id)}
                              disabled={saving || !editName.trim()}
                            >
                              {saving ? 'שומר...' : 'שמירה'}
                            </button>
                            <button
                              className="secondary-button"
                              onClick={() => setEditingId(null)}
                              disabled={saving}
                            >
                              ביטול
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>{instrument.name}</td>
                        <td>{instrument.isActive ? 'פעיל' : 'לא פעיל'}</td>
                        <td>
                          <button onClick={() => startEdit(instrument)}>עריכה</button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  )
}
