import React from 'react'
import { PRIMARY_NAV_ITEMS } from '../../app/routes'

export default function BottomNav({ activePage, onNavigate }) {
  return (
    <nav className="sidebar bottom-nav" aria-label="Primary navigation">
      {PRIMARY_NAV_ITEMS.map((item) => (
        <button
          key={item.id}
          className={`nav-item ${activePage === item.id ? 'active' : ''}`}
          onClick={() => onNavigate(item.id)}
        >
          <span className="nav-icon">{item.icon}</span>
          <span className="nav-copy">
            <span className="label">{item.label}</span>
          </span>
        </button>
      ))}
    </nav>
  )
}
