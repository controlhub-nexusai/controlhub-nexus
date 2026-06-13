export const COMMAND_INTENTS = {
  TASK_CREATE: 'CREATE_TASK',
  LEAD_CREATE: 'CREATE_LEAD',
  CONTENT_CREATE: 'CREATE_CONTENT',
  TASK_SUMMARY: 'SHOW_TASK_SUMMARY',
  PRIORITY_CHECK: 'SHOW_PRIORITY',
  REMINDER_SUMMARY: 'SHOW_REMINDERS',
  DAILY_PLAN: 'GENERATE_DAILY_PLAN',
  DAILY_REVIEW: 'GENERATE_DAILY_REVIEW',
  WEEKLY_REVIEW: 'GENERATE_WEEKLY_REVIEW',
  FOCUS_MODE: 'START_FOCUS_MODE',
  CLARIFY: 'CLARIFY',
  CHAT: 'CHAT',
}

const CONTENT_PLATFORM_PATTERNS = [
  { platform: 'Instagram', pattern: /\b(instagram|ig)\b/i },
  { platform: 'X', pattern: /\bx\b/i },
  { platform: 'YouTube', pattern: /\b(youtube|yt|video)\b/i },
  { platform: 'WhatsApp', pattern: /\b(whatsapp|wa)\b/i },
  { platform: 'LinkedIn', pattern: /\blinkedin\b/i },
]

const TASK_PATTERNS = [
  /\bfollow\s*up\b/i,
  /\bfollowup\b/i,
  /\bhubungi\b/i,
  /\btelepon\b/i,
  /\bmeeting\b/i,
  /\brapat\b/i,
  /\bgym\b/i,
  /\bolahraga\b/i,
  /\bjadwal\b/i,
  /\breminder\b/i,
  /\bingatkan\b/i,
  /\bbesok\b/i,
  /\bhari ini\b/i,
  /\bjam\b/i,
  /\btask\b/i,
  /\btugas\b/i,
]

const LEAD_PATTERNS = [
  /\btambah\s+lead\b/i,
  /\blead baru\b/i,
  /\bclient\b/i,
  /\bcustomer\b/i,
  /\brumah sakit\b/i,
  /\btertarik\b/i,
  /\bminta demo\b/i,
  /\bmau demo\b/i,
]

const CONTENT_PATTERNS = [
  /\bide konten\b/i,
  /\bcaption\b/i,
  /\bthread\b/i,
  /\boutline\b/i,
  /\bbroadcast\b/i,
  /\bpost(?:ing)?\b/i,
  /\bbuat(?:kan)?\s+konten\b/i,
  /\b(youtube|yt|instagram|ig|whatsapp|wa|twitter)\b/i,
]

const WORK_CATEGORY_PATTERNS = [
  /\blead\b/i,
  /\bcustomer\b/i,
  /\bfollow up\b/i,
  /\bfollowup\b/i,
  /\bhubungi\b/i,
  /\bclient\b/i,
  /\bmeeting\b/i,
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

function matchesAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(text))
}

function capitalizeTitle(title) {
  if (!title) return title
  return title.charAt(0).toUpperCase() + title.slice(1)
}

