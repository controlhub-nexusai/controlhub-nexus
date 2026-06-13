import React from 'react'

export default function JarvisMessage({ message, getCurrentTime, onQuickAction }) {
  return (
    <div className={`bubble-row ${message.role}`}>
      {message.role === 'ai' && <div className="nexus-avatar">✦</div>}
      <div className={`bubble ${message.role}`}>
        <span className="bubble-label">
          {message.role === 'ai' ? 'JARVIS' : 'YOU'}
          <small>{message.time || getCurrentTime()}</small>
        </span>
        {message.text}
        {message.action && (
          <button type="button" className="bubble-action" onClick={message.action.onClick}>
            {message.action.label}
          </button>
        )}
        {message.quickActions && (
          <div className="bubble-quick-actions">
            {message.quickActions.map((action) => (
              <button type="button" key={action} onClick={() => onQuickAction(action)}>
                {action}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
