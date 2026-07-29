import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Global error handler for uncaught errors
window.addEventListener('error', (event) => {
  console.error('Uncaught error:', event.error)
  // Prevent the default error handling to avoid blank page
  event.preventDefault()
})

// Handle promise rejection errors
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled rejection:', event.reason)
  // Prevent the default error handling
  event.preventDefault()
})

// Ensure root element exists
const rootElement = document.getElementById('root')
if (!rootElement) {
  console.error('Root element not found')
  document.body.innerHTML = '<div style="padding: 20px; font-family: sans-serif; color: #333;">Error: Root element not found. Please refresh the page.</div>'
} else {
  try {
    createRoot(rootElement).render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  } catch (error) {
    console.error('Failed to render app:', error)
    rootElement.innerHTML = '<div style="padding: 20px; font-family: sans-serif; color: #333;">Error: Failed to load application. Please refresh the page.</div>'
  }
}
