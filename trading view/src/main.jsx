import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { RainbowKitRoot } from './components/Rainbowkit.jsx'

createRoot(document.getElementById('root')).render(
  <RainbowKitRoot>
    <App />
  </RainbowKitRoot >
)
