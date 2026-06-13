import { buildDailyGreeting, buildUserContext } from './personalizationService'

const CONTENT_TERMS = ['ai branding', 'branding', 'konten', 'content', 'instagram', 'youtube', 'caption', 'thread']
const AUTOMATION_TERMS = ['repetitive', 'repetitif', 'workflow', 'otomasi', 'automation', 'whatsapp', 'template', 'sop']

export function getMemoryValue(memories = [], keys, fallback = '') {
  const lookupKeys = Array.isArray(keys) ? keys : [keys]
  const normalizedKeys = lookupKeys.map((key) => key.toLowerCase())

  return memories.find((memory) => normalizedKeys.includes(memory.key?.toLowerCase()))?.value || fallback
}

export function getUserName(memories = []) {
  return getMemoryValue(memories, ['name', 'nama', 'user_name', 'username'], '')
}

function includesTerm(text, terms) {
  const normalized = text.toLowerCase()
  return terms.some((term) => normalized.includes(term))
}

function asSentence(text = '') {
  return text.endsWith('.') ? text : `${text}.`
}

export function getGoalSupport(task = {}, memories = []) {
  const goal = getMemoryValue(memories, 'goal', '')
  const taskText = `${task.title || ''} ${task.category || ''}`.toLowerCase()
  const goalText = goal.toLowerCase()

  if (!goal) return null

  if (includesTerm(`${taskText} ${goalText}`, CONTENT_TERMS)) {
    return {
      label: 'Supports Goal',
      message: 'Task ini mendukung goal AI Branding.',
    }
  }

  if (includesTerm(`${taskText} ${goalText}`, AUTOMATION_TERMS)) {
    return {
      label: 'Supports Goal',
      message: 'Task ini mendukung tujuan mengurangi pekerjaan repetitif.',
    }
  }

  return null
}

export function getActiveTasks(tasks = []) {
  return tasks.filter((task) => task.status !== 'completed')
}

export function buildNexusScore(tasks = []) {
  const total = tasks.length
  const completed = tasks.filter((task) => task.status === 'completed').length
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0

  const message = percentage === 100 && total > 0
    ? '🏆 Semua tugas selesai.'
    : percentage >= 80
    ? '🔥 Produktif hari ini.'
    : percentage >= 50
    ? '⚡ Progres bagus.'
    : '🚀 Masih ada peluang menyelesaikan tugas hari ini.'

  return {
    completed,
    total,
    percentage,
    message,
  }
}

function getDueDateSortValue(task) {
  return task.dueDate || '9999-12-31'
}

function isContentTask(task = {}) {
  return task.category === 'content' || includesTerm(task.title || '', ['konten', 'content', 'instagram', 'youtube'])
}

function isFollowUpTask(task = {}) {
  return task.category === 'work' || includesTerm(task.title || '', ['follow up', 'followup', 'lead', 'client', 'sarah'])
}

function getPriorityReason(priorities) {
  const first = priorities[0]
  const hasContent = priorities.some(isContentTask)

  if (hasContent) return 'Konten membutuhkan waktu fokus lebih panjang.'
  if (first?.priority === 'high') return 'Prioritas tinggi perlu diselesaikan lebih awal agar tidak tertunda.'
  if (isFollowUpTask(first)) return 'Follow up lebih dulu menjaga pipeline tetap bergerak.'
  if (first?.dueDate) return 'Tugas dengan jadwal terdekat perlu diamankan lebih dulu.'

  return 'Mulai dari dua tugas utama agar ritme kerja hari ini jelas.'
}

export function getPriorityTasks(tasks = []) {
  return getActiveTasks(tasks)
    .slice()
    .sort((a, b) => {
      const dueDateDiff = getDueDateSortValue(a).localeCompare(getDueDateSortValue(b))
      if (dueDateDiff !== 0) return dueDateDiff

      const priorityScore = { high: 0, medium: 1, low: 2 }
      const priorityDiff = (priorityScore[a.priority] ?? 1) - (priorityScore[b.priority] ?? 1)
      if (priorityDiff !== 0) return priorityDiff

      return (a.dueTime || '99:99').localeCompare(b.dueTime || '99:99')
    })
}

export function buildPriorityCoach(tasks = []) {
  const priorities = getPriorityTasks(tasks).slice(0, 2)

  if (priorities.length === 0) {
    return {
      priorities,
      reason: 'Pilih satu target kecil untuk memulai hari.',
      text: 'Belum ada tugas aktif. Pilih satu target kecil untuk memulai hari.',
    }
  }

  const reason = getPriorityReason(priorities)

  return {
    priorities,
    reason,
    text: [
      'Prioritas utama hari ini:',
      '',
      ...priorities.map((task, index) => `${index + 1}. ${task.title}`),
      '',
      'Alasan:',
      '',
      reason,
    ].join('\n'),
  }
}

export function buildMorningBriefing(tasks = [], memories = [], profile) {
  const userContext = buildUserContext(profile)
  const greeting = buildDailyGreeting(profile)
  const activeTasks = getActiveTasks(tasks)
  const highPriorityTasks = activeTasks.filter((task) => task.priority === 'high')
  const reminders = activeTasks.filter((task) => task.dueTime)
  const focusTask = getPriorityTasks(tasks)[0]

  console.info('[Nexus Personalization]\nBriefing Generated')

  if (!profile || profile.isFallback) {
    return [
      userContext.greeting,
      '',
      userContext.recommendation,
    ].join('\n')
  }

  if (tasks.length === 0) {
    return [
      asSentence(greeting),
      '',
      'Belum ada tugas aktif.',
      '',
      userContext.recommendation,
    ].join('\n')
  }

  if (activeTasks.length === 0) {
    return [
      asSentence(greeting),
      '',
      'Semua tugas aktif sudah selesai.',
      '',
      'Bagus. Kamu bisa review hasil hari ini atau susun target berikutnya.',
    ].join('\n')
  }

  const recommendation = focusTask?.category === 'content'
    ? 'Selesaikan sebelum pukul 12.00.'
    : focusTask?.dueTime
    ? `Selesaikan sebelum pukul ${focusTask.dueTime}.`
    : 'Ambil satu slot fokus pertama untuk menyelesaikannya.'

  return [
    asSentence(greeting),
    '',
    'Role:',
    userContext.role || '-',
    '',
    'Project:',
    userContext.project || '-',
    '',
    'Focus:',
    userContext.focus || '-',
    '',
    'Hari ini ada:',
    `• ${activeTasks.length} tugas aktif`,
    `• ${highPriorityTasks.length} prioritas tinggi`,
    `• ${reminders.length} reminder`,
    '',
    'Fokus utama:',
    focusTask?.title || 'Review prioritas hari ini.',
    '',
    'Rekomendasi:',
    recommendation,
  ].join('\n')
}

export function buildTaskCompletionMessage(task, tasks = [], memories = [], profile) {
  const name = profile?.name || ''
  const completedBefore = tasks.filter((item) => item.status === 'completed').length
  const completedAfter = task.status === 'completed' ? completedBefore : completedBefore + 1

  return [
    name ? `Bagus ${name}.` : 'Bagus.',
    '',
    `Tugas "${task.title}"`,
    'telah diselesaikan.',
    '',
    'Progress hari ini:',
    `${completedAfter} dari ${tasks.length} tugas selesai.`,
  ].join('\n')
}
