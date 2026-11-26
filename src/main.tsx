import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { initAnalytics } from './utils/analytics'

import Root from './Root.tsx'

initAnalytics()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
