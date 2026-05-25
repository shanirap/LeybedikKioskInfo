import { Navigate, Route, Routes } from 'react-router-dom'
import App from '../App'
import { AccountPage } from '../pages/AccountPage'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { useAuth } from '../utils/useAuth'
import { AdminAuditLogsPage } from '../pages/AdminAuditLogsPage'
import { AdminArchivedMaterialsPage } from '../pages/AdminArchivedMaterialsPage'
import { AdminInstrumentsPage } from '../pages/AdminInstrumentsPage'
import { AdminEditMaterialPage } from '../pages/AdminEditMaterialPage'
import { AdminPendingMaterialsPage } from '../pages/AdminPendingMaterialsPage'
import { AdminCreateUserPage } from '../pages/AdminCreateUserPage'
import { AdminDashboardPage } from '../pages/AdminDashboardPage'
import { AdminUsersPage } from '../pages/AdminUsersPage'
import { LoginPage } from '../pages/LoginPage'
import { MaterialPreviewPage } from '../pages/MaterialPreviewPage'
import { MyFavoritesPage } from '../pages/MyFavoritesPage'
import { MyUploadsPage } from '../pages/MyUploadsPage'
import { TeacherDashboardPage } from '../pages/TeacherDashboardPage'
import { TeacherLibraryPage } from '../pages/TeacherLibraryPage'
import { TeacherWalletPage } from '../pages/TeacherWalletPage'
import { UploadMaterialPage } from '../pages/UploadMaterialPage'

function TeacherDashboardRoute() {
  const { user } = useAuth()

  if (user?.role === 'Admin') {
    return <Navigate to="/admin/dashboard" replace />
  }

  return <TeacherDashboardPage />
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<App />}>
        <Route index element={<Navigate to="login" replace />} />
        <Route path="login" element={<LoginPage />} />

        <Route
          path="teacher/dashboard"
          element={
            <ProtectedRoute allowedRoles={['Teacher', 'Admin']}>
              <TeacherDashboardRoute />
            </ProtectedRoute>
          }
        />
        <Route
          path="teacher-library"
          element={
            <ProtectedRoute allowedRoles={['Teacher', 'Admin']}>
              <TeacherLibraryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="materials/:id/preview"
          element={
            <ProtectedRoute allowedRoles={['Teacher', 'Admin']}>
              <MaterialPreviewPage />
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
          path="upload"
          element={
            <ProtectedRoute allowedRoles={['Teacher', 'Admin']}>
              <UploadMaterialPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="my-favorites"
          element={
            <ProtectedRoute allowedRoles={['Teacher', 'Admin']}>
              <MyFavoritesPage />
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
          path="teacher/wallet"
          element={
            <ProtectedRoute allowedRoles={['Teacher', 'Admin']}>
              <TeacherWalletPage />
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
          path="admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={['Admin']}>
              <AdminDashboardPage />
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
          path="admin/materials/:id/edit"
          element={
            <ProtectedRoute allowedRoles={['Admin']}>
              <AdminEditMaterialPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/archived-materials"
          element={
            <ProtectedRoute allowedRoles={['Admin']}>
              <AdminArchivedMaterialsPage />
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
          path="admin/users/new"
          element={
            <ProtectedRoute allowedRoles={['Admin']}>
              <AdminCreateUserPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/instruments"
          element={
            <ProtectedRoute allowedRoles={['Admin']}>
              <AdminInstrumentsPage />
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
