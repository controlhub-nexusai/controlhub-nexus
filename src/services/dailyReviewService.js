function getTodayKey() {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }))
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function isCompletedToday(task = {}, today = getTodayKey()) {
  if (task.status !== 'completed') return false
  const completedDate = task.completedAt || task.completed_at || task.updatedAt || task.createdAt || task.dueDate
  return !completedDate || String(completedDate).slice(0, 10) === today
}

function isPending(task = {}) {
  return task.status !== 'completed'
}

function isOverdue(task = {}, today = getTodayKey()) {
  return isPending(task) && task.dueDate && task.dueDate < today
}

function leadNeedsFollowUp(lead = {}) {
  const status = String(lead.status || '').toLowerCase()
  return ['new', 'interested', 'proposal'].includes(status) || !lead.lastContact
}

function isDraftContent(item = {}) {
  const status = String(item.status || '').toLowerCase()
  return ['draft', 'drafted', 'idea'].includes(status)
}

function buildTomorrowRecommendation({ overdueTasks, leadFollowUps, draftContent, pendingTasks }) {
  if (overdueTasks[0]) return `Selesaikan overdue task: ${overdueTasks[0].title}.`
  if (leadFollowUps[0]) return `Follow up ${leadFollowUps[0].name}.`
  if (draftContent[0]) return `Review draft konten: ${draftContent[0].title}.`
  if (draftContent.length === 0) return 'Buat satu konten baru untuk menjaga momentum.'
  if (pendingTasks[0]) return `Mulai dari task: ${pendingTasks[0].title}.`
  return 'Review prioritas dan pilih satu fokus utama.'
}

export function generateDailyReview({
  tasks = [],
  leads = [],
  content = [],
  reminders = [],
} = {}) {
  const today = getTodayKey()
  const completedTasks = tasks.filter((task) => isCompletedToday(task, today))
  const pendingTasks = tasks.filter(isPending)
  const overdueTasks = tasks.filter((task) => isOverdue(task, today))
  const missedReminders = reminders.filter((reminder) => {
    const dueAt = reminder.dueAt ? new Date(reminder.dueAt) : null
    return dueAt && dueAt.getTime() < Date.now() && reminder.status !== 'completed'
  })
  const leadFollowUps = leads.filter(leadNeedsFollowUp)
  const draftContent = content.filter(isDraftContent)
  const tomorrowRecommendation = buildTomorrowRecommendation({
    overdueTasks,
    leadFollowUps,
    draftContent,
    pendingTasks,
  })

  return {
    completedCount: completedTasks.length,
    pendingCount: pendingTasks.length,
    missedReminders: missedReminders.length || overdueTasks.length,
    leadFollowUps: leadFollowUps.length,
    draftContent: draftContent.length,
    summary: [
      `${completedTasks.length} tugas selesai`,
      `${pendingTasks.length} tugas tertunda`,
      `${leadFollowUps.length} lead perlu follow-up`,
      `${draftContent.length} konten masih draft`,
    ],
    tomorrowRecommendation,
  }
}

export function buildDailyReviewResponse(review) {
  return [
    'Review hari ini siap.',
    '',
    'Selesai:',
    `${review.completedCount} tugas`,
    '',
    'Tertunda:',
    `${review.pendingCount} tugas`,
    '',
    'Prioritas besok:',
    review.tomorrowRecommendation,
  ].join('\n')
}
