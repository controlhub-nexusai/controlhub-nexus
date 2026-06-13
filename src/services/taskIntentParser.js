const TASK_INTENT_PATTERNS = [
  /\btask\b/i,
  /\btugas\b/i,
  /\bingatkan\b/i,
  /\breminder\b/i,
  /\bbesok\b/i,
  /\bhari ini\b/i,
  /\bfollow up\b/i,
  /\bhubungi\b/i,
  /\bbuat(?:kan)?\b/i,
  /\breview\b/i,
]

const WORK_CATEGORY_PATTERNS = [
  /\blead\b/i,
  /\bcustomer\b/i,
  /\bfollow up\b/i,
  /\bhubungi\b/i,
  /\bclient\b/i,
]

const CONTENT_CATEGORY_PATTERNS = [
  /\bkonten\b/i,
  /\binstagram\b/i,
  /\big\b/i,
  /\bx\b/i,
  /\blinkedin\b/i,
  /\bcaption\b/i,
  /\bthread\b/i,
]

const YOUTUBE_CATEGORY_PATTERNS = [
  /\byoutube\b/i,
  /\bvideo\b/i,
  /\bscript\b/i,
]

function matchesAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(text))
}

function detectCategory(message) {
  if (matchesAny(message, WORK_CATEGORY_PATTERNS)) return 'work'
  if (matchesAny(message, CONTENT_CATEGORY_PATTERNS)) return 'content'
  if (matchesAny(message, YOUTUBE_CATEGORY_PATTERNS)) return 'youtube'

  return 'personal'
}

function detectPriority(message) {
  if (/\b(urgent|penting|prioritas|asap)\b/i.test(message)) return 'high'
  if (/\b(santai|low priority|nanti aja)\b/i.test(message)) return 'low'

  return 'medium'
}

function cleanTaskTitle(message) {
  const title = message
    .trim()
    .replace(/^(tolong\s+)?(buat(?:kan)?|bikin)\s+/i, '')
    .replace(/^(tolong\s+)?ingatkan(?:\s+saya)?\s+/i, '')
    .replace(/^(tolong\s+)?reminder\s+/i, '')
    .replace(/\b(besok|hari ini|malam ini|pagi ini|siang ini|sore ini)\b/gi, '')
    .replace(/\bjam\s+\d{1,2}([.:]\d{2})?\b/gi, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.!?])/g, '$1')
    .trim()

  const fallbackTitle = message.trim()
  const finalTitle = title || fallbackTitle

  return finalTitle.charAt(0).toUpperCase() + finalTitle.slice(1)
}

export function parseTaskIntent(message) {
  if (!message || !matchesAny(message, TASK_INTENT_PATTERNS)) return null

  return {
    title: cleanTaskTitle(message),
    category: detectCategory(message),
    status: 'pending',
    priority: detectPriority(message),
  }
}

export const parseTaskFromMessage = parseTaskIntent
