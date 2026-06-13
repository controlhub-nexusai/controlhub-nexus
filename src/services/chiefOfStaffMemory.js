import { logMvpMode } from './mvpMode'

const MEMORY_TYPES = {
  CLIENT: 'client',
  MEETING: 'meeting',
  TASK: 'task',
  IDEA: 'idea',
  PROJECT: 'project',
}

const DEFAULT_CLIENTS = [
  {
    id: 'client-abc',
    name: 'ABC Company',
    company: 'ABC Company',
    email: '',
    phone: '',
    status: 'prospect',
    last_contact: '2026-06-12',
    follow_up_date: '2026-06-19',
    summary: 'Prospect interested in AI Automation. Estimated budget: $5,000. Next action: Send proposal.',
    created_at: new Date().toISOString(),
  },
]

const DEFAULT_MEETINGS = [
  {
    id: 'meeting-abc',
    title: 'ABC Company discovery call',
    date: '2026-06-12',
    summary: 'Discussed AI Automation opportunity, proposal requirement, and budget around $5,000.',
    action_items: ['Send proposal', 'Follow up next week'],
    participants: ['ABC Company'],
  },
]

const DEFAULT_PROJECTS = [
  {
    id: 'project-nexus',
    name: 'Nexus AI',
    status: 'Phase 11.3',
    deadline: '',
    summary: 'Chief of Staff AI memory layer in progress. Completed dashboard and command center. Pending calendar and email integrations.',
  },
]

const DEFAULT_MEMORIES = [
  {
    id: 'memory-abc',
    memory_type: MEMORY_TYPES.CLIENT,
    content: 'ABC Company is interested in AI Automation. Budget around $5,000. Proposal due before June 30. Follow up next week.',
    created_at: new Date().toISOString(),
  },
]

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function addDaysIso(days) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

function titleize(value = '') {
  const clean = value.trim()
  if (!clean) return clean
  return clean.charAt(0).toUpperCase() + clean.slice(1)
}

function extractCompany(note = '') {
  const metMatch = note.match(/\bmet\s+([A-Z][\w\s&.-]+?)(?:\.|,|\n|$)/i)
  const companyMatch = note.match(/\b([A-Z][\w\s&.-]+?\s+(?:Company|Clinic|Klinik|Studio|Agency|Group|Hospital|Labs?))\b/)
  return titleize((companyMatch?.[1] || metMatch?.[1] || '').trim())
}

function extractInterest(note = '') {
  const interestMatch = note.match(/\binterested in\s+([^.\n]+)/i)
  if (interestMatch) return titleize(interestMatch[1])
  if (/\bAI automation\b/i.test(note)) return 'AI Automation'
  if (/\bbranding\b/i.test(note)) return 'AI Branding'
  return ''
}

function extractBudget(note = '') {
  return note.match(/\$[\d,]+(?:\.\d+)?|\b(?:budget|around)\s+([\d,.]+\s?(?:jt|juta|usd|dollars?))/i)?.[0] || ''
}

function extractDeadline(note = '') {
  const beforeMatch = note.match(/\bbefore\s+([A-Z][a-z]+\s+\d{1,2})/i)
  const dueMatch = note.match(/\b(?:due|deadline)\s+(?:on|before)?\s*([A-Z][a-z]+\s+\d{1,2})/i)
  return beforeMatch?.[1] || dueMatch?.[1] || ''
}

function extractFollowUp(note = '') {
  if (/\bfollow up next week\b/i.test(note)) return addDaysIso(7)
  if (/\bfollow up tomorrow\b/i.test(note)) return addDaysIso(1)
  if (/\bfollow up today\b/i.test(note)) return todayIso()
  return ''
}

function extractNextAction(note = '') {
  if (/\bproposal\b/i.test(note)) return 'Send proposal'
  if (/\bfollow up\b/i.test(note)) return 'Follow up'
  if (/\bmeeting\b/i.test(note)) return 'Schedule meeting'
  return 'Review memory'
}

