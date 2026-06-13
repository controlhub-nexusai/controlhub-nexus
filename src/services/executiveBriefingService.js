function getTodayKey() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function normalizeText(value = '') {
  return String(value).toLowerCase()
}

function isActiveTask(task = {}) {
  return task.status !== 'completed'
}

function isHighPriorityTask(task = {}) {
  return isActiveTask(task) && normalizeText(task.priority) === 'high'
}

function isOverdueTask(task = {}, today = getTodayKey()) {
  return isActiveTask(task) && task.dueDate && task.dueDate < today
}

function isPendingLead(lead = {}) {
  const status = normalizeText(lead.status)
  return ['new', 'interested', 'proposal', 'follow up', 'follow_up', 'contacted'].includes(status)
}

function isLeadNotContacted(lead = {}) {
  return isPendingLead(lead) && !lead.lastContact
}

function isDraftContent(item = {}) {
  const status = normalizeText(item.status)
  return ['draft', 'drafted', 'waiting_review', 'review'].includes(status)
}

function isApprovedContent(item = {}) {
  const status = normalizeText(item.status)
  return ['approved', 'ready', 'ready_to_publish'].includes(status)
}

function getItemTitle(item = {}) {
  return item.title || item.text || item.name || 'Untitled'
}

function buildGreeting(profile) {
  const name = profile?.name ? `, ${profile.name}` : ''
  return `Executive Briefing siap${name}.`
}

function buildRecommendation({ opportunityType, summary }) {
  if (opportunityType === 'lead') return 'Follow up lead terlebih dahulu sebelum membuat task baru.'
  if (opportunityType === 'approved_content') return 'Publish konten yang sudah approved agar momentum branding tetap jalan.'
  if (opportunityType === 'draft_content') return 'Review dan approve draft konten agar branding tetap berjalan.'
  if (summary.activeTasks === 0) return 'Buat satu task kecil untuk memulai momentum.'
  if (summary.highPriorityTasks > 0) return 'Selesaikan prioritas tinggi sebelum membuka pekerjaan baru.'
  return 'Pilih satu pekerjaan kecil dan selesaikan sampai tuntas.'
}

export function generateExecutiveBriefing({
  tasks = [],
  leads = [],
  content = [],
  reminders = [],
  profile,
} = {}) {
  const today = getTodayKey()
  const activeTasks = tasks.filter(isActiveTask)
  const completedTasks = tasks.filter((task) => task.status === 'completed')
  const highPriorityTasks = activeTasks.filter(isHighPriorityTask)
  const pendingLeads = leads.filter(isPendingLead)
  const draftContent = content.filter(isDraftContent)
  const upcomingReminders = reminders.filter((reminder) => reminder.dueTime || reminder.dueDate)
  const approvedContent = content.filter(isApprovedContent)
  const overdueTask = activeTasks.find((task) => isOverdueTask(task, today))
  const leadOpportunity = pendingLeads[0]
  const leadRisk = leads.find(isLeadNotContacted)
  const approvedOpportunity = approvedContent[0]
  const draftOpportunity = draftContent[0]
  const highPriorityOpportunity = highPriorityTasks[0]
  const summary = {
    activeTasks: activeTasks.length,
    completedTasks: completedTasks.length,
    highPriorityTasks: highPriorityTasks.length,
    pendingLeads: pendingLeads.length,
    draftContent: draftContent.length,
    upcomingReminders: upcomingReminders.length,
  }

  let opportunityType = ''
  let biggestOpportunity = 'Tidak ada peluang besar yang mendesak saat ini.'

  if (leadOpportunity) {
    opportunityType = 'lead'
    biggestOpportunity = `Follow up ${leadOpportunity.name}.`
  } else if (approvedOpportunity) {
    opportunityType = 'approved_content'
    biggestOpportunity = `Publish ${getItemTitle(approvedOpportunity)}.`
  } else if (draftOpportunity) {
    opportunityType = 'draft_content'
    biggestOpportunity = `Review draft: ${getItemTitle(draftOpportunity)}.`
  } else if (highPriorityOpportunity) {
    opportunityType = 'high_priority_task'
    biggestOpportunity = highPriorityOpportunity.title
  }

  let biggestRisk = 'Tidak ada risiko besar terdeteksi.'
  if (overdueTask) {
    biggestRisk = `Overdue task: ${overdueTask.title}.`
  } else if (leadRisk) {
    biggestRisk = `Lead belum dikontak: ${leadRisk.name}.`
  } else if (content.length === 0) {
    biggestRisk = 'Belum ada konten baru yang dibuat.'
  } else if (activeTasks.length >= 6) {
    biggestRisk = `${activeTasks.length} task masih pending.`
  }

  const recommendation = buildRecommendation({ opportunityType, summary })

  return {
    greeting: buildGreeting(profile),
    summary,
    biggestOpportunity,
    biggestRisk,
    recommendation,
    nextBestAction: recommendation,
  }
}
