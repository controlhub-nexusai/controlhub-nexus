import React from 'react'

const NAV_ITEMS = [
  { id: 'nexus', label: 'Nexus', icon: '✦' },
  { id: 'tasks', label: 'Tasks', icon: '✓' },
  { id: 'leads', label: 'Leads', icon: '◎' },
  { id: 'content', label: 'Content', icon: '✎' },
  { id: 'settings', label: 'Settings', icon: '⚙' },
]

export default function Sidebar({ activePage, setActivePage }) {
  return (
    <nav className="sidebar bottom-nav" aria-label="Primary navigation">
      {NAV_ITEMS.map((item) => (
        <button
          key={item.id}
          className={`nav-item ${activePage === item.id ? 'active' : ''}`}
          onClick={() => !item.disabled && setActivePage(item.id)}
          disabled={item.disabled}
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
