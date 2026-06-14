import React from 'react'
import BottomNav from './BottomNav'

export default function AppShell({ activePage, onNavigate, children }) {
  return (
    <div className="app-shell">
      <main className={`mobile-room ${activePage === 'jarvis' ? 'nexus-room' : ''}`}>
        {children}
      </main>

      <BottomNav activePage={activePage} onNavigate={onNavigate} />
    </div>
  )
}
