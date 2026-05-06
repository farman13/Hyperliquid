import { usePrices } from '../hooks/usePrices'
import './TickerBar.css'

const COINS = [
  { id: 'BTC', label: 'BTC/USDC' },
  { id: 'ETH', label: 'ETH/USDC' },
  { id: 'SOL', label: 'SOL/USDC' },
  { id: 'ARB', label: 'ARB/USDC' },
  { id: 'AVAX', label: 'AVAX/USDC' },
  { id: 'DOGE', label: 'DOGE/USDC' },
  { id: 'MATIC', label: 'MATIC/USDC' },
]

const fmt = (n) => {
  const num = Number(n || 0)
  if (num >= 1000) return num.toLocaleString(undefined, { maximumFractionDigits: 2 })
  if (num >= 1) return num.toFixed(3)
  return num.toFixed(5)
}

export default function TickerBar({ selectedCoin, onSelectCoin }) {
  const prices = usePrices()

  return (
    <div className="ticker-bar">
      <div className="ticker-inner">
        {COINS.map(({ id, label }) => {
          const price = prices?.[id]

          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelectCoin?.(id)}
              className={`ticker-item ${selectedCoin === id ? 'active' : ''}`}
            >
              <span className="ticker-label">{label}</span>
              <span className="ticker-price num">
                {price ? `$${fmt(price)}` : '—'}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}