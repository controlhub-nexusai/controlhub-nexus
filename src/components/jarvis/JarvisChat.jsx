import React from 'react'
import JarvisMessage from './JarvisMessage'

export default function JarvisChat({
  messages,
  isThinking,
  thinkingText,
  scrollRef,
  messagesEndRef,
  onScroll,
  showLatestButton,
  onScrollToLatest,
  getCurrentTime,
  onQuickAction,
}) {
  return (
    <div className="nexus-console compact-chat-log">
      <div className="chat-section-title">Nexus</div>
      <div className="chat-messages" ref={scrollRef} onScroll={onScroll}>
        {messages.map((message, index) => (
          <JarvisMessage
            key={`${message.role}-${message.time || 'message'}-${index}`}
            message={message}
            getCurrentTime={getCurrentTime}
            onQuickAction={onQuickAction}
          />
        ))}

        {isThinking && (
          <div className="bubble-row ai">
            <div className="nexus-avatar">✦</div>
            <div className="bubble ai">
              <span className="bubble-label">NEXUS<small>sedang mengetik</small></span>
              {thinkingText}
              <div className="typing-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} className="messages-end-anchor" aria-hidden="true" />
      </div>

      {showLatestButton && (
        <button type="button" className="latest-message-btn" onClick={onScrollToLatest}>
          ↓ Pesan Terbaru
        </button>
      )}
    </div>
  )
}
