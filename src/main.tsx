import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConversationProvider } from '@elevenlabs/react'
import { initAnalytics } from './utils/analytics'

import App from './App.tsx'

initAnalytics()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConversationProvider>
      <App />
    </ConversationProvider>
  </StrictMode>,
)
