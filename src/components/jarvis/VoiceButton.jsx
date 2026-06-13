import React from 'react'

export default function VoiceButton({ disabled = false }) {
  return (
    <button
      type="button"
      className="mic-btn"
      aria-label="Voice placeholder"
      disabled={disabled}
    >
      ◌
    </button>
  )
}
