import { useCallback, useEffect, useState } from 'react'
import { getApiErrorMessage } from '../api/apiClient'
import { getAuditLogsPaged } from '../api/auditApi'
import { Pager } from '../components/Pager'
import type { AuditLogDto } from '../types/material'
import { formatAuditAction, formatAuditDetails, formatDateTime, formatEntityType } from '../utils/displayText'

const PAGE_SIZE = 50

export function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogDto[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadLogs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await getAuditLogsPaged({ search: search || undefined, page, pageSize: PAGE_SIZE })
      setLogs(result.items)
      setTotalCount(result.totalCount)
    } catch (err) {
      setError(getApiErrorMessage(err, 'לא ניתן לטעון את יומן הפעילות.'))
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch when page/search changes
    void loadLogs()
  }, [loadLogs])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
    setSearch(searchInput)
  }

  return (
    <section>
      <h1>יומן פעילות</h1>
      <p className="page-description">פעולות ניהול אחרונות במשתמשים, כלים וחומרים.</p>

      <form className="toolbar" onSubmit={handleSearch}>
        <label>
          חיפוש
          <input
            placeholder="חיפוש פעולות, משתמשים וישויות..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </label>
        <button type="submit" className="secondary-button">חפש</button>
      </form>

      {loading && <p className="empty-state">טוען יומן פעילות...</p>}
      {error && <p className="error-text">{error}</p>}
      {!loading && !error && totalCount === 0 && (
        <p className="empty-state">{search ? 'לא נמצאו רשומות התואמות את החיפוש.' : 'עדיין לא נרשמו פעולות ביומן.'}</p>
      )}

      {!loading && !error && logs.length > 0 && (
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
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{formatDateTime(log.createdAtUtc)}</td>
                  <td>{log.actorName}</td>
                  <td>{formatAuditAction(log.action)}</td>
                  <td>
                    {formatEntityType(log.entityType)}
                    {log.entityId ? ` #${log.entityId}` : ''}
                  </td>
                  <td>{formatAuditDetails(log.details)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager page={page} pageSize={PAGE_SIZE} totalCount={totalCount} onPageChange={setPage} />
    </section>
  )
}
