import React, { useEffect, useMemo, useState } from 'react'
import {
  buildCalendarIntelligence,
  buildEndOfDayReflection,
  buildMeetingPreparation,
  createCalendarEvent,
  formatCalendarTime,
  loadCalendarWorkspace,
} from '../services/calendarIntelligence'

function MetricCard({ label, value }) {
  return (
    <article className="calendar-metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  )
}

function formatHours(value) {
  return `${Math.round(value)} Hours`
}

export default function CalendarIntelligencePage({ tasks = [] }) {
  const [workspace, setWorkspace] = useState({
    events: [],
    tasks,
    clients: [],
    meetings: [],
    projects: [],
    memories: [],
  })
  const [focusMode, setFocusMode] = useState(false)
  const [notice, setNotice] = useState('')
  const [eventForm, setEventForm] = useState({
    title: 'Client ABC Meeting',
    date: new Date().toISOString().slice(0, 10),
    start: '14:00',
    end: '15:00',
    participants: 'ABC Company',
    location: 'Google Meet',
    description: 'Review proposal and pending questions.',
  })

  useEffect(() => {
    let ignore = false

    async function loadWorkspace() {
      const loaded = await loadCalendarWorkspace(tasks)
      if (ignore) return
      setWorkspace(loaded)
    }

    loadWorkspace()

    return () => {
      ignore = true
    }
  }, [tasks])

  const intelligence = useMemo(() => buildCalendarIntelligence({
    ...workspace,
    tasks,
  }), [workspace, tasks])
  const meetingPrep = useMemo(() => buildMeetingPreparation(intelligence.nextMeeting, workspace), [intelligence.nextMeeting, workspace])
  const reflection = useMemo(() => buildEndOfDayReflection({
    ...workspace,
    tasks,
  }), [workspace, tasks])

  const handleConnectGoogle = () => {
    setNotice('Google Calendar OAuth is ready for configuration. Add Google credentials to enable live sync.')
  }

  const handleCreateEvent = async (event) => {
    event.preventDefault()
    const savedEvent = await createCalendarEvent({
      title: eventForm.title,
      description: eventForm.description,
      start_time: `${eventForm.date}T${eventForm.start}:00+07:00`,
      end_time: `${eventForm.date}T${eventForm.end}:00+07:00`,
      location: eventForm.location,
      participants: eventForm.participants.split(',').map((item) => item.trim()).filter(Boolean),
      source: 'manual',
    })

    setWorkspace((current) => ({
      ...current,
      events: [savedEvent, ...current.events],
    }))
    setNotice('Calendar event added to Nexus schedule intelligence.')
  }

  const visiblePriorities = focusMode ? intelligence.topPriorities : intelligence.topPriorities.slice(0, 5)

  return (
    <div className="page calendar-page">
      <header className="calendar-header">
        <div>
          <span className="eyebrow">Phase 11.4</span>
          <h2>Calendar Intelligence</h2>
          <p>Nexus combines meetings, tasks, deadlines, projects, and follow-ups into one executive briefing.</p>
        </div>
        <button type="button" onClick={handleConnectGoogle}>Connect Google Calendar</button>
      </header>

      {notice && <div className="calendar-notice">{notice}</div>}

      <section className="calendar-metric-grid" aria-label="Calendar dashboard metrics">
        <MetricCard label="Meetings Today" value={intelligence.todayEvents.length} />
        <MetricCard label="Next Meeting" value={intelligence.nextMeeting ? formatCalendarTime(intelligence.nextMeeting.start_time) : '--:--'} />
        <MetricCard label="Focus Time" value={formatHours(intelligence.freeHours)} />
        <MetricCard label="Deadlines" value={intelligence.deadlines.length} />
      </section>

      <section className="calendar-panel calendar-briefing">
        <div className="calendar-panel-head">
          <span className="eyebrow">AI Daily Briefing</span>
          <strong>Morning Summary</strong>
        </div>
        <pre>{intelligence.briefing}</pre>
      </section>

      <section className="calendar-layout">
        <section className="calendar-panel">
          <div className="calendar-panel-head">
            <span className="eyebrow">Today's Schedule</span>
            <strong>{intelligence.todayEvents.length} events</strong>
          </div>
          <div className="calendar-list">
            {intelligence.todayEvents.map((event) => (
              <article className="calendar-list-item" key={event.id}>
                <div>
                  <strong>{event.title}</strong>
                  <span>{formatCalendarTime(event.start_time)}-{formatCalendarTime(event.end_time)}</span>
                </div>
                <p>{event.description}</p>
                <small>{event.location || 'No location'} · {event.participants.join(', ') || 'Solo'}</small>
              </article>
            ))}
            {intelligence.todayEvents.length === 0 && <p className="calendar-empty">Belum ada jadwal.</p>}
          </div>
        </section>

        <section className="calendar-panel">
          <div className="calendar-panel-head">
            <span className="eyebrow">Today’s Focus</span>
            <button type="button" onClick={() => setFocusMode((current) => !current)}>
              {focusMode ? 'Show All' : 'Focus Today'}
            </button>
          </div>
          <div className="calendar-list">
            {visiblePriorities.map((task) => (
              <article className="calendar-priority" key={task.id || task.title}>
                <div>
                  <strong>{task.title}</strong>
                  <span>{task.priorityScore}</span>
                </div>
                <p>{task.dueTime ? `Due ${task.dueTime}` : 'Protect a focus block.'}</p>
              </article>
            ))}
            {visiblePriorities.length === 0 && <p className="calendar-empty">No active priority tasks.</p>}
          </div>
        </section>
      </section>

      <section className="calendar-layout">
        <section className="calendar-panel">
          <div className="calendar-panel-head">
            <span className="eyebrow">Free Time Slots</span>
            <strong>{formatHours(intelligence.freeHours)}</strong>
          </div>
          <div className="calendar-slot-grid">
            {intelligence.freeTimeSlots.map((slot) => (
              <span key={`${slot.start}-${slot.end}`}>{slot.start}-{slot.end}</span>
            ))}
            {intelligence.freeTimeSlots.length === 0 && <p className="calendar-empty">No open focus slots today.</p>}
          </div>
        </section>

        <section className="calendar-panel">
          <div className="calendar-panel-head">
            <span className="eyebrow">Risks & Opportunities</span>
            <strong>{intelligence.risks.length + intelligence.opportunities.length}</strong>
          </div>
          <div className="calendar-alert-list">
            {intelligence.risks.map((risk) => <p className="risk" key={risk}>{risk}</p>)}
            {intelligence.opportunities.map((opportunity) => <p key={opportunity}>{opportunity}</p>)}
            {intelligence.risks.length === 0 && intelligence.opportunities.length === 0 && (
              <p className="calendar-empty">No urgent risks or opportunities.</p>
            )}
          </div>
        </section>
      </section>

      <section className="calendar-panel">
        <div className="calendar-panel-head">
          <span className="eyebrow">Meeting Preparation Assistant</span>
          <strong>{meetingPrep?.time || '--:--'}</strong>
        </div>
        {meetingPrep ? (
          <div className="calendar-prep-grid">
            <div><span>Upcoming Meeting</span><strong>{meetingPrep.title}</strong></div>
            <div><span>Client</span><strong>{meetingPrep.client}</strong></div>
            <div><span>Last Contact</span><strong>{meetingPrep.lastContact}</strong></div>
            <div><span>Pending</span><strong>{meetingPrep.pending}</strong></div>
            <div className="wide"><span>Client History</span><p>{meetingPrep.history}</p></div>
            <div className="wide"><span>Pending Questions</span><p>{meetingPrep.questions.join(' ')}</p></div>
          </div>
        ) : (
          <p className="calendar-empty">No upcoming meeting to prepare.</p>
        )}
      </section>

      <section className="calendar-layout">
        <form className="calendar-panel calendar-form" onSubmit={handleCreateEvent}>
          <div className="calendar-panel-head">
            <span className="eyebrow">Calendar Event</span>
            <strong>Add Event</strong>
          </div>
          <label>
            <span>Title</span>
            <input value={eventForm.title} onChange={(event) => setEventForm((current) => ({ ...current, title: event.target.value }))} />
          </label>
          <div className="calendar-form-grid">
            <label>
              <span>Date</span>
              <input type="date" value={eventForm.date} onChange={(event) => setEventForm((current) => ({ ...current, date: event.target.value }))} />
            </label>
            <label>
              <span>Start</span>
              <input type="time" value={eventForm.start} onChange={(event) => setEventForm((current) => ({ ...current, start: event.target.value }))} />
            </label>
            <label>
              <span>End</span>
              <input type="time" value={eventForm.end} onChange={(event) => setEventForm((current) => ({ ...current, end: event.target.value }))} />
            </label>
          </div>
          <label>
            <span>Participants</span>
            <input value={eventForm.participants} onChange={(event) => setEventForm((current) => ({ ...current, participants: event.target.value }))} />
          </label>
          <label>
            <span>Description</span>
            <textarea value={eventForm.description} onChange={(event) => setEventForm((current) => ({ ...current, description: event.target.value }))} />
          </label>
          <button type="submit">Add Event</button>
        </form>

        <section className="calendar-panel">
          <div className="calendar-panel-head">
            <span className="eyebrow">End of Day Reflection</span>
            <strong>18:00</strong>
          </div>
          <div className="calendar-reflection">
            <div><span>Completed Tasks</span><strong>{reflection.completedTasks.length}</strong></div>
            <div><span>Missed Tasks</span><strong>{reflection.missedTasks.length}</strong></div>
            <div><span>Meetings Attended</span><strong>{reflection.meetingsAttended.length}</strong></div>
            <div><span>Follow Ups Completed</span><strong>{reflection.followUpsCompleted.length}</strong></div>
          </div>
          <div className="calendar-alert-list">
            {reflection.tomorrowRecommendations.map((item) => <p key={item}>{item}</p>)}
            {reflection.tomorrowRecommendations.length === 0 && <p className="calendar-empty">Tomorrow is clear. Review one strategic project.</p>}
          </div>
        </section>
      </section>
    </div>
  )
}
