import React, { useEffect, useMemo, useState } from 'react'
import {
  buildDailyChiefBriefing,
  buildMemoryStats,
  loadChiefOfStaffWorkspace,
  recallMemory,
  saveStructuredMemory,
} from '../services/chiefOfStaffMemory'

const SAMPLE_NOTE = `Today I met ABC Company.

They are interested in AI Automation.
Need proposal before June 30.
Budget around $5,000.
Follow up next week.`

function MetricCard({ label, value }) {
  return (
    <article className="chief-metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  )
}

function EmptyText({ children }) {
  return <p className="chief-empty">{children}</p>
}

export default function ChiefOfStaffPage() {
  const [workspace, setWorkspace] = useState({
    clients: [],
    meetings: [],
    projects: [],
    memories: [],
  })
  const [note, setNote] = useState(SAMPLE_NOTE)
  const [recallQuery, setRecallQuery] = useState('Who is ABC Company?')
  const [recallAnswer, setRecallAnswer] = useState('')
  const [extracted, setExtracted] = useState(null)
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)

  const stats = useMemo(() => buildMemoryStats(workspace), [workspace])
  const briefing = useMemo(() => buildDailyChiefBriefing(workspace), [workspace])

  useEffect(() => {
    let ignore = false

    async function loadWorkspace() {
      setLoading(true)
      const loaded = await loadChiefOfStaffWorkspace()
      if (ignore) return

      setWorkspace(loaded)
      setRecallAnswer(recallMemory('Who is ABC Company?', loaded))
      setLoading(false)
    }

    loadWorkspace()

    return () => {
      ignore = true
    }
  }, [])

  const handleCaptureMemory = async (event) => {
    event.preventDefault()
    const cleanNote = note.trim()
    if (!cleanNote) return

    setNotice('')
    const result = await saveStructuredMemory(cleanNote)
    setExtracted(result.extracted)
    setWorkspace((current) => ({
      clients: result.client ? [result.client, ...current.clients] : current.clients,
      meetings: result.meeting ? [result.meeting, ...current.meetings] : current.meetings,
      projects: current.projects,
      memories: [result.memory, ...current.memories],
    }))
    setNotice('Memory captured and structured.')
  }

  const handleRecall = (event) => {
    event.preventDefault()
    setRecallAnswer(recallMemory(recallQuery, workspace))
  }

  return (
    <div className="page chief-page">
      <header className="chief-header">
        <div>
          <span className="eyebrow">Phase 11.3</span>
          <h2>Chief of Staff AI</h2>
          <p>Nexus remembers people, meetings, projects, decisions, and follow-ups over time.</p>
        </div>
        <div className="chief-status">
          <span></span>
          Memory Active
        </div>
      </header>

      <section className="chief-metric-grid" aria-label="Chief of Staff dashboard metrics">
        <MetricCard label="Clients" value={stats.clients} />
        <MetricCard label="Tasks" value={stats.tasks} />
        <MetricCard label="Meetings" value={stats.meetings} />
        <MetricCard label="Deadlines" value={stats.deadlines} />
      </section>

      <section className="chief-panel chief-briefing">
        <div className="chief-panel-head">
          <span className="eyebrow">AI Daily Briefing</span>
          <strong>{loading ? 'Loading' : 'Today'}</strong>
        </div>
        <div className="chief-briefing-grid">
          <div>
            <span>Today's Priorities</span>
            {briefing.focus.map((item, index) => <p key={`${item}-${index}`}>{item}</p>)}
          </div>
          <div>
            <span>Suggested Actions</span>
            {briefing.suggestedActions.map((item, index) => <p key={`${item}-${index}`}>{item}</p>)}
          </div>
          <div>
            <span>Risk Alerts</span>
            {briefing.riskAlerts.length > 0
              ? briefing.riskAlerts.map((item, index) => <p key={`${item}-${index}`}>{item}</p>)
              : <p>No risk alerts today.</p>}
          </div>
          <div>
            <span>Upcoming Deadlines</span>
            {briefing.upcomingDeadlines.length > 0
              ? briefing.upcomingDeadlines.map((project, index) => <p key={project.id || `${project.title || project.name || project.text || project.summary || 'item'}-${index}`}>{project.name}: {project.deadline}</p>)
              : <p>No critical deadlines.</p>}
          </div>
        </div>
      </section>

      {notice && <div className="chief-notice">{notice}</div>}

      <section className="chief-layout">
        <form className="chief-panel chief-form" onSubmit={handleCaptureMemory}>
          <div className="chief-panel-head">
            <span className="eyebrow">Memory Engine</span>
            <strong>Capture Note</strong>
          </div>
          <label>
            <span>Meeting Notes / Client Update / Idea</span>
            <textarea value={note} onChange={(event) => setNote(event.target.value)} />
          </label>
          <button type="submit">Extract Structured Memory</button>
        </form>

        <section className="chief-panel">
          <div className="chief-panel-head">
            <span className="eyebrow">Extracted Intelligence</span>
            <strong>{extracted ? extracted.memoryType : 'Preview'}</strong>
          </div>
          {extracted ? (
            <div className="chief-extracted-grid">
              <div><span>Company</span><strong>{extracted.company || '-'}</strong></div>
              <div><span>Interest</span><strong>{extracted.interest || '-'}</strong></div>
              <div><span>Budget</span><strong>{extracted.budget || '-'}</strong></div>
              <div><span>Next Action</span><strong>{extracted.nextAction || '-'}</strong></div>
              <div><span>Deadline</span><strong>{extracted.deadline || '-'}</strong></div>
              <div><span>Follow Up</span><strong>{extracted.followUpDate || '-'}</strong></div>
            </div>
          ) : (
            <EmptyText>Capture a note and Nexus will extract people, decisions, tasks, risks, deadlines, and follow-ups.</EmptyText>
          )}
        </section>
      </section>

      <section className="chief-panel">
        <div className="chief-panel-head">
          <span className="eyebrow">AI Recall Engine</span>
          <strong>Ask Memory</strong>
        </div>
        <form className="chief-recall-form" onSubmit={handleRecall}>
          <input
            type="text"
            value={recallQuery}
            onChange={(event) => setRecallQuery(event.target.value)}
            placeholder="What did I discuss with ABC Company?"
          />
          <button type="submit">Recall</button>
        </form>
        {recallAnswer && <pre className="chief-recall-answer">{recallAnswer}</pre>}
      </section>

      <section className="chief-layout">
        <section className="chief-panel">
          <div className="chief-panel-head">
            <span className="eyebrow">Client Memory</span>
            <strong>{workspace.clients.length} clients</strong>
          </div>
          <div className="chief-list">
            {workspace.clients.map((client, index) => (
              <article className="chief-list-item" key={client.id || `${client.title || client.name || client.text || client.summary || 'item'}-${index}`}>
                <div>
                  <strong>{client.company}</strong>
                  <span>{client.status}</span>
                </div>
                <p>{client.summary}</p>
                <small>Last contact: {client.last_contact || '-'} · Follow up: {client.follow_up_date || '-'}</small>
              </article>
            ))}
          </div>
        </section>

        <section className="chief-panel">
          <div className="chief-panel-head">
            <span className="eyebrow">Meeting Intelligence</span>
            <strong>{workspace.meetings.length} meetings</strong>
          </div>
          <div className="chief-list">
            {workspace.meetings.map((meeting, index) => (
              <article className="chief-list-item" key={meeting.id || `${meeting.title || meeting.name || meeting.text || meeting.summary || 'item'}-${index}`}>
                <div>
                  <strong>{meeting.title}</strong>
                  <span>{meeting.date}</span>
                </div>
                <p>{meeting.summary}</p>
                <small>Actions: {meeting.action_items.join(', ') || '-'}</small>
              </article>
            ))}
            {workspace.meetings.length === 0 && <EmptyText>Belum ada meeting hari ini.</EmptyText>}
          </div>
        </section>
      </section>

      <section className="chief-layout">
        <section className="chief-panel">
          <div className="chief-panel-head">
            <span className="eyebrow">Project Memory</span>
            <strong>{workspace.projects.length} projects</strong>
          </div>
          <div className="chief-list">
            {workspace.projects.map((project, index) => (
              <article className="chief-list-item" key={project.id || `${project.title || project.name || project.text || project.summary || 'item'}-${index}`}>
                <div>
                  <strong>{project.name}</strong>
                  <span>{project.status}</span>
                </div>
                <p>{project.summary}</p>
                <small>Deadline: {project.deadline || '-'}</small>
              </article>
            ))}
            {workspace.projects.length === 0 && <EmptyText>Belum ada project aktif.</EmptyText>}
          </div>
        </section>

        <section className="chief-panel">
          <div className="chief-panel-head">
            <span className="eyebrow">AI Suggestion Engine</span>
            <strong>Proactive</strong>
          </div>
          <div className="chief-suggestions">
            {briefing.suggestedActions.map((action, index) => (
              <article key={`${action}-${index}`}>
                <span>Suggested action</span>
                <p>{action}</p>
              </article>
            ))}
            {briefing.riskAlerts.map((risk, index) => (
              <article className="risk" key={`${risk}-${index}`}>
                <span>Risk alert</span>
                <p>{risk}</p>
              </article>
            ))}
          </div>
        </section>
      </section>
    </div>
  )
}
