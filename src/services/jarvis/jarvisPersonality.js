export const JAKARTA_TIME_ZONE = 'Asia/Jakarta'

export const JARVIS_PERSONALITY = {
  name: 'Jarvis',
  identity: 'trusted companion, second brain, calm advisor',
  principle: 'User talks to Jarvis. Jarvis talks to data.',
  tone: 'natural Indonesian, short, warm, never bossy',
}

const TIME_WINDOWS = [
  {
    id: 'morning',
    start: 5,
    end: 10,
    greeting: 'Selamat pagi.',
    prompts: [
      'Hari ini ada yang ingin kamu fokuskan?',
      'Mau aku bantu memilih prioritas hari ini?',
    ],
  },
  {
    id: 'midday',
    start: 10,
    end: 16,
    greeting: 'Bagaimana progress hari ini?',
    prompts: [
      'Ada keputusan yang perlu dipikirkan?',
      'Mau lanjut yang sedang dikerjakan atau cek hal lain?',
    ],
  },
  {
    id: 'late_day',
    start: 16,
    end: 19,
    greeting: 'Hari ini sudah cukup jauh berjalan.',
    prompts: [
      'Mau aku bantu merangkum apa yang sudah selesai?',
      'Ada yang perlu ditindaklanjuti sebelum hari berakhir?',
    ],
  },
  {
    id: 'night',
    start: 19,
    end: 23,
    greeting: 'Selamat malam.',
    prompts: [
      'Ada yang ingin direncanakan untuk besok?',
      'Kalau sudah selesai hari ini, istirahat juga penting.',
    ],
  },
  {
    id: 'late_night',
    start: 23,
    end: 5,
    greeting: 'Masih bangun?',
    prompts: [
      'Kalau ada ide, aku bisa menyimpannya untuk besok.',
      'Jangan terlalu malam ya.',
    ],
  },
]

export function getJakartaHour(date = new Date()) {
  return Number(new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    hourCycle: 'h23',
    timeZone: JAKARTA_TIME_ZONE,
  }).format(date))
}

export function getJarvisTimeWindow(date = new Date()) {
  const hour = getJakartaHour(date)

  return TIME_WINDOWS.find((window) => {
    if (window.start < window.end) return hour >= window.start && hour < window.end
    return hour >= window.start || hour < window.end
  }) || TIME_WINDOWS[1]
}

export function formatJarvisGreeting(profile, date = new Date()) {
  const window = getJarvisTimeWindow(date)
  const name = profile?.name ? ` ${profile.name}` : ''
  const greeting = window.greeting.replace(/\.$/, '')

  return name ? `${greeting},${name}.` : window.greeting
}

export function getJarvisPrompt(date = new Date()) {
  const window = getJarvisTimeWindow(date)
  return window.prompts[0]
}

export function getJarvisOpeningMessage(profile, profileCompleted, date = new Date()) {
  const window = getJarvisTimeWindow(date)
  const greeting = profileCompleted ? formatJarvisGreeting(profile, date) : window.greeting

  return [
    greeting,
    '',
    window.prompts[0],
  ].join('\n')
}

export function isLateWorkWindow(date = new Date()) {
  return ['night', 'late_night'].includes(getJarvisTimeWindow(date).id)
}

export function softenRecommendation(text, date = new Date()) {
  if (!isLateWorkWindow(date)) return text

  return [
    'Hari ini sudah cukup panjang.',
    '',
    text,
    '',
    'Kalau energimu sudah turun, aku bisa siapkan ini untuk besok.',
  ].join('\n')
}