function detectMemoryType(note = '') {
  if (/\bmet|meeting|call|discussed\b/i.test(note)) return MEMORY_TYPES.MEETING
  if (/\bclient|company|lead|prospect|budget|proposal\b/i.test(note)) return MEMORY_TYPES.CLIENT
  if (/\bidea|content|concept\b/i.test(note)) return MEMORY_TYPES.IDEA
  if (/\bproject|phase|milestone\b/i.test(note)) return MEMORY_TYPES.PROJECT
  if (/\btask|deadline|follow up|send\b/i.test(note)) return MEMORY_TYPES.TASK
  return MEMORY_TYPES.IDEA
}

function normalizeClient(client) {
  return {
    id: client.id,
    name: client.name || client.company || 'Unknown Client',
    company: client.company || client.name || 'Unknown Client',
    email: client.email || '',
    phone: client.phone || '',
    status: client.status || 'prospect',
    last_contact: client.last_contact || client.lastContact || todayIso(),
    follow_up_date: client.follow_up_date || client.followUpDate || '',
    summary: client.summary || '',
    created_at: client.created_at || new Date().toISOString(),
  }
}

function normalizeMeeting(meeting) {
  return {
    id: meeting.id,
    title: meeting.title || 'Untitled meeting',
    date: meeting.date || meeting.meeting_time?.slice(0, 10) || todayIso(),
    summary: meeting.summary || meeting.notes || '',
    action_items: Array.isArray(meeting.action_items)
      ? meeting.action_items
      : String(meeting.action_items || '').split('\n').filter(Boolean),
    participants: Array.isArray(meeting.participants)
      ? meeting.participants
      : String(meeting.participants || '').split(',').map((item) => item.trim()).filter(Boolean),
  }
}

function normalizeProject(project) {
  return {
    id: project.id,
    name: project.name || project.title || 'Untitled project',
    status: project.status || 'active',
    deadline: project.deadline || '',
    summary: project.summary || '',
  }
}

