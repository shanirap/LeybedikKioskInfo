import { useEffect, useState } from 'react'
import { getApiErrorMessage } from '../api/apiClient'
import { getTeacherWallet } from '../api/materialsApi'
import type { TeacherWalletDto } from '../types/material'
import { formatStatus } from '../utils/displayText'

export function TeacherWalletPage() {
  const [wallet, setWallet] = useState<TeacherWalletDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadWallet() {
      setLoading(true)
      setError(null)
      try {
        const data = await getTeacherWallet()
        setWallet(data)
      } catch (err) {
        setError(getApiErrorMessage(err, 'לא ניתן לטעון את נתוני הארנק.'))
      } finally {
        setLoading(false)
      }
    }

    void loadWallet()
  }, [])

  return (
    <section>
      <h1>הארנק שלי</h1>
      <p className="page-description">סיכום לייקים והורדות ייחודיות על החומרים שהעלית.</p>

      {loading && <p className="empty-state">טוען נתונים...</p>}
      {error && <p className="error-text">{error}</p>}

      {!loading && !error && wallet && wallet.totalMaterials === 0 && (
        <p className="empty-state">עדיין אין נתונים להצגה.</p>
      )}

      {!loading && !error && wallet && wallet.totalMaterials > 0 && (
        <>
          <div className="summary-cards">
            <article className="summary-card">
              <h2>סך הלייקים שקיבלתי</h2>
              <p className="summary-value">{wallet.totalLikes}</p>
            </article>
            <article className="summary-card">
              <h2>סך ההורדות הייחודיות</h2>
              <p className="summary-value">{wallet.totalUniqueDownloads}</p>
            </article>
            <article className="summary-card">
              <h2>מספר החומרים שלי</h2>
              <p className="summary-value">{wallet.totalMaterials}</p>
            </article>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>שם החומר</th>
                  <th>כלי</th>
                  <th>סטטוס</th>
                  <th>לייקים</th>
                  <th>הורדות ייחודיות</th>
                </tr>
              </thead>
              <tbody>
                {wallet.materials.map((material) => (
                  <tr key={material.materialId}>
                    <td>{material.title}</td>
                    <td>{material.instrumentName}</td>
                    <td>{formatStatus(material.status)}</td>
                    <td>{material.likesCount}</td>
                    <td>{material.uniqueDownloadsCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  )
}
