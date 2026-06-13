export { parseTaskFromMessage, parseTaskIntent } from './taskIntentParser.js'

function capitalizeTitle(title) {
  if (!title) return title
  return title.charAt(0).toUpperCase() + title.slice(1)
}

function extractDueDate(message) {
  if (/\bbesok\b/i.test(message)) return 'tomorrow'
  if (/\bhari ini\b/i.test(message)) return 'today'

  return undefined
}

function normalizeHour(hour, period) {
  let normalizedHour = Number(hour)
  const normalizedPeriod = period?.toLowerCase()

  if (normalizedPeriod === 'malam' && normalizedHour < 12) {
    normalizedHour += 12
  }

  if (normalizedPeriod === 'sore' && normalizedHour < 12) {
    normalizedHour += 12
  }

  if (normalizedPeriod === 'siang' && normalizedHour < 11) {
    normalizedHour += 12
  }

  if (normalizedPeriod === 'pagi' && normalizedHour === 12) {
    normalizedHour = 0
  }

  return normalizedHour
}

function extractDueTime(message) {
  const match = message.match(/\bjam\s+(\d{1,2})(?:[.:](\d{2}))?\s*(pagi|siang|sore|malam)?\b/i)
  if (!match) return undefined

  const [, hour, minute = '00', period] = match
  const normalizedHour = normalizeHour(hour, period)

  return `${String(normalizedHour).padStart(2, '0')}:${minute}`
}

function extractTitle(message) {
  const title = message
    .trim()
    .replace(/\b(besok|hari ini)\b/gi, '')
    .replace(/\bjam\s+\d{1,2}(?:[.:]\d{2})?\s*(pagi|siang|sore|malam)?\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()

  return capitalizeTitle(title || message.trim())
}

export function extractTask(message) {
  return {
    title: extractTitle(message),
    dueDate: extractDueDate(message),
    dueTime: extractDueTime(message),
  }
}
