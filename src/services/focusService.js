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

function isOverdueTask(task = {}, today = getTodayKey()) {
  return isActiveTask(task) && task.dueDate && task.dueDate < today
}

function isHighPriorityTask(task = {}) {
  return isActiveTask(task) && String(task.priority || '').toLowerCase() === 'high'
}

function needsLeadFollowUp(lead = {}) {
  const status = String(lead.status || '').toLowerCase()
  return ['new', 'interested', 'proposal', 'contacted'].includes(status) || !lead.lastContact
}

function needsContentApproval(item = {}) {
  const status = String(item.status || '').toLowerCase()
  return ['draft', 'drafted', 'waiting_review', 'review'].includes(status)
}

function isActiveNormalTask(task = {}) {
  return isActiveTask(task) && !isHighPriorityTask(task)
}

function makeFocusTask({ title, reason, duration, type }) {
  return {
    title,
    reason,
    duration,
    type,
  }
}

export function generateFocusTask({
  tasks = [],
  leads = [],
  content = [],
  reminders = [],
} = {}) {
  const today = getTodayKey()
  const overdueTask = tasks.find((task) => isOverdueTask(task, today))

  if (overdueTask) {
    return makeFocusTask({
      title: overdueTask.title,
      reason: 'Task ini sudah lewat deadline, jadi paling berisiko jika ditunda lagi.',
      duration: 45,
      type: 'overdue_task',
    })
  }

  const highPriorityTask = tasks.find(isHighPriorityTask)

  if (highPriorityTask) {
    return makeFocusTask({
      title: highPriorityTask.title,
      reason: 'Task ini punya prioritas tinggi dan akan paling membantu progress hari ini.',
      duration: 45,
      type: 'high_priority_task',
    })
  }

  const followUpLead = leads.find(needsLeadFollowUp)

  if (followUpLead) {
    return makeFocusTask({
      title: `Follow up ${followUpLead.name}`,
      reason: 'Lead ini masih membutuhkan follow-up agar peluang tidak dingin.',
      duration: 25,
      type: 'lead_follow_up',
    })
  }

  const contentReview = content.find(needsContentApproval)

  if (contentReview) {
    return makeFocusTask({
      title: `Review konten: ${contentReview.title}`,
      reason: 'Konten ini sudah menunggu approval dan bisa cepat dipindahkan ke tahap berikutnya.',
      duration: 25,
      type: 'content_approval',
    })
  }

  if (content.length === 0) {
    return makeFocusTask({
      title: 'Buat satu ide konten baru',
      reason: 'Tidak ada konten aktif, jadi satu ide baru bisa menjaga momentum branding.',
      duration: 25,
      type: 'content_creation',
    })
  }

  const normalTask = tasks.find(isActiveNormalTask)

  if (normalTask) {
    return makeFocusTask({
      title: normalTask.title,
      reason: 'Ini task aktif berikutnya yang bisa diselesaikan tanpa menambah konteks baru.',
      duration: 45,
      type: 'normal_task',
    })
  }

  return makeFocusTask({
    title: reminders[0]?.title || 'Pilih satu prioritas utama',
    reason: 'Tidak ada pekerjaan mendesak terdeteksi, gunakan sesi ini untuk merapikan prioritas.',
    duration: 25,
    type: 'planning',
  })
}

export function buildFocusResponse(focusTask) {
  return [
    '🎯 Fokus hari ini:',
    '',
    focusTask.title,
    '',
    'Alasan:',
    focusTask.reason,
    '',
    'Estimasi:',
    `${focusTask.duration} menit`,
  ].join('\n')
}
