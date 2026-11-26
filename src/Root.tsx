import { Suspense, lazy } from 'react'
import App from './App.tsx'

// The mixed-reality page is its own small app; its headset libraries load only there.
const ArApp = lazy(() => import('./ar/ArApp.tsx'))
const isArRoute = window.location.pathname.replace(/\/+$/, '').toLowerCase() === '/ar'

export default function Root() {
  return isArRoute ? <Suspense fallback={null}><ArApp /></Suspense> : <App />
}
