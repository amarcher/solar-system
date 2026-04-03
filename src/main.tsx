import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { initAnalytics } from './utils/analytics'

import App from './App.tsx'

initAnalytics()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
