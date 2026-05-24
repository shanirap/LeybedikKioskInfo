import { Link, Outlet, useNavigate } from 'react-router-dom'
import { APP_TITLE, formatRole, INSTITUTION_LOGO_SRC } from './utils/displayText'
import { useAuth } from './utils/useAuth'
import './App.css'

export default function App() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-top">
          <Link className="brand-link" to={user ? '/teacher-library' : '/login'}>
            <img className="brand-logo" src={INSTITUTION_LOGO_SRC} alt="לוגו לייבעדיק" />
            <span className="brand-text">
              <strong>{APP_TITLE}</strong>
            </span>
          </Link>

          {user && (
            <div className="app-nav-actions">
              <span className="app-nav-user">{user.fullName} ({formatRole(user.role)})</span>
              <button className="logout-btn" type="button" onClick={handleLogout}>יציאה</button>
            </div>
          )}
        </div>

        {user && (
          <nav className="app-nav" aria-label="ניווט ראשי">
            <div className="app-nav-links">
              {(user.role === 'Teacher' || user.role === 'Admin') && (
                <>
                  <Link to="/teacher-library">ספרייה</Link>
                  <Link to="/upload-material">העלאת חומר</Link>
                  <Link to="/my-uploads">החומרים שלי</Link>
                  <Link to="/teacher/wallet">הארנק שלי</Link>
                  <Link to="/account">החשבון שלי</Link>
                </>
              )}
              {user.role === 'Admin' && (
                <>
                  <Link to="/admin/users">משתמשים</Link>
                  <Link to="/admin/instruments">כלי נגינה</Link>
                  <Link to="/admin/pending-materials">ניהול חומרים</Link>
                  <Link to="/admin/archived-materials">ארכיון חומרים</Link>
                  <Link to="/admin/audit-logs">יומן פעילות</Link>
                </>
              )}
            </div>
          </nav>
        )}
      </header>

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
