import { useEffect, useState, type FormEvent } from 'react'
import { getApiErrorMessage } from '../api/apiClient'
import {
  createAdminUser,
  getAdminInstruments,
  getAdminUsers,
  resetAdminUserPassword,
  updateAdminUser,
  updateAdminUserInstruments,
} from '../api/instrumentsApi'
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

const emptyForm: UserFormState = {
  fullName: '',
  email: '',
  password: '',
  role: 'Teacher',
  isActive: true,
  instrumentIds: [],
}

export function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserDto[]>([])
  const [instruments, setInstruments] = useState<InstrumentDto[]>([])
  const [newUser, setNewUser] = useState<UserFormState>(emptyForm)
  const [editingUserId, setEditingUserId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<UserFormState>(emptyForm)
  const [resetPasswordUserId, setResetPasswordUserId] = useState<number | null>(null)
  const [resetPassword, setResetPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const [usersData, instrumentsData] = await Promise.all([
        getAdminUsers(),
        getAdminInstruments(),
      ])
      setUsers(usersData)
      setInstruments(instrumentsData)
    } catch (err) {
      setError(getApiErrorMessage(err, 'לא ניתן לטעון את המשתמשים.'))
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setMessage(null)
    try {
      await createAdminUser({
        fullName: newUser.fullName,
        email: newUser.email,
        password: newUser.password,
        role: newUser.role,
        isActive: newUser.isActive,
        instrumentIds: newUser.role === 'Teacher' ? newUser.instrumentIds : [],
      })
      setNewUser(emptyForm)
      setMessage('המשתמש נוצר.')
      await loadData()
    } catch (err) {
      setError(getApiErrorMessage(err, 'לא ניתן ליצור משתמש. ודא שכתובת המייל ייחודית.'))
    }
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

  function toggleInstrument(
    form: UserFormState,
    setForm: (value: UserFormState) => void,
    instrumentId: number,
  ) {
    const hasInstrument = form.instrumentIds.includes(instrumentId)
    setForm({
      ...form,
      instrumentIds: hasInstrument
        ? form.instrumentIds.filter((id) => id !== instrumentId)
        : [...form.instrumentIds, instrumentId],
    })
  }

  return (
    <section>
      <h1>משתמשים</h1>
      <p className="page-description">יצירת משתמשים וניהול שיוך כלי נגינה למורים.</p>

      {loading && <p>טוען משתמשים...</p>}
      {error && <p className="error-text">{error}</p>}
      {message && <p className="success-text">{message}</p>}

      <form className="form-panel admin-user-form" onSubmit={handleCreate}>
        <h2>יצירת משתמש</h2>
        <label>
          שם מלא
          <input
            value={newUser.fullName}
            onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
            required
            maxLength={200}
          />
        </label>
        <label>
          מייל
          <input
            type="email"
            value={newUser.email}
            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
            required
          />
        </label>
        <label>
          סיסמה ראשונית
          <input
            type="password"
            value={newUser.password}
            onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
            required
            minLength={8}
          />
        </label>
        <label>
          תפקיד
          <select
            value={newUser.role}
            onChange={(e) =>
              setNewUser({ ...newUser, role: e.target.value as Role, instrumentIds: [] })
            }
          >
            <option value="Teacher">{formatRole('Teacher')}</option>
            <option value="Admin">{formatRole('Admin')}</option>
          </select>
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={newUser.isActive}
            onChange={(e) => setNewUser({ ...newUser, isActive: e.target.checked })}
          />
          פעיל
        </label>
        {newUser.role === 'Teacher' && (
          <InstrumentCheckboxes
            instruments={instruments}
            selectedIds={newUser.instrumentIds}
            onToggle={(instrumentId) =>
              toggleInstrument(newUser, setNewUser, instrumentId)
            }
          />
        )}
        <button type="submit">יצירת משתמש</button>
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
                            onToggle={(instrumentId) =>
                              toggleInstrument(editForm, setEditForm, instrumentId)
                            }
                          />
                        ) : (
                          'הכל לפי תפקיד'
                        )}
                      </td>
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

function InstrumentCheckboxes({
  instruments,
  selectedIds,
  onToggle,
}: {
  instruments: InstrumentDto[]
  selectedIds: number[]
  onToggle: (instrumentId: number) => void
}) {
  return (
    <div className="checkbox-grid">
      {instruments.map((instrument) => (
        <label className="checkbox-label" key={instrument.id}>
          <input
            type="checkbox"
            checked={selectedIds.includes(instrument.id)}
            onChange={() => onToggle(instrument.id)}
          />
          {instrument.name}
        </label>
      ))}
    </div>
  )
}
