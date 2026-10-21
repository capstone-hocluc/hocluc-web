import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/common/ErrorBoundary.jsx'
import ToastProvider from './components/common/ToastProvider.jsx'
import CurrentUserProvider from './components/common/CurrentUserProvider'
import { ensureFreshAccessToken, getAccessToken } from './lib/api'
import { isConsolePath } from './lib/console-routes'
import { safePurchaseReturnTo } from './lib/purchaseSession'

// Restore a cookie-backed session before protected route guards decide to redirect.
async function start() {
  const protectedRoute = location.pathname.startsWith('/student/') ||
    isConsolePath(location.pathname) || safePurchaseReturnTo(location.pathname + location.search)
  if (!getAccessToken() && protectedRoute) {
    await ensureFreshAccessToken(false, false).catch(() => undefined)
  }
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <ErrorBoundary>
        <ToastProvider>
          <CurrentUserProvider>
            <App />
          </CurrentUserProvider>
        </ToastProvider>
      </ErrorBoundary>
    </StrictMode>
  )
}

void start()
