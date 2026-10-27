/**
 * main.tsx — application entry point.
 * Mounts <App/> into the #root div of index.html and wraps it in LangProvider
 * so every component can call useT() for bilingual (EN / 中文) text.
 * StrictMode makes React double-invoke renders in development, which surfaces
 * impure side effects early instead of letting them reach production.
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { LangProvider } from './i18n'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LangProvider>
      <App />
    </LangProvider>
  </StrictMode>,
)
