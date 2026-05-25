import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getApiErrorMessage } from '../api/apiClient'
import { getAdminDashboardSummary, type AdminDashboardSummary } from '../api/materialsApi'
import { useAuth } from '../utils/useAuth'
import { useToast } from '../utils/useToast'

const summaryCards: Array<{
  key: keyof AdminDashboardSummary
  label: string
}> = [
  { key: 'pendingMaterialsCount', label: 'חומרים ממתינים לאישור' },
  { key: 'approvedMaterialsCount', label: 'חומרים שאושרו' },
  { key: 'rejectedMaterialsCount', label: 'חומרים שנדחו' },
  { key: 'archivedMaterialsCount', label: 'חומרים בארכיון' },
  { key: 'activeTeachersCount', label: 'מורים פעילים' },
  { key: 'activeInstrumentsCount', label: 'כלי נגינה פעילים' },
]

export function AdminDashboardPage() {
  const { user } = useAuth()
  const { showError } = useToast()
  const [summary, setSummary] = useState<AdminDashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadSummary() {
      setLoading(true)
      try {
        setSummary(await getAdminDashboardSummary())
      } catch (err) {
        showError(getApiErrorMessage(err, 'לא ניתן לטעון את סיכום לוח הניהול.'))
      } finally {
        setLoading(false)
      }
    }

    void loadSummary()
  }, [showError])

  return (
    <section className="admin-dashboard-page">
      <div className="page-hero library-hero">
        <div>
          <span className="eyebrow">לוח ניהול</span>
          <h1>שלום, {user?.fullName ?? 'מנהל'}</h1>
          <p className="page-description">
            סיכום מערכתי של חומרים, מורים וכלי נגינה, עם גישה מהירה לפעולות ניהול.
          </p>
        </div>
      </div>

      {loading && <p className="empty-state">טוען סיכום...</p>}

      {summary && (
        <>
          <div className="dashboard-summary-grid" aria-label="סיכום ניהול">
            {summaryCards.map((card) => (
              <article key={card.key} className="dashboard-summary-card">
                <strong>{summary[card.key]}</strong>
                <span className="dashboard-summary-label">{card.label}</span>
              </article>
            ))}
          </div>

          <section className="dashboard-quick-actions" aria-label="פעולות מהירות">
            <h2>פעולות מהירות</h2>
            <div className="dashboard-action-row">
              <Link to="/admin/pending-materials" className="submit-button">
                ניהול חומרים
              </Link>
              <Link to="/admin/pending-materials" className="secondary-button">
                בדיקת חומרים ממתינים
              </Link>
              <Link to="/admin/archived-materials" className="secondary-button">
                ארכיון חומרים
              </Link>
              <Link to="/admin/users" className="secondary-button">
                ניהול מורים
              </Link>
              <Link to="/admin/instruments" className="secondary-button">
                ניהול כלי נגינה
              </Link>
              <Link to="/admin/audit-logs" className="secondary-button">
                יומן פעילות
              </Link>
            </div>
          </section>
        </>
      )}
    </section>
  )
}
