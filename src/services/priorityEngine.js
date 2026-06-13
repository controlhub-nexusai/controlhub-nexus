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

function includesAny(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword))
}

export function calculatePriority(task = {}) {
  const today = getTodayKey()
  const title = normalizeText(task.title)
  const category = normalizeText(task.category)
  const combinedText = `${title} ${category}`

  if (task.dueDate && task.dueDate < today) return 'HIGH'
  if (task.dueDate && task.dueDate === today) return 'HIGH'
  if (includesAny(combinedText, [
    'follow up',
    'follow-up',
    'followup',
    'lead',
    'sales',
    'customer',
    'client',
    'cs',
    'support',
    'proposal',
    'deal',
    'invoice',
  ])) return 'HIGH'

  if (includesAny(combinedText, [
    'content review',
    'review content',
    'approval',
    'approve',
    'planning',
    'plan',
    'documentation',
    'document',
    'docs',
  ])) return 'MEDIUM'

  if (includesAny(combinedText, [
    'note',
    'notes',
    'organize',
    'organization',
    'cleanup',
    'profile',
    'update profile',
    'optional',
  ])) return 'LOW'

  const storedPriority = String(task.priority || '').toUpperCase()
  return ['HIGH', 'MEDIUM', 'LOW'].includes(storedPriority) ? storedPriority : 'LOW'
}
