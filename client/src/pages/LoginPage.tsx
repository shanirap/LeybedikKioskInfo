import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { getApiErrorMessage } from '../api/apiClient'
import { login as loginApi } from '../api/authApi'
import { useAuth } from '../utils/useAuth'
import { APP_TITLE, INSTITUTION_LOGO_SRC } from '../utils/displayText'
import loginWatermarkSrc from '../assets/login/piano-watermark.png'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const authUser = await loginApi({ email, password })
      login(authUser)
      if (authUser.role === 'Admin') {
        navigate('/admin/pending-materials', { replace: true })
      } else {
        navigate('/teacher-library', { replace: true })
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'כתובת המייל או הסיסמה אינם נכונים.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-wrapper">
      <div className="login-watermark" aria-hidden="true">
        <img src={loginWatermarkSrc} alt="" />
      </div>
      <form className="login-form" onSubmit={handleSubmit}>
        <div className="login-brand">
          <img src={INSTITUTION_LOGO_SRC} alt="לוגו לייבעדיק" />
        </div>
        <h2>כניסה למערכת {APP_TITLE}</h2>

        {error && <p className="login-error">{error}</p>}

        <label>
          מייל
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
        </label>

        <label>
          סיסמה
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        <button type="submit" disabled={loading}>
          {loading ? 'מתחבר...' : 'כניסה'}
        </button>
      </form>
    </div>
  )
}
