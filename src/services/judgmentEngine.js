function getJakartaHour(date = new Date()) {
  return Number(new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    hourCycle: 'h23',
    timeZone: 'Asia/Jakarta',
  }).format(date))
}

function normalizeText(text = '') {
  return text.toLowerCase().trim()
}

function getActiveTasks(tasks = []) {
  return tasks.filter((task) => String(task.status || '').toLowerCase() !== 'completed')
}

function getDraftContent(content = []) {
  return content.find((item) => ['draft', 'drafted', 'idea', 'pending'].includes(String(item.status || '').toLowerCase()))
}

function getActiveLead(leads = []) {
  return leads.find((lead) => !['won', 'lost', 'closed'].includes(String(lead.status || '').toLowerCase()))
}

function chooseCurrentPriority({ tasks = [], leads = [], content = [] } = {}) {
  const draft = getDraftContent(content)
  if (draft) return `lanjutkan draft ${draft.platform || 'konten'}${draft.title ? ` "${draft.title}"` : ''}`

  const lead = getActiveLead(leads)
  if (lead) return `follow up ${lead.name || lead.company || 'prospek utama'}`

  const task = getActiveTasks(tasks)[0]
  if (task) return `selesaikan "${task.title}"`

  return 'tentukan satu prioritas kecil untuk hari ini'
}

function parseMemoryValue(memory = {}) {
  if (!memory?.value || typeof memory.value !== 'string') return memory?.value

  try {
    return JSON.parse(memory.value)
  } catch {
    return memory.value
  }
}

function getMemoryConfidence({ memories = [] } = {}) {
  const meaningfulMemories = memories.filter((memory) => !memory.isFallback)
  const hasDefaultContext = memories.some((memory) =>
    ['goal', 'project', 'challenge', 'momentum', 'profile'].includes(memory.type)
  )
  const hasJourneyMemory = memories.some((memory) =>
    ['challenge', 'momentum', 'win', 'milestone'].includes(memory.type)
  )

  if (meaningfulMemories.length >= 5 || hasJourneyMemory) return 'HIGH'
  if (meaningfulMemories.length >= 2 || hasDefaultContext) return 'MEDIUM'
  return 'LOW'
}

function getMemoryPatterns({ memories = [] } = {}) {
  const challenges = memories
    .filter((memory) => memory.type === 'challenge')
    .map(parseMemoryValue)
    .filter(Boolean)
  const latestChallenge = challenges[challenges.length - 1]

  return {
    activeGoal: memories.find((memory) => memory.type === 'goal')?.value || 'membangun Nexus, AI branding, dan mengurangi kerja repetitif',
    currentProject: memories.find((memory) => memory.type === 'project')?.value || 'ControlHub Nexus AI',
    recurringPattern: latestChallenge?.challenge || 'terlalu banyak konteks berjalan bersamaan membuat fokus dan momentum lebih mudah pecah',
    friction: latestChallenge?.summary || 'Nexus, branding AI, pekerjaan CS/Leadgen, konten, dan ide baru sering berebut perhatian',
    strength: 'Kamu kuat dalam melihat peluang baru dan cepat mengubah ide menjadi arah produk',
  }
}

function isFeatureCreepRequest(text = '') {
  return /\b(tambah|buat|bikin|add)\b/i.test(text)
    && /\b(10|banyak|semua|fitur|features?|menu|dashboard|modul|module)\b/i.test(text)
}

function isNewAppRequest(text = '') {
  return /\b(mau|ingin|pengen|buat|bikin|bangun|mulai)\b/i.test(text)
    && /\b(aplikasi|app|apps|produk baru|project baru|proyek baru|saas baru)\b/i.test(text)
}

function isTooManyIdeasRequest(text = '') {
  return /\b(10 ide|banyak ide|semua ide|daftar ide|ide sebanyak|brainstorm)\b/i.test(text)
}

function isConfused(text = '') {
  return /\b(saya|aku)?\s*(bingung|overwhelm|kebanyakan|pusing|tidak tahu mulai dari mana|gatau mulai dari mana)\b/i.test(text)
}

