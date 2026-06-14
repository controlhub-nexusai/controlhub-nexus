function getWeekStart() {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }))
  const day = now.getDay() || 7
  now.setHours(0, 0, 0, 0)
  now.setDate(now.getDate() - day + 1)
  return now
}

function getTodayKey() {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }))
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function isThisWeek(value, weekStart = getWeekStart()) {
  if (!value) return false
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return false
  return date >= weekStart
}

function isCompletedThisWeek(task = {}, weekStart = getWeekStart()) {
  if (task.status !== 'completed') return false
  const completedDate = task.completedAt || task.completed_at || task.updatedAt || task.createdAt || task.dueDate
  return !completedDate || isThisWeek(completedDate, weekStart)
}

function isPending(task = {}) {
  return task.status !== 'completed'
}

function isOverdue(task = {}, today = getTodayKey()) {
  return isPending(task) && task.dueDate && task.dueDate < today
}

function wasLeadFollowedUpThisWeek(lead = {}, weekStart = getWeekStart()) {
  const status = String(lead.status || '').toLowerCase()
  return ['contacted', 'proposal', 'won'].includes(status) || isThisWeek(lead.lastContact || lead.updatedAt || lead.createdAt, weekStart)
}

function wasContentCreatedThisWeek(item = {}, weekStart = getWeekStart()) {
  return isThisWeek(item.createdAt || item.created_at, weekStart)
}

function wasContentPublished(item = {}) {
  return String(item.status || '').toLowerCase() === 'published'
}

function clampScore(score) {
  return Math.max(0, Math.min(100, score))
}

function getMomentumLabel(score) {
  if (score <= 30) return 'Perlu dorongan'
  if (score <= 60) return 'Cukup stabil'
  if (score <= 80) return 'Progress bagus'
  return 'Momentum kuat'
}

function buildNextWeekRecommendation({ overdueTasks, pendingTasks, draftContent, leadsFollowedUp }) {
  if (overdueTasks > 0) return 'Mulai minggu depan dengan menyelesaikan overdue task pertama.'
  if (leadsFollowedUp === 0) return 'Jadwalkan blok follow-up lead di awal minggu.'
  if (draftContent > 0) return 'Publikasikan atau review draft konten yang tertunda.'
  if (pendingTasks > 0) return 'Pilih 3 task paling penting untuk jadi fokus minggu depan.'
  return 'Pertahankan momentum dengan membuat satu target besar untuk minggu depan.'
}

export function generateWeeklyReview({
  tasks = [],
  leads = [],
  content = [],
  reminders = [],
} = {}) {
  const weekStart = getWeekStart()
  const today = getTodayKey()
  const completedTasks = tasks.filter((task) => isCompletedThisWeek(task, weekStart)).length
  const pendingTasks = tasks.filter(isPending).length
  const overdueTasks = tasks.filter((task) => isOverdue(task, today)).length
  const leadsFollowedUp = leads.filter((lead) => wasLeadFollowedUpThisWeek(lead, weekStart)).length
  const contentCreated = content.filter((item) => wasContentCreatedThisWeek(item, weekStart)).length
  const contentPublished = content.filter(wasContentPublished).length
  const draftContent = content.filter((item) => ['draft', 'drafted', 'idea'].includes(String(item.status || '').toLowerCase())).length
  const rawScore = (completedTasks * 10) + (contentCreated * 15) + (leadsFollowedUp * 10) - (overdueTasks * 10)
  const momentumScore = clampScore(rawScore)
  const momentumLabel = getMomentumLabel(momentumScore)
  const nextWeekRecommendation = buildNextWeekRecommendation({
    overdueTasks,
    pendingTasks,
    draftContent,
    leadsFollowedUp,
  })

  return {
    completedTasks,
    pendingTasks,
    overdueTasks,
    leadsFollowedUp,
    contentCreated,
    contentPublished,
    momentumScore,
    momentumLabel,
    weeklySummary: [
      `Completed: ${completedTasks} tasks`,
      `Pending: ${pendingTasks} tasks`,
      `Leads followed up: ${leadsFollowedUp}`,
      `Content created: ${contentCreated}`,
      `Momentum: ${momentumLabel}`,
    ],
    nextWeekRecommendation,
    remindersCount: reminders.length,
  }
}

export function buildWeeklyReviewResponse(review) {
  return [
    'Review minggu ini siap.',
    '',
    'Momentum:',
    `${review.momentumScore}% — ${review.momentumLabel}`,
    '',
    'Selesai:',
    `${review.completedTasks} tugas`,
    '',
    'Konten:',
    `${review.contentCreated} dibuat`,
    '',
    'Lead:',
    `${review.leadsFollowedUp} follow-up`,
    '',
    'Rekomendasi minggu depan:',
    review.nextWeekRecommendation,
  ].join('\n')
}
