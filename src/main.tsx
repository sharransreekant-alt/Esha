import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App'
import { watchForUpdates } from './utils/autoUpdate'

watchForUpdates()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
