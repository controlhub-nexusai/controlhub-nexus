import React from 'react'

export default function MemoryPage() {
  return (
    <div className="page">
      <h2>Memory</h2>
      <p style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: -8, marginBottom: 20 }}>
        Nexus uses this space to remember your workflows, tone, and recurring tasks.
      </p>

      <div className="grid-2">
        <div className="lead-card">
          <div className="lead-body">
            <div className="lead-card-top">
              <span className="lead-name">Tone preference</span>
              <span className="badge new">Learned</span>
            </div>
            <div className="lead-notes">Short, direct, slightly conversational. No long explanations unless asked.</div>
          </div>
        </div>

        <div className="lead-card">
          <div className="lead-body">
            <div className="lead-card-top">
              <span className="lead-name">Lead workflow</span>
              <span className="badge new">Learned</span>
            </div>
            <div className="lead-notes">Follow up after 2 days of silence. Always offer formal / casual / closing variants.</div>
          </div>
        </div>

        <div className="lead-card">
          <div className="lead-body">
            <div className="lead-card-top">
              <span className="lead-name">Content rhythm</span>
              <span className="badge followup">Pending</span>
            </div>
            <div className="lead-notes">Posting cadence not yet established. Nexus will suggest a schedule after 1 week of data.</div>
          </div>
        </div>
      </div>

      <div className="empty-state" style={{ marginTop: 16 }}>
        Memory storage is UI-only for now — connect a backend to persist across sessions.
      </div>
    </div>
  )
}
