import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// Each build gets an id, baked into the app and also published as version.json, so a
// phone holding an older copy can notice and reload (see src/utils/autoUpdate.ts).
const buildId = String(Date.now())
const versionFile = (): Plugin => ({
  name: 'version-file',
  generateBundle() {
    this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ id: buildId }) })
  },
})

export default defineConfig({
  plugins: [react(), versionFile()],
  define: { __BUILD_ID__: JSON.stringify(buildId) },
  base: '/Esha/', // GitHub Pages repo name — change to /Esha/ when you swap repos
})