function getJakartaDate(offsetDays = 0) {
  const now = new Date()
  const jakartaDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }))
  jakartaDate.setDate(jakartaDate.getDate() + offsetDays)

  const year = jakartaDate.getFullYear()
  const month = String(jakartaDate.getMonth() + 1).padStart(2, '0')
  const day = String(jakartaDate.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function detectDueDate(message) {
  if (/\bbesok\b/i.test(message)) {
    return {
      dueDate: 'tomorrow',
      due_date: getJakartaDate(1),
    }
  }

  if (/\bhari ini\b/i.test(message)) {
    return {
      dueDate: 'today',
      due_date: getJakartaDate(0),
    }
  }

  return {
    dueDate: undefined,
    due_date: undefined,
  }
}

function normalizeHour(hour, period) {
  let normalizedHour = Number(hour)
  const normalizedPeriod = period?.toLowerCase()

  if ((normalizedPeriod === 'malam' || normalizedPeriod === 'sore') && normalizedHour < 12) normalizedHour += 12
  if (normalizedPeriod === 'siang' && normalizedHour < 11) normalizedHour += 12
  if (normalizedPeriod === 'pagi' && normalizedHour === 12) normalizedHour = 0

  return normalizedHour
}

function detectDueTime(message) {
  const match = message.match(/\bjam\s*(\d{1,2})(?:[.:](\d{2}))?\s*(pagi|siang|sore|malam)?\b/i)
  if (!match) return undefined

  const [, hour, minute = '00', period] = match
  const normalizedHour = normalizeHour(hour, period)
  if (normalizedHour > 23 || Number(minute) > 59) return undefined

  return `${String(normalizedHour).padStart(2, '0')}:${minute}`
}

function detectCategory(message) {
  if (matchesAny(message, WORK_CATEGORY_PATTERNS)) return 'work'
  if (matchesAny(message, CONTENT_CATEGORY_PATTERNS)) return 'content'
  if (/\byoutube|video|script\b/i.test(message)) return 'youtube'

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
    .replace(/^(tolong\s+)?(buat(?:kan)?|bikin)\s+(task|tugas)\s+/i, '')
    .replace(/^(tolong\s+)?(buat(?:kan)?|bikin)\s+/i, '')
    .replace(/^(tolong\s+)?jadwalkan\s+/i, '')
    .replace(/^(tolong\s+)?ingatkan(?:\s+saya)?\s+/i, '')
    .replace(/^(tolong\s+)?reminder\s+/i, '')
    .replace(/\b(besok|hari ini|malam ini|pagi ini|siang ini|sore ini)\b/gi, '')
    .replace(/\bjam\s*\d{1,2}(?:[.:]\d{2})?\s*(pagi|siang|sore|malam)?\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()

  return capitalizeTitle(title || message.trim())
}

function detectPlatform(message) {
  return CONTENT_PLATFORM_PATTERNS.find((item) => item.pattern.test(message))?.platform || 'Instagram'
}

function cleanContentText(message) {
  return message
    .trim()
    .replace(/^(tolong\s+)?buat(?:kan)?\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function detectContentFormat(message) {
  if (/\bcaption\b/i.test(message)) return 'caption'
  if (/\bthread\b/i.test(message)) return 'thread'
  if (/\boutline|youtube|yt|video\b/i.test(message)) return 'video'
  if (/\bbroadcast|whatsapp|wa\b/i.test(message)) return 'broadcast'

  return 'post'
}

function extractContentTopic(message) {
  const topicMatch = message.match(/\btentang\s+(.+)$/i)
  return topicMatch?.[1]?.trim() || cleanContentText(message)
}

function titleizeContentTopic(topic) {
  return capitalizeTitle(
    topic
      .replace(/\bAI CS\b/i, 'AI untuk Customer Service')
      .replace(/\bAI customer service\b/i, 'AI untuk Customer Service')
      .replace(/\s+/g, ' ')
      .trim()
  )
}

function extractLeadName(message) {
  return message
    .trim()
    .replace(/^(tolong\s+)?tambah\s+lead\s+/i, '')
    .replace(/^lead baru\s+/i, '')
    .replace(/\b(namanya|nama)\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function detectLeadSource(message) {
  if (/\binstagram|ig\b/i.test(message)) return 'Instagram'
  if (/\bx\b/i.test(message)) return 'X'
  if (/\blinkedin\b/i.test(message)) return 'LinkedIn'
  if (/\byoutube\b/i.test(message)) return 'YouTube'

  return 'Manual'
}

function detectLeadStatus(message) {
  if (/\b(tertarik|minta demo|mau demo|interested)\b/i.test(message)) return 'interested'
  if (/\bproposal\b/i.test(message)) return 'proposal'
  if (/\bwon|deal|closing\b/i.test(message)) return 'won'
  if (/\blost|batal\b/i.test(message)) return 'lost'
  if (/\bcontacted|sudah dihubungi\b/i.test(message)) return 'contacted'

  return 'new'
}

function hasScheduleSignal(message) {
  return /\b(besok|hari ini|jam|jadwal|reminder|ingatkan)\b/i.test(message)
}

function isPriorityCheck(message) {
  return /\b(apa|cek|lihat|tampilkan)\b/i.test(message)
    && /\b(prioritas|fokus)\b/i.test(message)
}

function isTaskSummary(message) {
  return (
    /\b(berapa|jumlah|summary|ringkasan|ringkas)\b/i.test(message)
      && /\b(task|tugas)\b/i.test(message)
  ) || (
    /\b(ada|lihat|cek|apa|reminder)\b/i.test(message)
      && /\b(reminder|pengingat|jadwal)\b/i.test(message)
  )
}

function isDailyPlanRequest(message) {
  return (
    /\brencanakan\s+hari\s+ini\b/i.test(message)
    || (
      /\b(buat|bikin|susun)\b/i.test(message)
      && /\b(plan|rencana)\b/i.test(message)
      && /\b(hari ini|today)\b/i.test(message)
    )
  )
}

function isDailyReviewRequest(message) {
  return /\b(review|rekap)\s+hari\s+ini\b/i.test(message)
    || /\bapa\s+progress\s+saya\s+hari\s+ini\b/i.test(message)
}

function isWeeklyReviewRequest(message) {
  return /\b(review|rekap|progress)\s+minggu\s+ini\b/i.test(message)
    || /\bweekly\s+review\b/i.test(message)
}

function isFocusModeRequest(message) {
  return /\bapa\s+fokus\s+saya\s+hari\s+ini\b/i.test(message)
    || /\bstart\s+focus\s+mode\b/i.test(message)
    || /\bfocus\s+mode\b/i.test(message)
    || /\bfokus\s+hari\s+ini\b/i.test(message)
}

function isLeadCreate(message) {
  return matchesAny(message, LEAD_PATTERNS)
}

function isContentCreate(message) {
  return matchesAny(message, CONTENT_PATTERNS) && !hasScheduleSignal(message)
}

function isTaskCreate(message) {
  return matchesAny(message, TASK_PATTERNS)
    || (/\bbuat(?:kan)?\b/i.test(message) && hasScheduleSignal(message))
}

export function parseCommand(message) {
  const text = message?.trim() || ''

  if (!text) {
    return {
      intent: COMMAND_INTENTS.CHAT,
      payload: {},
      originalText: text,
    }
  }

  if (isFocusModeRequest(text)) {
    return {
      intent: COMMAND_INTENTS.FOCUS_MODE,
      payload: {
        query: text,
      },
      originalText: text,
    }
  }

  if (isPriorityCheck(text)) {
    return {
      intent: COMMAND_INTENTS.PRIORITY_CHECK,
      payload: {},
      originalText: text,
    }
  }

  if (isDailyPlanRequest(text)) {
    return {
      intent: COMMAND_INTENTS.DAILY_PLAN,
      payload: {
        query: text,
      },
      originalText: text,
    }
  }

  if (isDailyReviewRequest(text)) {
    return {
      intent: COMMAND_INTENTS.DAILY_REVIEW,
      payload: {
        query: text,
      },
      originalText: text,
    }
  }

  if (isWeeklyReviewRequest(text)) {
    return {
      intent: COMMAND_INTENTS.WEEKLY_REVIEW,
      payload: {
        query: text,
      },
      originalText: text,
    }
  }

  if (isTaskSummary(text)) {
    return {
      intent: /\b(reminder|pengingat|jadwal)\b/i.test(text)
        ? COMMAND_INTENTS.REMINDER_SUMMARY
        : COMMAND_INTENTS.TASK_SUMMARY,
      payload: {
        query: text,
      },
      originalText: text,
    }
  }

  if (isLeadCreate(text)) {
    return {
      intent: COMMAND_INTENTS.LEAD_CREATE,
      payload: {
        name: capitalizeTitle(extractLeadName(text)),
        source: detectLeadSource(text),
        status: detectLeadStatus(text),
        notes: text,
      },
      originalText: text,
    }
  }

  if (isContentCreate(text)) {
    const topic = extractContentTopic(text)

    return {
      intent: COMMAND_INTENTS.CONTENT_CREATE,
      payload: {
        platform: detectPlatform(text),
        title: titleizeContentTopic(topic),
        topic: titleizeContentTopic(topic),
        format: detectContentFormat(text),
        status: 'draft',
        prompt: text,
        notes: text,
      },
      originalText: text,
    }
  }

  if (isTaskCreate(text)) {
    const due = detectDueDate(text)
    const dueTime = detectDueTime(text)

    return {
      intent: COMMAND_INTENTS.TASK_CREATE,
      payload: {
        title: cleanTaskTitle(text),
        category: detectCategory(text),
        status: 'pending',
        priority: detectPriority(text),
        dueDate: due.dueDate,
        due_date: due.due_date,
        dueTime,
        due_time: dueTime,
      },
      originalText: text,
    }
  }

  return {
    intent: COMMAND_INTENTS.CLARIFY,
    payload: {
      needsClarification: true,
      message: 'Nexus belum yakin maksudnya. Mau saya buat sebagai task, lead, atau konten?',
    },
    originalText: text,
  }
}
