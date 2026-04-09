import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'

// Build-time identifier so we can verify which commit a deployed bundle
// is running. Prefer Vercel's env vars (set automatically on every build);
// fall back to local `git rev-parse` for `npm run dev`/`npm run build`.
function resolveBuildSha(): string {
  if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7)
  try {
    return execSync('git rev-parse --short HEAD').toString().trim()
  } catch {
    return 'unknown'
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __BUILD_SHA__: JSON.stringify(resolveBuildSha()),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
})
