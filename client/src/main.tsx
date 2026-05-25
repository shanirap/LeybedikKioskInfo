import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './utils/AuthContext'
import { LikeNotificationProvider } from './utils/LikeNotificationContext'
import { ToastProvider } from './utils/ToastContext'
import './index.css'
import { AppRoutes } from './routes/AppRoutes'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <LikeNotificationProvider>
          <ToastProvider>
            <AppRoutes />
          </ToastProvider>
        </LikeNotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
