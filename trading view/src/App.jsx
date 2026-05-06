import { useState, useCallback } from 'react'
import Header from './components/Header'
import TickerBar from './components/TickerBar'
import TradingViewWidget from './components/TradingViewWidget'
import TradePanel from './components/TradePanel'
import BottomTabs from './components/BottomTabs'
import DepositWithdraw from './components/DepositWithdraw'
import History from './components/History'
import './App.css'

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activePage, setActivePage] = useState('trade')

  // ✅ GLOBAL SELECTED MARKET
  const [selectedCoin, setSelectedCoin] = useState('BTC')

  const openSidebar = useCallback(() => setSidebarOpen(true), [])
  const closeSidebar = useCallback(() => setSidebarOpen(false), [])

  return (
    <div className="app-shell">
      <Header
        onOpenSidebar={openSidebar}
        sidebarOpen={sidebarOpen}
        activePage={activePage}
        onNavigate={setActivePage}
      />

      <TickerBar
        selectedCoin={selectedCoin}
        onSelectCoin={setSelectedCoin}
      />

      {activePage === 'trade' ? (
        <div className="trading-layout">
          <div className="chart-area">
            <div className="chart-wrap">
              <TradingViewWidget coin={selectedCoin} />
            </div>

            <div className="bottom-area">
              <BottomTabs />
            </div>
          </div>

          <div
            className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
            onClick={closeSidebar}
          />

          <div className={`right-sidebar ${sidebarOpen ? 'open' : ''}`}>
            <div className="sidebar-content">
              <TradePanel
                coin={selectedCoin}
                setCoin={setSelectedCoin}
                onClose={closeSidebar}
              />

              <DepositWithdraw />
            </div>
          </div>
        </div>
      ) : (
        <div className="history-page">
          <History fullPage />
        </div>
      )}
    </div>
  )
}