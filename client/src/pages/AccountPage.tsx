import { useState, type FormEvent } from 'react'
import { changePassword } from '../api/accountApi'
import { getApiErrorMessage } from '../api/apiClient'
import { useAuth } from '../utils/useAuth'
import { formatRole } from '../utils/displayText'

export function AccountPage() {
  const { user } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setMessage(null)

    if (newPassword !== confirmPassword) {
      setError('הסיסמאות החדשות אינן תואמות.')
      return
    }

    setLoading(true)
    try {
      await changePassword({ currentPassword, newPassword })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setMessage('הסיסמה עודכנה בהצלחה.')
    } catch (err) {
      setError(getApiErrorMessage(err, 'לא ניתן לעדכן את הסיסמה.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="account-page">
      <div className="page-hero account-hero">
        <span className="eyebrow">אזור אישי</span>
        <h1>החשבון שלי</h1>
        <p className="page-description">
          ניהול פרטי החשבון ושינוי סיסמה בצורה מאובטחת.
        </p>
      </div>

      {error && <p className="error-text">{error}</p>}
      {message && <p className="success-text">{message}</p>}

      <div className="account-layout">
        {user && (
          <aside className="account-profile-card">
            <span className="account-avatar" aria-hidden="true">
              {user.fullName.charAt(0)}
            </span>
            <h2>{user.fullName}</h2>
            <p>{user.email}</p>
            <span className="badge">{formatRole(user.role)}</span>
          </aside>
        )}

        <form className="form-panel account-form" onSubmit={handleSubmit}>
          <div>
            <span className="card-kicker">אבטחת חשבון</span>
            <h2>שינוי סיסמה</h2>
            <p className="muted">הסיסמה החדשה חייבת להכיל לפחות 8 תווים.</p>
          </div>

          <label>
            <span>סיסמה נוכחית</span>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </label>
          <label>
            <span>סיסמה חדשה</span>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
            />
          </label>
          <label>
            <span>אימות סיסמה חדשה</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
            />
          </label>
          <button className="submit-button" type="submit" disabled={loading}>
            {loading ? 'שומר...' : 'עדכון סיסמה'}
          </button>
        </form>
      </div>
    </section>
  )
}
