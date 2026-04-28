import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { TonConnectProvider } from './tonConnectProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TonConnectProvider>
      <App />
    </TonConnectProvider>
  </StrictMode>,
)
