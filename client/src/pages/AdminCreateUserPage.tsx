import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getApiErrorMessage } from '../api/apiClient'
import { createAdminUser, getAdminInstruments } from '../api/instrumentsApi'
import { InstrumentCheckboxes } from '../components/InstrumentCheckboxes'
import { toggleInstrumentIds } from '../utils/instrumentForm'
import type { InstrumentDto } from '../types/material'
import { formatRole } from '../utils/displayText'

type Role = 'Admin' | 'Teacher'

export function AdminCreateUserPage() {
  const navigate = useNavigate()
  const [instruments, setInstruments] = useState<InstrumentDto[]>([])
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('Teacher')
  const [isActive, setIsActive] = useState(true)
  const [instrumentIds, setInstrumentIds] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getAdminInstruments()
      .then(setInstruments)
      .catch(() => setInstruments([]))
      .finally(() => setLoading(false))
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await createAdminUser({
        fullName,
        email,
        password,
        role,
        isActive,
        instrumentIds: role === 'Teacher' ? instrumentIds : [],
      })
      navigate('/admin/users', { state: { message: 'המשתמש נוצר.' } })
    } catch (err) {
      setError(getApiErrorMessage(err, 'לא ניתן ליצור משתמש. ודא שכתובת המייל ייחודית.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="upload-page">
      <div className="page-hero upload-hero">
        <span className="eyebrow">ניהול משתמשים</span>
        <h1>יצירת משתמש</h1>
        <p className="page-description">הוספת מנהל או מורה חדש, כולל שיוך כלי נגינה למורים.</p>
      </div>

      {loading && <p className="empty-state">טוען כלים...</p>}
      {error && <p className="error-text">{error}</p>}

      {!loading && (
        <div className="upload-layout">
          <form className="form-panel upload-form admin-user-form" onSubmit={handleSubmit}>
            <label>
              <span>שם מלא</span>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                maxLength={200}
              />
            </label>
            <label>
              <span>מייל</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            <label>
              <span>סיסמה ראשונית</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </label>
            <label>
              <span>תפקיד</span>
              <select
                value={role}
                onChange={(e) => {
                  setRole(e.target.value as Role)
                  setInstrumentIds([])
                }}
              >
                <option value="Teacher">{formatRole('Teacher')}</option>
                <option value="Admin">{formatRole('Admin')}</option>
              </select>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              פעיל
            </label>
            {role === 'Teacher' && (
              <InstrumentCheckboxes
                instruments={instruments}
                selectedIds={instrumentIds}
                onToggle={(instrumentId) =>
                  setInstrumentIds((current) => toggleInstrumentIds(current, instrumentId))
                }
              />
            )}
            <div className="button-row">
              <button type="submit" disabled={saving}>
                {saving ? 'יוצר...' : 'יצירת משתמש'}
              </button>
              <Link to="/admin/users" className="secondary-button">
                ביטול
              </Link>
            </div>
          </form>
        </div>
      )}
    </section>
  )
}
