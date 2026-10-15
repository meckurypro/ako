import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from './hooks/useTheme.tsx'
import { SoundProvider } from './hooks/useSound.tsx'
import { startKeyboardInsetTracking } from './lib/keyboardInset'

// Keeps sheets/composers above the on-screen keyboard on iOS Safari (see lib/keyboardInset.ts).
startKeyboardInsetTracking()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <SoundProvider>
        <App />
      </SoundProvider>
    </ThemeProvider>
  </StrictMode>,
)
