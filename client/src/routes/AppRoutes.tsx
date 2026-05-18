import { Navigate, Route, Routes } from 'react-router-dom'
import App from '../App'
import { AccountPage } from '../pages/AccountPage'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { AdminAuditLogsPage } from '../pages/AdminAuditLogsPage'
import { AdminPendingMaterialsPage } from '../pages/AdminPendingMaterialsPage'
import { AdminUsersPage } from '../pages/AdminUsersPage'
import { LoginPage } from '../pages/LoginPage'
import { MyUploadsPage } from '../pages/MyUploadsPage'
import { TeacherLibraryPage } from '../pages/TeacherLibraryPage'
import { UploadMaterialPage } from '../pages/UploadMaterialPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<App />}>
        <Route index element={<Navigate to="login" replace />} />
        <Route path="login" element={<LoginPage />} />

        <Route
          path="teacher-library"
          element={
            <ProtectedRoute allowedRoles={['Teacher', 'Admin']}>
              <TeacherLibraryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="upload-material"
          element={
            <ProtectedRoute allowedRoles={['Teacher', 'Admin']}>
              <UploadMaterialPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="my-uploads"
          element={
            <ProtectedRoute allowedRoles={['Teacher', 'Admin']}>
              <MyUploadsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="account"
          element={
            <ProtectedRoute allowedRoles={['Teacher', 'Admin']}>
              <AccountPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/pending-materials"
          element={
            <ProtectedRoute allowedRoles={['Admin']}>
              <AdminPendingMaterialsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/users"
          element={
            <ProtectedRoute allowedRoles={['Admin']}>
              <AdminUsersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/audit-logs"
          element={
            <ProtectedRoute allowedRoles={['Admin']}>
              <AdminAuditLogsPage />
            </ProtectedRoute>
          }
        />
      </Route>
    </Routes>
  )
}
