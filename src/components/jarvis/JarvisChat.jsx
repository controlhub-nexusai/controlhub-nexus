import React from 'react'
import JarvisMessage from './JarvisMessage'

export default function JarvisChat({
  messages,
  isThinking,
  thinkingText,
  scrollRef,
  getCurrentTime,
  onQuickAction,
}) {
  return (
    <div className="nexus-console compact-chat-log">
      <div className="chat-section-title">Jarvis</div>
      <div className="chat-messages" ref={scrollRef}>
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
              <span className="bubble-label">JARVIS<small>sedang mengetik</small></span>
              {thinkingText}
              <div className="typing-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
