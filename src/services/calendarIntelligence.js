import { loadChiefOfStaffWorkspace } from './chiefOfStaffMemory'
import { logMvpMode } from './mvpMode'

const DEFAULT_EVENTS = [
  {
    id: 'event-abc',
    title: 'Client ABC Proposal Review',
    description: 'Review AI Automation proposal and pending questions before follow-up.',
    start_time: `${new Date().toISOString().slice(0, 10)}T14:00:00+07:00`,
    end_time: `${new Date().toISOString().slice(0, 10)}T15:00:00+07:00`,
    location: 'Google Meet',
    participants: ['ABC Company'],
    source: 'google_calendar',
  },
  {
    id: 'event-focus',
    title: 'Focus Block: Nexus Phase 11.4',
    description: 'Complete calendar intelligence and daily briefing workflow.',
    start_time: `${new Date().toISOString().slice(0, 10)}T10:00:00+07:00`,
    end_time: `${new Date().toISOString().slice(0, 10)}T12:00:00+07:00`,
    location: 'Deep Work',
    participants: [],
    source: 'manual',
  },
]

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function tomorrowIso() {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  return date.toISOString().slice(0, 10)
}

function toDateKey(value) {
  if (!value) return ''
  return new Date(value).toISOString().slice(0, 10)
}

function buildDateTime(date, time, fallbackHour = '09:00') {
  if (!date) return ''
  return `${date}T${time || fallbackHour}:00+07:00`
}

function toTime(value) {
  if (!value) return ''
  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(value))
}

function toDbTime(value) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function eventDurationHours(event) {
  const start = new Date(event.start_time)
  const end = new Date(event.end_time)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0
  return Math.max(0, (end.getTime() - start.getTime()) / 3600000)
}

function normalizeEvent(event) {
  const startTime = event.start_time || buildDateTime(event.event_date, event.event_time)
  const endTime = event.end_time || buildDateTime(event.event_date, event.event_time, '10:00')

  return {
    id: event.id,
    title: event.title || 'Untitled event',
    description: event.description || '',
    start_time: startTime,
    end_time: endTime,
    location: event.location || '',
    participants: Array.isArray(event.participants)
      ? event.participants
      : String(event.participants || '').split(',').map((item) => item.trim()).filter(Boolean),
    source: event.source || event.type || 'manual',
    status: event.status || 'scheduled',
  }
}

function safeSelect(_table, _columns, fallback) {
  logMvpMode()
  return fallback
}

function safeInsert(_table, _payload, fallback) {
  logMvpMode()
  return fallback
}

export async function loadCalendarWorkspace(tasks = []) {
  const [events, chiefWorkspace] = [
    safeSelect('calendar_events', '*', DEFAULT_EVENTS),
    await loadChiefOfStaffWorkspace(),
  ]

  return {
    events: events.map(normalizeEvent),
    tasks,
    clients: chiefWorkspace.clients,
    meetings: chiefWorkspace.meetings,
    projects: chiefWorkspace.projects,
  }
}

export async function createCalendarEvent(event) {
  const payload = {
    title: event.title,
    event_date: toDateKey(event.start_time),
    event_time: toDbTime(event.start_time),
    type: event.source || 'event',
    status: 'scheduled',
  }

  return normalizeEvent(safeInsert('calendar_events', payload, {
    id: `event-${Date.now()}`,
    ...event,
  }))
}

export function calculatePriorityScore(task = {}) {
  let score = 40
  const dueDate = task.dueDate || task.deadline
  const today = todayIso()
  const tomorrow = tomorrowIso()

  if (task.priority === 'high') score += 30
  if (task.priority === 'medium') score += 15
  if (dueDate === today) score += 35
  if (dueDate === tomorrow) score += 20
  if (/proposal|client|follow up|deadline|phase/i.test(task.title || task.name || '')) score += 15

  return Math.min(100, score)
}

export function getTodayEvents(events = []) {
  const today = todayIso()
  return events
    .filter((event) => toDateKey(event.start_time) === today)
    .sort((a, b) => String(a.start_time).localeCompare(String(b.start_time)))
}

export function buildFreeTimeSlots(events = []) {
  const todayEvents = getTodayEvents(events)
  const workStart = 8
  const workEnd = 18
  const slots = []
  let cursor = workStart

  todayEvents.forEach((event) => {
    const start = new Date(event.start_time)
    const startHour = start.getHours() + start.getMinutes() / 60
    if (startHour - cursor >= 1) {
      slots.push({
        start: `${String(Math.floor(cursor)).padStart(2, '0')}:00`,
        end: `${String(Math.floor(startHour)).padStart(2, '0')}:${start.getMinutes() ? '30' : '00'}`,
      })
    }
    cursor = Math.max(cursor, new Date(event.end_time).getHours() + new Date(event.end_time).getMinutes() / 60)
  })

  if (workEnd - cursor >= 1) {
    slots.push({
      start: `${String(Math.floor(cursor)).padStart(2, '0')}:00`,
      end: `${workEnd}:00`,
    })
  }

  return slots
}