function normalizeMemory(memory) {
  return {
    id: memory.id,
    memory_type: memory.memory_type || memory.type || MEMORY_TYPES.IDEA,
    content: memory.content || '',
    created_at: memory.created_at || new Date().toISOString(),
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

export function extractStructuredMemory(note = '') {
  const company = extractCompany(note)
  const interest = extractInterest(note)
  const budget = extractBudget(note)
  const deadline = extractDeadline(note)
  const followUpDate = extractFollowUp(note)
  const nextAction = extractNextAction(note)
  const memoryType = detectMemoryType(note)
  const participants = company ? [company] : []
  const decisions = []
  const risks = []

  if (interest) decisions.push(`Interest confirmed: ${interest}`)
  if (budget) decisions.push(`Budget discussed: ${budget}`)
  if (deadline) risks.push(`Deadline approaching: ${deadline}`)
  if (followUpDate) risks.push(`Follow-up required: ${followUpDate}`)

  return {
    memoryType,
    company,
    interest,
    budget,
    nextAction,
    deadline,
    followUpDate,
    participants,
    decisions,
    risks,
    tasks: nextAction ? [nextAction] : [],
    summary: [
      company ? `${company}` : 'New memory',
      interest ? `interest: ${interest}` : '',
      budget ? `budget: ${budget}` : '',
      nextAction ? `next action: ${nextAction}` : '',
      deadline ? `deadline: ${deadline}` : '',
    ].filter(Boolean).join(' | '),
  }
}

export async function loadChiefOfStaffWorkspace() {
  const [clients, meetings, projects, memories] = [
    safeSelect('clients', 'id,name,company,email,phone,status,last_contact,follow_up_date,summary,created_at', DEFAULT_CLIENTS),
    safeSelect('meetings', '*', DEFAULT_MEETINGS),
    safeSelect('projects', '*', DEFAULT_PROJECTS),
    safeSelect('memories', 'id,memory_type,content,created_at', DEFAULT_MEMORIES),
  ]

  return {
    clients: clients.map(normalizeClient),
    meetings: meetings.map(normalizeMeeting),
    projects: projects.map(normalizeProject),
    memories: memories.map(normalizeMemory),
  }
}

export async function saveStructuredMemory(note) {
  const extracted = extractStructuredMemory(note)
  const memoryFallback = normalizeMemory({
    id: `memory-${Date.now()}`,
    memory_type: extracted.memoryType,
    content: note,
  })

  const savedMemory = normalizeMemory(safeInsert('memories', {
    memory_type: extracted.memoryType,
    content: note,
  }, memoryFallback))

  let client = null
  if (extracted.company) {
    const clientPayload = {
      name: extracted.company,
      company: extracted.company,
      status: 'prospect',
      last_contact: todayIso(),
      follow_up_date: extracted.followUpDate || null,
      summary: extracted.summary,
    }
    client = normalizeClient(safeInsert('clients', clientPayload, {
      id: `client-${Date.now()}`,
      ...clientPayload,
    }))
  }

  let meeting = null
  if (extracted.memoryType === MEMORY_TYPES.MEETING || extracted.participants.length > 0) {
    const meetingPayload = {
      title: extracted.company ? `${extracted.company} meeting` : 'Captured meeting',
      meeting_time: new Date().toISOString(),
      notes: extracted.summary || note,
    }
    meeting = normalizeMeeting(safeInsert('meetings', meetingPayload, {
      id: `meeting-${Date.now()}`,
      ...meetingPayload,
    }))
  }

  return {
    memory: savedMemory,
    client,
    meeting,
    extracted,
  }
}

export function buildDailyChiefBriefing({ clients = [], meetings = [], projects = [] }) {
  const today = todayIso()
  const nextWeek = addDaysIso(7)
  const followUps = clients.filter((client) => client.follow_up_date && client.follow_up_date <= nextWeek)
  const todayMeetings = meetings.filter((meeting) => meeting.date === today)
  const criticalDeadlines = projects.filter((project) => project.deadline && project.deadline <= nextWeek)
  const riskAlerts = [
    ...followUps.map((client) => `${client.company} needs follow-up.`),
    ...criticalDeadlines.map((project) => `${project.name} deadline is approaching.`),
  ]

  return {
    focus: [
      `${followUps.length} Client Follow-Ups`,
      `${todayMeetings.length} Meetings`,
      `${criticalDeadlines.length} Critical Deadlines`,
    ],
    suggestedActions: followUps.length
      ? followUps.map((client) => `Send follow-up to ${client.company}`)
      : ['Review one important client memory'],
    riskAlerts,
    upcomingDeadlines: criticalDeadlines,
  }
}

export function recallMemory(query = '', workspace = {}) {
  const normalizedQuery = query.toLowerCase()
  const clients = workspace.clients || []
  const meetings = workspace.meetings || []
  const projects = workspace.projects || []
  const memories = workspace.memories || []
  const client = clients.find((item) =>
    normalizedQuery.includes(item.company.toLowerCase()) || normalizedQuery.includes(item.name.toLowerCase())
  )
  const project = projects.find((item) => normalizedQuery.includes(item.name.toLowerCase()))

  if (client) {
    const relatedMeetings = meetings.filter((meeting) =>
      meeting.participants.some((participant) => participant.toLowerCase().includes(client.company.toLowerCase()))
    )

    return [
      `${client.company} is a ${client.status} client.`,
      '',
      'Summary:',
      client.summary || 'No summary yet.',
      '',
      'Last contact:',
      client.last_contact || '-',
      '',
      'Next action:',
      relatedMeetings[0]?.action_items?.[0] || 'Review client and decide next step.',
    ].join('\n')
  }

  if (project) {
    return [
      `Current Phase: ${project.status}`,
      '',
      'Summary:',
      project.summary || 'No project summary yet.',
      '',
      'Deadline:',
      project.deadline || '-',
    ].join('\n')
  }

  const relatedMemory = memories.find((memory) => memory.content.toLowerCase().includes(normalizedQuery))
  if (relatedMemory) return relatedMemory.content

  return 'I do not have a matching memory yet. Add a note and I will structure it.'
}

export function buildMemoryStats({ clients = [], meetings = [], projects = [], memories = [] }) {
  const briefing = buildDailyChiefBriefing({ clients, meetings, projects })

  return {
    clients: clients.length,
    tasks: briefing.suggestedActions.length,
    meetings: meetings.length,
    deadlines: briefing.upcomingDeadlines.length,
    memories: memories.length,
  }
}

export { MEMORY_TYPES, DEFAULT_CLIENTS, DEFAULT_MEETINGS, DEFAULT_PROJECTS, DEFAULT_MEMORIES }
