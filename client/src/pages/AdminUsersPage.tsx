import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { getApiErrorMessage } from '../api/apiClient'
import {
  getAdminInstruments,
  getAdminUsers,
  resetAdminUserPassword,
  updateAdminUser,
  updateAdminUserInstruments,
} from '../api/instrumentsApi'
import { InstrumentCheckboxes } from '../components/InstrumentCheckboxes'
import { toggleInstrumentIds } from '../utils/instrumentForm'
import type { AdminUserDto, InstrumentDto } from '../types/material'
import { formatRole } from '../utils/displayText'

type Role = 'Admin' | 'Teacher'

interface UserFormState {
  fullName: string
  email: string
  password: string
  role: Role
  isActive: boolean
  instrumentIds: number[]
}

const emptyEditForm: UserFormState = {
  fullName: '',
  email: '',
  password: '',
  role: 'Teacher',
  isActive: true,
  instrumentIds: [],
}

export function AdminUsersPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [users, setUsers] = useState<AdminUserDto[]>([])
  const [instruments, setInstruments] = useState<InstrumentDto[]>([])
  const [editingUserId, setEditingUserId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<UserFormState>(emptyEditForm)
  const [resetPasswordUserId, setResetPasswordUserId] = useState<number | null>(null)
  const [resetPassword, setResetPassword] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<'All' | Role>('All')
  const [minLikesInput, setMinLikesInput] = useState('')
  const [minDownloadsInput, setMinDownloadsInput] = useState('')
  const [minLikes, setMinLikes] = useState<number | undefined>()
  const [minDownloads, setMinDownloads] = useState<number | undefined>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(
    () => (location.state as { message?: string } | null)?.message ?? null,
  )

  useEffect(() => {
    if ((location.state as { message?: string } | null)?.message) {
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [location.pathname, location.state, navigate])

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [usersData, instrumentsData] = await Promise.all([
        getAdminUsers({
          search: search || undefined,
          role: roleFilter === 'All' ? undefined : roleFilter,
          minLikes,
          minDownloads,
        }),
        getAdminInstruments(),
      ])
      setUsers(usersData)
      setInstruments(instrumentsData)
    } catch (err) {
      setError(getApiErrorMessage(err, 'לא ניתן לטעון את המשתמשים.'))
    } finally {
      setLoading(false)
    }
  }, [search, roleFilter, minLikes, minDownloads])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch when filters change
    void loadData()
  }, [loadData])

  function handleFilterSearch(e: FormEvent) {
    e.preventDefault()
    setSearch(searchInput)
    setMinLikes(minLikesInput ? Number(minLikesInput) : undefined)
    setMinDownloads(minDownloadsInput ? Number(minDownloadsInput) : undefined)
  }

  function startEdit(user: AdminUserDto) {
    setEditingUserId(user.id)
    setEditForm({
      fullName: user.fullName,
      email: user.email,
      password: '',
      role: user.role,
      isActive: user.isActive,
      instrumentIds: user.instruments.map((instrument) => instrument.id),
    })
  }

  async function handleSave(userId: number) {
    setError(null)
    setMessage(null)
    try {
      await updateAdminUser(userId, {
        fullName: editForm.fullName,
        email: editForm.email,
        role: editForm.role,
        isActive: editForm.isActive,
      })

      if (editForm.role === 'Teacher') {
        await updateAdminUserInstruments(userId, editForm.instrumentIds)
      }

      setEditingUserId(null)
      setMessage('המשתמש עודכן.')
      await loadData()
    } catch (err) {
      setError(getApiErrorMessage(err, 'לא ניתן לעדכן את המשתמש.'))
    }
  }

  async function handleResetPassword(userId: number) {
    setError(null)
    setMessage(null)
    try {
      await resetAdminUserPassword(userId, { newPassword: resetPassword })
      setResetPasswordUserId(null)
      setResetPassword('')
      setMessage('הסיסמה אופסה.')
    } catch (err) {
      setError(getApiErrorMessage(err, 'לא ניתן לאפס את הסיסמה.'))
    }
  }

  function toggleInstrument(instrumentId: number) {
    setEditForm((current) => ({
      ...current,
      instrumentIds: toggleInstrumentIds(current.instrumentIds, instrumentId),
    }))
  }

  return (
    <section>
      <div className="page-hero library-hero">
        <div>
          <span className="eyebrow">ניהול משתמשים</span>
          <h1>משתמשים</h1>
          <p className="page-description">ניהול משתמשים, שיוך כלי נגינה למורים ומעקב אחר פעילות.</p>
        </div>
        <Link to="/admin/users/new" className="secondary-button">
          משתמש חדש
        </Link>
      </div>

      {loading && <p>טוען משתמשים...</p>}
      {error && <p className="error-text">{error}</p>}
      {message && <p className="success-text">{message}</p>}

      <form className="toolbar admin-users-toolbar" onSubmit={handleFilterSearch}>
        <label>
          חיפוש
          <input
            placeholder="שם או מייל..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </label>
        <label>
          תפקיד
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as 'All' | Role)}>
            <option value="All">הכל</option>
            <option value="Admin">{formatRole('Admin')}</option>
            <option value="Teacher">{formatRole('Teacher')}</option>
          </select>
        </label>
        <label>
          מינימום לייקים
          <input
            type="number"
            min={0}
            value={minLikesInput}
            onChange={(e) => setMinLikesInput(e.target.value)}
          />
        </label>
        <label>
          מינימום הורדות
          <input
            type="number"
            min={0}
            value={minDownloadsInput}
            onChange={(e) => setMinDownloadsInput(e.target.value)}
          />
        </label>
        <button type="submit" className="secondary-button">סינון</button>
      </form>

      {!loading && !error && (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>שם</th>
                <th>מייל</th>
                <th>תפקיד</th>
                <th>סטטוס</th>
                <th>כלים</th>
                <th>לייקים</th>
                <th>הורדות</th>
                <th>פעולות</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  {editingUserId === user.id ? (
                    <>
                      <td>
                        <input
                          value={editForm.fullName}
                          onChange={(e) =>
                            setEditForm({ ...editForm, fullName: e.target.value })
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="email"
                          value={editForm.email}
                          onChange={(e) =>
                            setEditForm({ ...editForm, email: e.target.value })
                          }
                        />
                      </td>
                      <td>
                        <select
                          value={editForm.role}
                          onChange={(e) => {
                            const newRole = e.target.value as Role
                            setEditForm({
                              ...editForm,
                              role: newRole,
                              instrumentIds: newRole === 'Admin' ? [] : editForm.instrumentIds,
                            })
                          }}
                        >
                          <option value="Teacher">{formatRole('Teacher')}</option>
                          <option value="Admin">{formatRole('Admin')}</option>
                        </select>
                      </td>
                      <td>
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={editForm.isActive}
                            onChange={(e) =>
                              setEditForm({ ...editForm, isActive: e.target.checked })
                            }
                          />
                          פעיל
                        </label>
                      </td>
                      <td>
                        {editForm.role === 'Teacher' ? (
                          <InstrumentCheckboxes
                            instruments={instruments}
                            selectedIds={editForm.instrumentIds}
                            onToggle={toggleInstrument}
                          />
                        ) : (
                          'הכל לפי תפקיד'
                        )}
                      </td>
                      <td>{user.totalLikesReceived}</td>
                      <td>{user.totalUniqueDownloadsReceived}</td>
                      <td>
                        <div className="button-row">
                          <button onClick={() => handleSave(user.id)}>שמירה</button>
                          <button
                            className="secondary-button"
                            onClick={() => setEditingUserId(null)}
                          >
                            ביטול
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{user.fullName}</td>
                      <td>{user.email}</td>
                      <td>{formatRole(user.role)}</td>
                      <td>{user.isActive ? 'פעיל' : 'לא פעיל'}</td>
                      <td>
                        {user.instruments.length > 0
                          ? user.instruments.map((instrument) => instrument.name).join(', ')
                          : user.role === 'Admin'
                            ? 'הכל לפי תפקיד'
                            : 'לא שויך'}
                      </td>
                      <td>{user.totalLikesReceived}</td>
                      <td>{user.totalUniqueDownloadsReceived}</td>
                      <td>
                        <div className="button-row">
                          <button onClick={() => startEdit(user)}>עריכה</button>
                          <button
                            className="secondary-button"
                            onClick={() => {
                              setResetPasswordUserId(user.id)
                              setResetPassword('')
                            }}
                          >
                            איפוס סיסמה
                          </button>
                        </div>
                        {resetPasswordUserId === user.id && (
                          <div className="reset-password-row">
                            <input
                              type="password"
                              placeholder="סיסמה חדשה"
                              value={resetPassword}
                              onChange={(e) => setResetPassword(e.target.value)}
                              minLength={8}
                            />
                            <button
                              disabled={resetPassword.length < 8}
                              onClick={() => handleResetPassword(user.id)}
                            >
                              שמירה
                            </button>
                            <button
                              className="secondary-button"
                              onClick={() => {
                                setResetPasswordUserId(null)
                                setResetPassword('')
                              }}
                            >
                              ביטול
                            </button>
                          </div>
                        )}
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
  )
}