function isTired(text = '') {
  return /\b(capek|lelah|ngantuk|burnout|habis energi|cape)\b/i.test(text)
}

function isHeavyLateWork(text = '', hour) {
  return hour >= 21
    && /\b(kerjakan|lanjut|tambah|buat|bikin|bangun|develop|coding|fitur|semua)\b/i.test(text)
}

export function evaluateJudgment(message = '', context = {}, date = new Date()) {
  const text = normalizeText(message)
  if (!text) return null

  const hour = getJakartaHour(date)
  const priority = chooseCurrentPriority(context)
  const memoryConfidence = getMemoryConfidence(context)
  const patterns = getMemoryPatterns(context)

  if (isTired(text)) {
    const reflection = memoryConfidence === 'LOW'
      ? 'Saya belum mau menebak terlalu jauh, tapi rasa capek seperti ini biasanya muncul saat beban konteks mulai terlalu banyak.'
      : `Dari pola yang saya lihat, rasa capekmu sering muncul saat ${patterns.recurringPattern}.`

    return {
      type: 'energy',
      memoryConfidence,
      response: [
        reflection,
        '',
        'Pekerjaan CS, pengembangan Nexus, branding AI, dan ide baru sering berebut perhatian.',
        '',
        'Saran saya malam ini jangan buka target baru dulu. Pilih satu hal kecil yang bisa ditutup, atau lanjutkan besok.',
        '',
        'Apa yang paling menguras energimu hari ini?',
      ].join('\n'),
    }
  }

  if (isHeavyLateWork(text, hour)) {
    return {
      type: 'late_work',
      response: [
        'Saya tidak menyarankan kerja berat malam ini.',
        '',
        `Cukup simpan prioritas besok: ${priority}.`,
      ].join('\n'),
    }
  }

  if (isFeatureCreepRequest(text)) {
    return {
      type: 'feature_creep',
      response: [
        'Saya tidak menyarankan itu.',
        '',
        'Masalah terbesar saat ini bukan kurang fitur, tetapi menjaga fokus dan konsistensi identitas Nexus.',
        `Langkah yang lebih tepat: ${priority}.`,
      ].join('\n'),
    }
  }

  if (isNewAppRequest(text)) {
    return {
      type: 'new_app_discovery',
      memoryConfidence,
      response: [
        'Saya tidak akan langsung menolak aplikasi baru.',
        '',
        `${patterns.strength}.`,
        '',
        `Tapi pola yang saya lihat, momentum sering melambat saat fokus terbagi sebelum ${patterns.currentProject} cukup matang.`,
        '',
        'Sebelum kita buka proyek baru, saya ingin tahu dulu:',
        '',
        'Apa masalah yang ingin kamu selesaikan dengan aplikasi itu?',
      ].join('\n'),
    }
  }

  if (isTooManyIdeasRequest(text)) {
    return {
      type: 'too_many_options',
      memoryConfidence,
      response: [
        'Ya, saya melihat pola itu.',
        '',
        'Tapi itu bukan kelemahan utama. Ide adalah kekuatanmu.',
        '',
        `Yang perlu kita jaga adalah agar ide terbaik tidak kalah oleh ide baru. Untuk sekarang, saya tetap memilih ${priority}.`,
      ].join('\n'),
    }
  }

  if (isConfused(text)) {
    const reflection = memoryConfidence === 'LOW'
      ? 'Saya belum punya cukup konteks baru untuk menilai terlalu jauh, tapi kebingungan biasanya muncul saat terlalu banyak pilihan terbuka.'
      : 'Saya melihat kebingunganmu biasanya muncul saat terlalu banyak pilihan terbuka sekaligus.'

    return {
      type: 'confused',
      memoryConfidence,
      response: [
        reflection,
        '',
        'Saat Nexus, branding AI, konten, dan ide aplikasi baru berjalan bersamaan, prioritas jadi kabur.',
        '',
        `Kalau saya harus memilih satu, saya akan tetap menahan fokus di ${patterns.currentProject} dulu.`,
        '',
        'Bagian mana yang paling membuatmu bingung sekarang?',
      ].join('\n'),
    }
  }

  return null
}
