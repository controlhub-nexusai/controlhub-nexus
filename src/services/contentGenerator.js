import { buildBrandContext, getProfile } from './memoryService'

function extractTopic(prompt = '') {
  const match = prompt.match(/\b(?:tentang|about|soal)\s+(.+)$/i)
  const topic = match?.[1]?.trim()

  return topic || 'AI untuk produktivitas'
}

function detectPlatform(prompt = '') {
  if (/\b(instagram|ig)\b/i.test(prompt)) return 'Instagram'
  if (/\b(x|twitter)\b/i.test(prompt)) return 'X'
  if (/\b(youtube|yt)\b/i.test(prompt)) return 'YouTube'
  if (/\b(whatsapp|wa)\b/i.test(prompt)) return 'WhatsApp'

  return 'Instagram'
}

function splitTerms(value = '') {
  return value
    .split(/[\s,]+/)
    .map((term) => term.trim().toLowerCase())
    .filter((term) => term.length > 2)
}

function buildPreferredTerms(profile) {
  return [
    ...splitTerms(profile.focus_area),
    ...splitTerms(profile.target_audience),
    ...splitTerms(profile.goal),
    'ai',
    'automation',
    'productivity',
    'founder',
  ]
}

function getBrandedTopic(topic, profile) {
  const normalizedTopic = topic.toLowerCase()
  const preferredTerms = buildPreferredTerms(profile)
  const hasBrandFit = preferredTerms.some((term) => normalizedTopic.includes(term))

  if (hasBrandFit) return topic

  return `${profile.focus_area} untuk ${profile.target_audience}`
}

function withBrandContext(content, profile) {
  return {
    ...content,
    brandContext: buildBrandContext(profile),
  }
}

export function generateInstagramContent(topic, profile) {
  return {
    platform: 'Instagram',
    format: 'Carousel',
    title: `5 Cara Menggunakan ${topic} untuk Kerja Lebih Efisien`,
    hook: `${topic} bisa menghemat banyak waktu jika dipakai untuk proses yang tepat.`,
    slides: [
      `Slide 1: ${topic} bukan sekadar tren.`,
      'Slide 2: Mulai dari pekerjaan yang paling sering berulang.',
      'Slide 3: Gunakan AI untuk membuat draft, ringkasan, dan template.',
      'Slide 4: Review hasilnya sebelum dipakai ke customer atau publik.',
      'Slide 5: Simpan workflow terbaik agar bisa diulang setiap minggu.',
    ],
    caption: `${topic} bisa membantu pekerjaan jadi lebih cepat, rapi, dan mudah diukur. Mulai dari satu proses kecil, lihat hasilnya, lalu scale bertahap.`,
    cta: 'Simpan postingan ini dan coba terapkan satu workflow hari ini.',
    hashtags: ['#AI', '#Automation', '#Productivity', '#ArtificialIntelligence'],
  }
}

export function generateXContent(topic, profile) {
  return {
    platform: 'X',
    format: 'Thread',
    title: `Thread: ${topic} untuk Menghemat Waktu Kerja`,
    hook: `${topic} bukan cuma tren. Ini bisa menghemat waktu kerja harian.`,
    thread: [
      `1/ ${topic} paling berguna saat dipakai untuk pekerjaan berulang.`,
      '2/ Mulai dari tugas yang sering memakan waktu tapi polanya sama.',
      '3/ Buat template prompt untuk draft, follow up, ringkasan, atau ide konten.',
      '4/ Jangan langsung autopilot. Review hasil AI sebelum dikirim atau dipublish.',
      '5/ Workflow kecil yang konsisten biasanya lebih berdampak daripada tool yang terlalu kompleks.',
    ],
    cta: 'Follow untuk insight AI praktis lainnya.',
    hashtags: ['#AI', '#Automation', '#Productivity'],
  }
}

export function generateYouTubeContent(topic, profile) {
  return {
    platform: 'YouTube',
    format: 'Video Outline',
    title: `Saya Mencoba ${topic} untuk Menghemat Waktu Kerja`,
    hook: `Apa yang terjadi jika ${topic} dipakai untuk membantu pekerjaan harian selama satu minggu?`,
    outline: [
      'Opening',
      'Problem',
      'Main Point 1',
      'Main Point 2',
      'Main Point 3',
      'Closing',
    ],
    description: `Eksperimen menggunakan ${topic} untuk mengurangi pekerjaan berulang dan membuat workflow lebih efisien.`,
    cta: 'Subscribe untuk eksperimen AI berikutnya.',
    hashtags: ['#AI', '#Automation', '#Productivity'],
  }
}

export function generateWhatsAppContent(topic, profile) {
  return {
    platform: 'WhatsApp',
    format: 'Broadcast',
    title: `Broadcast: ${topic}`,
    message: `Halo, saya ingin berbagi info tentang ${topic}. Solusi ini bisa membantu pekerjaan jadi lebih cepat, rapi, dan mudah ditindaklanjuti. Jika ingin tahu detailnya, balas pesan ini ya.`,
    cta: 'Balas pesan ini untuk info lengkapnya.',
  }
}

export async function generateContentIdea(prompt = '') {
  const profile = await getProfile()
  const topic = getBrandedTopic(extractTopic(prompt), profile)
  const platform = detectPlatform(prompt)

  if (platform === 'X') return withBrandContext(generateXContent(topic, profile), profile)
  if (platform === 'YouTube') return withBrandContext(generateYouTubeContent(topic, profile), profile)
  if (platform === 'WhatsApp') return withBrandContext(generateWhatsAppContent(topic, profile), profile)

  return withBrandContext(generateInstagramContent(topic, profile), profile)
}