export function buildCalendarIntelligence(workspace = {}) {
  const events = workspace.events || []
  const tasks = workspace.tasks || []
  const clients = workspace.clients || []
  const projects = workspace.projects || []
  const today = todayIso()
  const tomorrow = tomorrowIso()
  const todayEvents = getTodayEvents(events)
  const dueTasks = tasks.filter((task) => task.status !== 'completed' && task.dueDate === today)
  const followUps = clients.filter((client) => client.follow_up_date && client.follow_up_date <= tomorrow)
  const deadlines = projects.filter((project) => project.deadline && project.deadline <= tomorrow)
  const blockedHours = todayEvents.reduce((sum, event) => sum + eventDurationHours(event), 0)
  const freeHours = Math.max(0, 10 - blockedHours)
  const scoredTasks = tasks
    .filter((task) => task.status !== 'completed')
    .map((task) => ({
      ...task,
      priorityScore: calculatePriorityScore(task),
    }))
    .sort((a, b) => b.priorityScore - a.priorityScore)
  const topPriorities = scoredTasks.slice(0, 3)
  const nextMeeting = todayEvents.find((event) => new Date(event.start_time).getTime() >= Date.now()) || todayEvents[0]
  const mostImportantTask = topPriorities[0]
  const risks = [
    ...deadlines.map((project) => `${project.name} deadline is approaching.`),
    ...followUps.map((client) => `${client.company} needs follow-up.`),
    ...(dueTasks.length > 0 ? [`${dueTasks.length} tasks are due today.`] : []),
  ]
  const suggestions = [
    mostImportantTask ? `Work on ${mostImportantTask.title} before ${nextMeeting ? toTime(nextMeeting.start_time) : '15:00'}.` : '',
    followUps[0] ? `Send proposal or follow-up to ${followUps[0].company} before 15:00.` : '',
    freeHours >= 2 ? `Protect ${Math.floor(freeHours)} hours of focus time today.` : '',
  ].filter(Boolean)

  return {
    todayEvents,
    dueTasks,
    followUps,
    deadlines,
    blockedHours,
    freeHours,
    freeTimeSlots: buildFreeTimeSlots(events),
    missedEvents: todayEvents.filter((event) => new Date(event.end_time).getTime() < Date.now()),
    nextMeeting,
    topPriorities,
    risks,
    opportunities: followUps.map((client) => `${client.company} may convert if followed up today.`),
    suggestions,
    briefing: [
      'Good Morning.',
      '',
      `Meetings: ${todayEvents.length}`,
      `Deadlines: ${deadlines.length}`,
      `Tasks: ${dueTasks.length || tasks.filter((task) => task.status !== 'completed').length}`,
      '',
      'Most Important Task:',
      mostImportantTask?.title || 'Review today and choose one priority.',
      '',
      'Important Alert:',
      risks[0] || 'No critical alerts today.',
      '',
      'Suggested Action:',
      suggestions[0] || 'Start with a focused planning block.',
    ].join('\n'),
  }
}

export function buildMeetingPreparation(event, workspace = {}) {
  if (!event) return null

  const clients = workspace.clients || []
  const memories = workspace.memories || []
  const participantText = event.participants.join(' ').toLowerCase()
  const client = clients.find((item) => participantText.includes(item.company.toLowerCase()))
  const relatedMemories = memories.filter((memory) =>
    client ? memory.content.toLowerCase().includes(client.company.toLowerCase()) : false
  )

  return {
    title: event.title,
    time: toTime(event.start_time),
    client: client?.company || event.participants[0] || 'Unknown',
    history: client?.summary || relatedMemories[0]?.content || 'No client history captured yet.',
    lastContact: client?.last_contact || '-',
    pending: /proposal/i.test(client?.summary || event.description) ? 'Proposal' : 'Confirm agenda',
    questions: ['What decision is needed today?', 'What follow-up should be scheduled?'],
  }
}

export function buildEndOfDayReflection(workspace = {}) {
  const tasks = workspace.tasks || []
  const events = workspace.events || []
  const today = todayIso()
  const completedTasks = tasks.filter((task) => task.status === 'completed' && task.dueDate === today)
  const missedTasks = tasks.filter((task) => task.status !== 'completed' && task.dueDate === today)
  const meetingsAttended = getTodayEvents(events).filter((event) => new Date(event.end_time).getTime() < Date.now())

  return {
    completedTasks,
    missedTasks,
    meetingsAttended,
    followUpsCompleted: completedTasks.filter((task) => /follow up/i.test(task.title)),
    tomorrowRecommendations: missedTasks.slice(0, 3).map((task) => `Move ${task.title} to tomorrow morning.`),
  }
}

export function formatCalendarTime(value) {
  return toTime(value)
}
