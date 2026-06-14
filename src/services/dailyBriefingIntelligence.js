function normalizeStatus(value = '') {
  return String(value || '').toLowerCase().replace(/[_-]/g, ' ').trim()
}

function isCompletedTask(task = {}) {
  return normalizeStatus(task.status) === 'completed'
}

function isActiveTask(task = {}) {
  return !isCompletedTask(task)
}

function isActiveLead(lead = {}) {
  return !['won', 'lost', 'closed'].includes(normalizeStatus(lead.status))
}

function isDraftContent(item = {}) {
  return ['draft', 'drafted', 'idea', 'pending'].includes(normalizeStatus(item.status))
}

function isPublishedContent(item = {}) {
  return ['published', 'live'].includes(normalizeStatus(item.status))
}

function isReadyContent(item = {}) {
  return ['approved', 'ready', 'ready to publish'].includes(normalizeStatus(item.status))
}

function isMemoryStored(memory = {}) {
  return !memory.isFallback
}

function getContentLabel(item = {}) {
  const platform = item.platform || item.channel || 'konten'
  const title = item.title ? ` "${item.title}"` : ''
  return `${platform}${title}`
}

function getContentActionLabel(item = {}) {
  const platform = item.platform || item.channel || ''
  const title = item.title ? ` "${item.title}"` : ''
  return `konten${platform ? ` ${platform}` : ''}${title}`
}

function getWorkspaceStats({ tasks = [], leads = [], content = [], memories = [] } = {}) {
  const completedTasks = tasks.filter(isCompletedTask)
  const activeTasks = tasks.filter(isActiveTask)
  const activeLeads = leads.filter(isActiveLead)
  const draftContent = content.filter(isDraftContent)
  const readyContent = content.filter(isReadyContent)
  const publishedContent = content.filter(isPublishedContent)
  const storedMemories = memories.filter(isMemoryStored)

  return {
    completedTasks,
    activeTasks,
    activeLeads,
    draftContent,
    readyContent,
    publishedContent,
    storedMemories,
  }
}

function hasLateWorkContext(date = new Date()) {
  const hour = Number(new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    hourCycle: 'h23',
    timeZone: 'Asia/Jakarta',
  }).format(date))

  return hour >= 21
}

function formatCount(count, singular, plural = singular) {
  return `${count} ${count === 1 ? singular : plural}`
}

function buildLightnessLine(stats) {
  const totalOpen = stats.activeTasks.length + stats.activeLeads.length + stats.draftContent.length
  if (totalOpen === 0) return 'Workspace sedang bersih.'
  if (totalOpen <= 3) return 'Workspace masih cukup ringan.'
  if (totalOpen <= 7) return 'Workspace mulai perlu dirapikan.'
  return 'Workspace cukup padat. Pilih satu prioritas saja.'
}

export function buildTodaySummary(inputs = {}, date = new Date()) {
  const stats = getWorkspaceStats(inputs)
  const done = []
  const unfinished = []

  if (stats.draftContent.length > 0) done.push(`${formatCount(stats.draftContent.length, 'draft konten')} dibuat`)
  if (stats.activeLeads.length > 0) done.push(`${formatCount(stats.activeLeads.length, 'prospek')} tersimpan`)
  if (stats.completedTasks.length > 0) done.push(`${formatCount(stats.completedTasks.length, 'task')} ditandai selesai`)
  if (stats.publishedContent.length > 0) done.push(`${formatCount(stats.publishedContent.length, 'konten')} dipublikasikan`)

  if (stats.publishedContent.length === 0) unfinished.push('Belum ada konten dipublikasikan')
  if (stats.completedTasks.length === 0) unfinished.push('Belum ada task ditandai selesai')
  if (stats.activeLeads.length > 0) unfinished.push('Prospek masih perlu dijaga')
  if (stats.activeTasks.length > 0) unfinished.push(`${stats.activeTasks.length} task masih aktif`)

  const lines = [
    'Hari ini:',
    '',
    ...(done.length > 0 ? done.map((item) => `✓ ${item}`) : ['Belum ada progres yang tercatat.']),
    '',
    'Belum selesai:',
    '',
    ...(unfinished.length > 0 ? unfinished.map((item) => `• ${item}`) : ['• Tidak ada hal penting yang tertinggal.']),
    '',
    buildLightnessLine(stats),
  ]

  if (hasLateWorkContext(date)) {
    lines.push('', 'Hari ini sudah cukup panjang. Cukup pilih satu prioritas untuk besok.')
  }

  return lines.join('\n')
}

export function buildMissedSummary(inputs = {}, date = new Date()) {
  const stats = getWorkspaceStats(inputs)
  const findings = []

  if (stats.draftContent[0]) findings.push(`${getContentLabel(stats.draftContent[0])} masih berstatus draft.`)
  if (stats.activeLeads.length > 0) findings.push('Belum ada follow-up prospek yang tercatat hari ini.')
  if (stats.completedTasks.length === 0) findings.push('Tidak ada task yang ditandai selesai.')
  if (stats.readyContent[0]) findings.push(`${getContentLabel(stats.readyContent[0])} sudah siap dipublikasikan.`)
  if (findings.length === 0) findings.push('Tidak ada hal penting yang tertinggal dari data workspace.')

  const recommendation = chooseTomorrowFocus(inputs)
  const lines = [
    'Dari yang saya lihat:',
    '',
    ...findings.map((item, index) => `${index + 1}. ${item}`),
    '',
  ]

  if (hasLateWorkContext(date)) {
    lines.push('Hari ini sudah cukup panjang.', 'Saya sarankan cukup tentukan satu prioritas untuk besok.')
  } else if (recommendation?.title) {
    lines.push('Jika memilih satu hal,', `saya sarankan ${recommendation.action}.`)
  }

  return lines.join('\n')
}

