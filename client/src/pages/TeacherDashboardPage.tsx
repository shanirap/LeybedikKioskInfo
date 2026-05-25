import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getApiErrorMessage } from '../api/apiClient'
import { getTeacherDashboardSummary, type TeacherDashboardSummary } from '../api/materialsApi'
import { useAuth } from '../utils/useAuth'
import { useToast } from '../utils/useToast'

const summaryCards: Array<{
  key: keyof TeacherDashboardSummary
  label: string
  description: string
}> = [
  {
    key: 'approvedAvailableCount',
    label: 'חומרים מאושרים בספרייה',
    description: 'חומרים זמינים לצפייה והורדה',
  },
  {
    key: 'myUploadsCount',
    label: 'החומרים שהעליתי',
    description: 'כל החומרים שהעלית למערכת',
  },
  {
    key: 'pendingCount',
    label: 'ממתינים לאישור',
    description: 'חומרים שממתינים לבדיקת מנהל',
  },
  {
    key: 'rejectedCount',
    label: 'נדחו',
    description: 'חומרים שנדחו ודורשים עדכון',
  },
]

export function TeacherDashboardPage() {
  const { user } = useAuth()
  const { showError } = useToast()
  const [summary, setSummary] = useState<TeacherDashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadSummary() {
      setLoading(true)
      try {
        setSummary(await getTeacherDashboardSummary())
      } catch (err) {
        showError(getApiErrorMessage(err, 'לא ניתן לטעון את סיכום לוח הבקרה.'))
      } finally {
        setLoading(false)
      }
    }

    void loadSummary()
  }, [showError])

  return (
    <section className="teacher-dashboard-page">
      <div className="page-hero library-hero">
        <div>
          <span className="eyebrow">לוח בקרה</span>
          <h1>שלום, {user?.fullName ?? 'מורה'}</h1>
          <p className="page-description">
            סיכום מהיר של החומרים שלך, הסטטוס שלהם ופעולות נפוצות במערכת.
          </p>
        </div>
      </div>

      {loading && <p className="empty-state">טוען סיכום...</p>}

      {summary && (
        <>
          <div className="dashboard-summary-grid" aria-label="סיכום חומרים">
            {summaryCards.map((card) => (
              <article key={card.key} className="dashboard-summary-card">
                <strong>{summary[card.key]}</strong>
                <span className="dashboard-summary-label">{card.label}</span>
                <span className="dashboard-summary-description">{card.description}</span>
              </article>
            ))}
          </div>

          <section className="dashboard-quick-actions" aria-label="פעולות מהירות">
            <h2>פעולות מהירות</h2>
            <div className="dashboard-action-row">
              <Link to="/upload-material" className="submit-button">
                העלאת חומר
              </Link>
              <Link to="/my-uploads" className="secondary-button">
                החומרים שלי
              </Link>
              <Link to="/my-favorites" className="secondary-button">
                המועדפים שלי
              </Link>
              <Link to="/teacher-library" className="secondary-button">
                לספרייה
              </Link>
            </div>
          </section>
        </>
      )}
    </section>
  )
}
