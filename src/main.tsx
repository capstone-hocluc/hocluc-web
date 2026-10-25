import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/common/ErrorBoundary.jsx'
import ToastProvider from './components/common/ToastProvider.jsx'
import CurrentUserProvider from './components/common/CurrentUserProvider'

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
