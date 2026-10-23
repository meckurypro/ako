import './lib/polyfills'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from './hooks/useTheme.tsx'
import { SoundProvider } from './hooks/useSound.tsx'
import { startKeyboardInsetTracking } from './lib/keyboardInset'
import { installMediaFallback } from './lib/mediaFallback'

// Keeps sheets/composers above the on-screen keyboard on iOS Safari (see lib/keyboardInset.ts).
startKeyboardInsetTracking()

// Swaps any <img>/<video>/<audio> that fails to load for a gradient + icon placeholder (see lib/mediaFallback.ts).
installMediaFallback()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <SoundProvider>
        <App />
      </SoundProvider>
    </ThemeProvider>
  </StrictMode>,
)
