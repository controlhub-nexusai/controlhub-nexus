const DEFAULT_TIME_BLOCKS = [
  { time: '09:00 - 11:00', label: 'Deep Work' },
  { time: '11:00 - 12:00', label: 'Follow Up' },
  { time: '13:00 - 15:00', label: 'Content / Project Work' },
  { time: '16:00 - 17:00', label: 'Review & Wrap Up' },
]

function getTodayKey() {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }))
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function isActiveTask(task = {}) {
  return task.status !== 'completed'
}

function isOverdue(task = {}, today = getTodayKey()) {
  return isActiveTask(task) && task.dueDate && task.dueDate < today
}

function isDueToday(task = {}, today = getTodayKey()) {
  return isActiveTask(task) && task.dueDate === today
}

function needsLeadFollowUp(lead = {}) {
  const status = String(lead.status || '').toLowerCase()
  return ['new', 'interested', 'proposal', 'contacted'].includes(status)
}

function needsContentReview(item = {}) {
  const status = String(item.status || '').toLowerCase()
  return ['draft', 'drafted', 'idea'].includes(status)
}

function makePlanItem(type, title, source, score) {
  return { type, title, source, score }
}

function rankPlanningItems({ tasks = [], leads = [], content = [] }) {
  const today = getTodayKey()
  const items = []

  tasks.filter((task) => isOverdue(task, today)).forEach((task) => {
    items.push(makePlanItem('overdue_task', task.title, task, 100))
  })

  tasks.filter((task) => isActiveTask(task) && task.priority === 'high').forEach((task) => {
    items.push(makePlanItem('high_priority_task', task.title, task, 90))
  })

  leads.filter(needsLeadFollowUp).forEach((lead) => {
    items.push(makePlanItem('lead_follow_up', `Follow up ${lead.name}`, lead, 80))
  })

  tasks.filter((task) => isDueToday(task, today)).forEach((task) => {
    items.push(makePlanItem('due_today_task', task.title, task, 70))
  })

  content.filter(needsContentReview).forEach((item) => {
    items.push(makePlanItem('content_review', `Review ${item.title}`, item, 60))
  })

  if (content.length === 0) {
    items.push(makePlanItem('create_content', 'Create one new content idea', null, 50))
  }

  tasks.filter((task) => isActiveTask(task) && task.priority === 'low').forEach((task) => {
    items.push(makePlanItem('admin_low_priority', task.title, task, 30))
  })

  return items
    .sort((a, b) => b.score - a.score)
    .filter((item, index, all) => all.findIndex((other) => other.title === item.title) === index)
}

function buildTimeBlocks(items = []) {
  const [first, second, third] = items

  return [
    { ...DEFAULT_TIME_BLOCKS[0], label: first?.title || DEFAULT_TIME_BLOCKS[0].label },
    { ...DEFAULT_TIME_BLOCKS[1], label: second?.type === 'lead_follow_up' ? second.title : 'Follow Up Leads' },
    { ...DEFAULT_TIME_BLOCKS[2], label: third?.title || DEFAULT_TIME_BLOCKS[2].label },
    DEFAULT_TIME_BLOCKS[3],
  ]
}

export function generateDailyPlan({
  tasks = [],
  leads = [],
  content = [],
  reminders = [],
  profile,
} = {}) {
  const rankedItems = rankPlanningItems({ tasks, leads, content })
  const focusItem = rankedItems[0]
  const focus = focusItem?.title || profile?.brand_focus || 'Review priorities and choose one important task'
  const timeBlocks = buildTimeBlocks(rankedItems)
  const nextAction = focusItem
    ? `Start with ${focusItem.title}.`
    : 'Start with a 15-minute planning review.'
  const recommendation = reminders.length > 0
    ? `You have ${reminders.length} upcoming reminder${reminders.length > 1 ? 's' : ''}. Protect your first focus block.`
    : 'Protect your first focus block and avoid context switching.'

  return {
    focus,
    timeBlocks,
    nextAction,
    recommendation,
    items: rankedItems,
  }
}

export function buildDailyPlanResponse(plan) {
  return [
    'Rencana hari ini siap.',
    '',
    'Fokus:',
    plan.focus,
    '',
    'Langkah pertama:',
    plan.nextAction,
    '',
    'Lihat detail di Daily Plan.',
  ].join('\n')
}
