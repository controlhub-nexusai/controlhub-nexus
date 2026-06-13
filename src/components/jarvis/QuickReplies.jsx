import React from 'react'

const QUICK_REPLIES = [
  { id: 'focus', label: 'Fokus hari ini' },
  { id: 'important', label: 'Ada yang penting?' },
  { id: 'leads', label: 'Cek prospek' },
  { id: 'content', label: 'Buat konten' },
  { id: 'summary', label: 'Ringkas hari ini' },
  { id: 'missed', label: 'Aku ketinggalan apa?' },
  { id: 'tomorrow', label: 'Rencanakan besok' },
]

export default function QuickReplies({ onSelect }) {
  return (
    <div className="jarvis-quick-replies" aria-label="Quick replies">
      {QUICK_REPLIES.map((reply) => (
        <button type="button" key={reply.id} onClick={() => onSelect(reply.id)}>
          {reply.label}
        </button>
      ))}
    </div>
  )
}
