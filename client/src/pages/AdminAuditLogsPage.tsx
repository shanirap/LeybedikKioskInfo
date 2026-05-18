import { useEffect, useMemo, useState } from 'react'
import { getApiErrorMessage } from '../api/apiClient'
import { getAuditLogs } from '../api/auditApi'
import type { AuditLogDto } from '../types/material'
import { formatAuditAction, formatDateTime, formatEntityType } from '../utils/displayText'

export function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogDto[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const visibleLogs = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return logs

    return logs.filter((log) =>
      [
        log.actorName,
        log.action,
        log.entityType,
        log.entityId?.toString() ?? '',
        log.details ?? '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(query),
    )
  }, [logs, search])

  useEffect(() => {
    async function loadLogs() {
      setLoading(true)
      setError(null)
      try {
        setLogs(await getAuditLogs())
      } catch (err) {
        setError(getApiErrorMessage(err, 'לא ניתן לטעון את יומן הפעילות.'))
      } finally {
        setLoading(false)
      }
    }

    loadLogs()
  }, [])

  return (
    <section>
      <h1>יומן פעילות</h1>
      <p className="page-description">פעולות ניהול אחרונות במשתמשים, כלים וחומרים.</p>

      <div className="toolbar">
        <label>
          חיפוש
          <input
            placeholder="חיפוש פעולות, משתמשים וישויות..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>

      {loading && <p className="empty-state">טוען יומן פעילות...</p>}
      {error && <p className="error-text">{error}</p>}
      {!loading && !error && visibleLogs.length === 0 && (
        <p className="empty-state">עדיין לא נרשמו פעולות ביומן.</p>
      )}

      {!loading && !error && visibleLogs.length > 0 && (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>זמן</th>
                <th>מבצע הפעולה</th>
                <th>פעולה</th>
                <th>ישות</th>
                <th>פרטים</th>
              </tr>
            </thead>
            <tbody>
              {visibleLogs.map((log) => (
                <tr key={log.id}>
                  <td>{formatDateTime(log.createdAtUtc)}</td>
                  <td>{log.actorName}</td>
                  <td>{formatAuditAction(log.action)}</td>
                  <td>
                    {formatEntityType(log.entityType)}
                    {log.entityId ? ` #${log.entityId}` : ''}
                  </td>
                  <td>{log.details ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