export function chooseTomorrowFocus({ tasks = [], leads = [], content = [] } = {}) {
  const readyContent = content.find(isReadyContent)
  if (readyContent) {
    return {
      action: `publikasikan ${getContentActionLabel(readyContent)}`,
      title: readyContent.title || getContentLabel(readyContent),
      reasons: ['Sudah hampir selesai', 'Dampak branding tinggi', 'Tidak membutuhkan banyak waktu'],
    }
  }

  const draftContent = content.find(isDraftContent)
  if (draftContent) {
    return {
      action: `lanjutkan draft ${getContentActionLabel(draftContent)}`,
      title: draftContent.title || getContentLabel(draftContent),
      reasons: ['Sudah ada bahan awal', 'Dampak branding masih tinggi', 'Lebih ringan daripada mulai dari nol'],
    }
  }

  const lead = leads.find(isActiveLead)
  if (lead) {
    return {
      action: `follow up ${lead.name || lead.company || 'prospek utama'}`,
      title: lead.name || lead.company || 'Prospek utama',
      reasons: ['Ada peluang yang masih aktif', 'Follow-up menjaga momentum', 'Bisa dilakukan singkat'],
    }
  }

  const task = tasks.find(isActiveTask)
  if (task) {
    return {
      action: `selesaikan ${task.title}`,
      title: task.title,
      reasons: ['Masih aktif di workspace', 'Mengurangi beban terbuka', 'Memberi progress yang jelas'],
    }
  }

  return {
    action: 'tentukan satu prioritas kecil',
    title: 'Satu prioritas kecil',
    reasons: ['Workspace sedang ringan', 'Lebih baik menjaga arah', 'Tidak perlu membuat rencana besar'],
  }
}

export function buildTomorrowFocus(inputs = {}, date = new Date()) {
  const focus = chooseTomorrowFocus(inputs)
  const lines = [
    'Fokus besok:',
    '',
    focus.action.charAt(0).toUpperCase() + focus.action.slice(1) + '.',
    '',
    'Alasan:',
    '',
    ...focus.reasons.map((reason) => `- ${reason}`),
    '',
  ]

  if (hasLateWorkContext(date)) {
    lines.push('Hari ini sudah cukup panjang.', 'Cukup simpan ini sebagai prioritas besok.')
  } else {
    lines.push('Satu langkah kecil lebih baik daripada banyak rencana.')
  }

  return lines.join('\n')
}

export function buildWorkspaceStatus(inputs = {}, date = new Date()) {
  const stats = getWorkspaceStats(inputs)
  const lines = [
    'Status Workspace',
    '',
    'Tasks:',
    `${stats.completedTasks.length} selesai`,
    `${stats.activeTasks.length} aktif`,
    '',
    'Leads:',
    `${stats.activeLeads.length} prospek`,
    '',
    'Content:',
    `${stats.draftContent.length} draft`,
    `${stats.publishedContent.length} published`,
    '',
    'Memory:',
    `${stats.storedMemories.length} catatan tersimpan`,
    '',
  ]

  if (hasLateWorkContext(date)) {
    lines.push('Tidak ada risiko kritis yang perlu dikerjakan malam ini.')
  } else {
    lines.push(stats.activeTasks.length > 5 ? 'Risiko utama: task aktif mulai menumpuk.' : 'Tidak ada risiko kritis saat ini.')
  }

  return lines.join('\n')
}

export function buildDailyBriefingCards(inputs = {}) {
  const stats = getWorkspaceStats(inputs)
  const focus = chooseTomorrowFocus(inputs)

  return [
    {
      id: 'summary',
      title: 'Ringkas Hari Ini',
      value: `${stats.completedTasks.length} selesai`,
      detail: `${stats.draftContent.length} draft, ${stats.activeLeads.length} prospek`,
      command: 'Ringkas hari ini',
    },
    {
      id: 'tomorrow',
      title: 'Fokus Besok',
      value: focus.title,
      detail: focus.reasons[0],
      command: 'Fokus besok',
    },
    {
      id: 'workspace',
      title: 'Workspace Status',
      value: `${stats.activeTasks.length} aktif`,
      detail: `${stats.storedMemories.length} memory tersimpan`,
      command: 'Status workspace',
    },
  ]
}

export function getDailyBriefingCommand(text = '') {
  const normalized = text.toLowerCase().trim()

  if (/\bringkas\s+hari\s+ini\b/.test(normalized)) return 'today_summary'
  if (/\baku\s+ketinggalan\s+apa\b|\bketinggalan\s+apa\b/.test(normalized)) return 'missed'
  if (/\bfokus\s+besok\b|\bprioritas\s+besok\b/.test(normalized)) return 'tomorrow_focus'
  if (/\bstatus\s+workspace\b|\bworkspace\s+status\b/.test(normalized)) return 'workspace_status'

  return ''
}

export function buildDailyBriefingCommandResponse(command, inputs = {}, date = new Date()) {
  if (command === 'today_summary') return buildTodaySummary(inputs, date)
  if (command === 'missed') return buildMissedSummary(inputs, date)
  if (command === 'tomorrow_focus') return buildTomorrowFocus(inputs, date)
  if (command === 'workspace_status') return buildWorkspaceStatus(inputs, date)

  return ''
}
