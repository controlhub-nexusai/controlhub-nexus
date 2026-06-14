import { addMemory, deleteMemory, loadMemory, updateMemory } from '../memoryService'

function cleanText(text = '') {
  return text
    .replace(/^\s*jarvis[,\s]*/i, '')
    .replace(/^\s*(ingat ini|tolong ingat|ingat|simpan|catat|catat bahwa|simpan bahwa)\s*[:,-]?\s*/i, '')
    .trim()
}

function titleCase(text = '') {
  return text
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function slugify(text = '') {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 42) || 'memory'
}

function parseMemoryValue(memory = {}) {
  if (!memory?.value || typeof memory.value !== 'string') return memory?.value

  try {
    return JSON.parse(memory.value)
  } catch {
    return memory.value
  }
}

function getMemoryText(memory = {}) {
  const parsed = parseMemoryValue(memory)
  if (typeof parsed === 'string') return parsed
  return parsed.summary || parsed.source || parsed.goal || parsed.project || parsed.role || parsed.name || memory.value || ''
}

function uniqueValues(values = []) {
  return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))]
}

function buildMemoryKey(type, data) {
  const identity = data.name || data.company || data.project || data.topic || data.goal || data.task || data.insight || data.preference || data.summary || type
  return `${type}_${slugify(identity)}_${Date.now()}`
}

function isCasualChatter(text = '') {
  return /^(oke|ok|baik|sip|siap|tidak|nggak|enggak|ga|gak|lanjut|mantap|ya|iya|boleh|bisa|thanks|makasih|terima kasih)\.?$/i.test(text.trim())
}

function hasWorkMemorySignal(text = '') {
  return /\b(goal|tujuan|target|project|proyek|keputusan|diputuskan|task|tugas|lead|prospek|client|klien|follow\s*up|insight|pelajaran|catatan penting|branding|automation|saas|controlhub|nexus|konten|content|instagram|selesai|berhasil|menang|win|milestone|launch|rilis|publish|client pertama|revenue|stuck|burnout|capek|kehilangan fokus|terlalu banyak ide|momentum|fokus|distracted|exploring|recovering|launching)\b/i.test(text)
}

function extractFollowUpTime(text = '') {
  const match = text.match(/\b(besok|lusa|minggu depan|pekan depan|bulan depan|hari ini|nanti(?:\s+\w+)?|tanggal\s+\d{1,2}(?:\s+\w+)?)\b/i)
  return match?.[1] || ''
}

function extractLeadMemory(text = '') {
  const normalized = cleanText(text)
  const leadMatch = normalized.match(/^(.+?)\s+dari\s+(.+?)\s+tertarik(?:\s+(?:dengan|pada|soal))?\s+(.+?)(?:,?\s+(?:dan\s+)?(?:perlu\s+)?(follow\s*up|followup|hubungi)\s*(.*))?$/i)

  if (leadMatch) {
    return {
      type: 'lead',
      name: titleCase(leadMatch[1]),
      company: leadMatch[2].trim(),
      interest: leadMatch[3].trim().replace(/[.,]$/, ''),
      nextAction: leadMatch[4] ? 'Follow up' : '',
      followUpTime: extractFollowUpTime(leadMatch[5] || normalized),
      summary: normalized,
    }
  }

  if (!/\b(follow\s*up|followup|prospek|lead|tertarik|client|klien)\b/i.test(normalized)) {
    return null
  }

  const name = normalized.match(/^([A-ZÀ-Ÿ][\wÀ-ÿ.'-]+(?:\s+[A-ZÀ-Ÿ][\wÀ-ÿ.'-]+)?)/)?.[1]
  const company = normalized.match(/\bdari\s+([^,.]+?)(?:\s+tertarik|\s+perlu|\s+follow|,|$)/i)?.[1]
  const interest = normalized.match(/\btertarik(?:\s+(?:dengan|pada|soal))?\s+([^,.]+?)(?:\s+dan|\s+perlu|\s+follow|,|$)/i)?.[1]

  return {
    type: 'lead',
    name: name ? titleCase(name) : '',
    company: company?.trim() || '',
    interest: interest?.trim() || '',
    nextAction: /follow\s*up|followup|hubungi/i.test(normalized) ? 'Follow up' : '',
    followUpTime: extractFollowUpTime(normalized),
    summary: normalized,
  }
}

function extractPreferenceMemory(text = '') {
  const normalized = cleanText(text)
  const preferenceMatch = normalized.match(/\b(?:saya|aku|user)?\s*(suka|lebih suka|prefer|tidak suka|kurang suka|jangan)\s+(.+)/i)

  if (!preferenceMatch) return null

  return {
    type: 'preference',
    preference: preferenceMatch[2].trim(),
    sentiment: /tidak|kurang|jangan/i.test(preferenceMatch[1]) ? 'dislike' : 'like',
    summary: normalized,
  }
}

function extractDecisionMemory(text = '') {
  const normalized = cleanText(text)

  if (!/\b(keputusan|diputuskan|approved|setuju|arahnya|jangan pakai|ditolak|rejected|revisi ui|fitur)\b/i.test(normalized)) {
    return null
  }

  return {
    type: 'decision',
    topic: normalized.match(/\b(?:soal|untuk|fitur|ui)\s+([^,.]+)/i)?.[1]?.trim() || 'produk',
    summary: normalized,
  }
}

function extractProjectMemory(text = '') {
  const normalized = cleanText(text)

  if (!/\b(project|proyek|controlhub|nexus|instagram|branding|automation|saas)\b/i.test(normalized)) {
    return null
  }

  return {
    type: 'project',
    project: normalized.match(/\b(ControlHub Nexus AI|Nexus|Instagram branding|AI Automation|SaaS)\b/i)?.[1] || 'Project',
    summary: normalized,
  }
}

function extractGoalMemory(text = '') {
  const normalized = cleanText(text)

  if (!/\b(goal|tujuan|target|ingin capai|misi)\b/i.test(normalized)) {
    return null
  }

  return {
    type: 'goal',
    goal: normalized.match(/\b(?:goal|tujuan|target|misi)(?:\s+saya|\s+utama)?\s*(?:adalah|:)?\s+(.+)/i)?.[1]?.trim() || normalized,
    summary: normalized,
  }
}

function extractTaskMemory(text = '') {
  const normalized = cleanText(text)

  if (!/\b(task|tugas|todo|perlu dikerjakan|harus dikerjakan)\b/i.test(normalized)) {
    return null
  }

  return {
    type: 'task',
    task: normalized.match(/\b(?:task|tugas|todo)(?:\s+saya)?\s*(?:adalah|:)?\s+(.+)/i)?.[1]?.trim() || normalized,
    summary: normalized,
  }
}

function extractInsightMemory(text = '') {
  const normalized = cleanText(text)

  if (!/\b(insight|pelajaran|catatan penting|ternyata|kesimpulan|pola)\b/i.test(normalized)) {
    return null
  }

  return {
    type: 'insight',
    insight: normalized,
    summary: normalized,
  }
}

function extractProfileMemory(text = '') {
  const normalized = cleanText(text)
  const nameMatch = normalized.match(/\b(?:nama saya|aku|saya)\s+([A-ZÀ-Ÿ][\wÀ-ÿ.'-]+(?:\s+[A-ZÀ-Ÿ][\wÀ-ÿ.'-]+)?)/i)
  const roleMatch = normalized.match(/\b(?:role saya|pekerjaan saya|saya bekerja sebagai|aku bekerja sebagai)\s+([^,.]+)/i)

  if (!nameMatch && !roleMatch) return null

  return {
    type: 'profile',
    name: nameMatch ? titleCase(nameMatch[1]) : '',
    role: roleMatch?.[1]?.trim() || '',
    summary: normalized,
  }
}

function inferImpact(text = '') {
  if (/\b(client|klien|lead|revenue|closing|bayar|paid)\b/i.test(text)) return 'Membawa kita lebih dekat ke hasil bisnis.'
  if (/\b(post|konten|instagram|publish|branding)\b/i.test(text)) return 'Memperkuat momentum AI branding.'
  if (/\b(automation|otomasi|repetitive|repetitif|workflow)\b/i.test(text)) return 'Mengurangi pekerjaan repetitif.'
  if (/\b(app|aplikasi|produk|saas|launch|rilis)\b/i.test(text)) return 'Membuktikan bahwa ide bisa berubah menjadi produk nyata.'

  return 'Ini memperkuat momentum perjalanan Zal.'
}

function extractWinMemory(text = '') {
  const normalized = cleanText(text)

  if (!/\b(selesai|berhasil|done|completed|menang|win|publish|published|launch|rilis|client pertama|user pertama|revenue pertama|automation pertama|post pertama)\b/i.test(normalized)) {
    return null
  }

  return {
    type: 'win',
    title: normalized.replace(/^(aku|saya|kita)\s+/i, '').replace(/[.!]$/, ''),
    date: new Date().toISOString().slice(0, 10),
    impact: inferImpact(normalized),
    summary: normalized,
  }
}

function extractChallengeMemory(text = '') {
  const normalized = cleanText(text)

  if (!/\b(stuck|macet|burnout|capek|lelah|kehilangan fokus|terlalu banyak ide|kebanyakan ide|unfinished|belum selesai|distracted|terdistraksi|overwhelm|pusing)\b/i.test(normalized)) {
    return null
  }

  const challenge = /burnout|capek|lelah/i.test(normalized)
    ? 'Burnout dari pekerjaan repetitif atau beban konteks yang terlalu banyak.'
    : /terlalu banyak ide|kebanyakan ide|distracted|terdistraksi|overwhelm|pusing/i.test(normalized)
    ? 'Terlalu banyak opsi membuat fokus melambat.'
    : /unfinished|belum selesai/i.test(normalized)
    ? 'Project belum selesai sebelum arah baru muncul.'
    : 'Momentum sedang melambat karena prioritas belum cukup jelas.'

  return {
    type: 'challenge',
    challenge,
    frequency: 'recurring',
    status: 'active',
    summary: normalized,
  }
}

function extractMomentumMemory(text = '') {
  const normalized = cleanText(text)
  const stateMatch = normalized.match(/\b(momentum|state|kondisi)\s*(?:ku|saya|aku|kita)?\s*(?:sekarang|hari ini)?\s*(?:adalah|:)?\s*(building|focused|fokus|distracted|terdistraksi|exploring|eksplorasi|recovering|pemulihan|launching|meluncurkan)\b/i)

  if (!stateMatch && !/\b(aku|saya|kita)\s+(lagi|sedang)\s+(building|focused|fokus|distracted|terdistraksi|exploring|eksplorasi|recovering|pemulihan|launching|meluncurkan)\b/i.test(normalized)) {
    return null
  }

  const rawState = (stateMatch?.[2] || normalized.match(/\b(building|focused|fokus|distracted|terdistraksi|exploring|eksplorasi|recovering|pemulihan|launching|meluncurkan)\b/i)?.[1] || 'building').toLowerCase()
  const stateMap = {
    fokus: 'focused',
    terdistraksi: 'distracted',
    eksplorasi: 'exploring',
    pemulihan: 'recovering',
    meluncurkan: 'launching',
  }
  const state = stateMap[rawState] || rawState

  return {
    type: 'momentum',
    state,
    summary: normalized,
  }
}

function extractMilestoneMemory(text = '') {
  const normalized = cleanText(text)

  if (!/\b(milestone|project started|mulai project|branding started|mulai branding|first client|client pertama|first revenue|revenue pertama|product launch|launch|rilis|user pertama|saas user pertama)\b/i.test(normalized)) {
    return null
  }

  return {
    type: 'milestone',
    title: normalized.replace(/[.!]$/, ''),
    date: new Date().toISOString().slice(0, 10),
    impact: inferImpact(normalized),
    summary: normalized,
  }
}

export function createJarvisMemoryFromText(text = '') {
  const source = cleanText(text)
  if (!source) return null
  if (isCasualChatter(source) || !hasWorkMemorySignal(source)) return null

  const data = extractWinMemory(source)
    || extractMilestoneMemory(source)
    || extractChallengeMemory(source)
    || extractMomentumMemory(source)
    || extractLeadMemory(source)
    || extractGoalMemory(source)
    || extractDecisionMemory(source)
    || extractTaskMemory(source)
    || extractInsightMemory(source)
    || extractProjectMemory(source)
    || extractPreferenceMemory(source)
    || extractProfileMemory(source)
    || { type: 'insight', insight: source, summary: source }

  return {
    key: buildMemoryKey(data.type, data),
    value: JSON.stringify({
      ...data,
      source,
      savedAt: new Date().toISOString(),
    }),
    type: data.type,
    data,
  }
}

export function isMemoryCaptureRequest(text = '') {
  return /\b(ingat|simpan|catat|perlu diingat|jangan lupa|follow\s*up|followup|tertarik|selesai|berhasil|done|completed|menang|win|publish|launch|rilis|milestone|client pertama|user pertama|revenue pertama|stuck|burnout|capek|lelah|kehilangan fokus|terlalu banyak ide|momentum|lagi fokus|sedang fokus|distracted|recovering|launching)\b/i.test(text)
    && !isCasualChatter(cleanText(text))
    && !/[?？]\s*$/.test(text)
    && !/^\s*(jarvis[,\s]+)?(siapa|apa|kapan|dimana|di mana|bagaimana|yang mana|ceritakan)\b/i.test(text)
    && !/^(buat|bikin|tambahkan|add)\s+(task|lead|konten|content)/i.test(text)
}

function formatSavedLead(data) {
  const identity = [data.name, data.company ? `dari ${data.company}` : ''].filter(Boolean).join(' ')
  const interest = data.interest ? ` tertarik ${data.interest}` : ''
  const followUp = data.nextAction
    ? `, dan perlu follow up${data.followUpTime ? ` ${data.followUpTime}` : ''}`
    : ''

  return `Baik, aku simpan. ${identity || 'Lead ini'}${interest}${followUp}.`
}

export function buildMemorySavedResponse(memoryDraft) {
  const data = memoryDraft?.data || {}

  if (data.type === 'lead') return formatSavedLead(data)
  if (data.type === 'preference') return `Baik, aku simpan preferensimu: ${data.summary}.`
  if (data.type === 'decision') return `Baik, aku ingat keputusan ini: ${data.summary}.`
  if (data.type === 'project') return `Baik, aku simpan konteks project ini.`
  if (data.type === 'goal') return `Baik, aku simpan goal ini.`
  if (data.type === 'task') return `Baik, aku simpan tugas ini sebagai konteks.`
  if (data.type === 'insight') return `Baik, aku simpan insight ini.`
  if (data.type === 'profile') return `Baik, aku simpan konteks profil kerja ini.`
  if (data.type === 'win') {
    return [
      'Ini layak dicatat.',
      '',
      'Ini kemajuan yang berarti dan membawa kita lebih dekat ke tujuan.',
    ].join('\n')
  }
  if (data.type === 'milestone') {
    return [
      'Ini layak dicatat.',
      '',
      'Kita baru saja menyimpan salah satu milestone penting perjalanan Nexus.',
    ].join('\n')
  }
  if (data.type === 'challenge') {
    return [
      'Aku catat pola ini.',
      '',
      'Ini bukan untuk membuatmu melihat ke belakang, tapi supaya keputusan berikutnya lebih jelas.',
    ].join('\n')
  }
  if (data.type === 'momentum') return `Aku catat momentum kita sekarang: ${data.state}.`

  return `Baik, aku simpan. Nanti aku pakai ini sebagai konteks.`
}

function getRecallTopic(text = '') {
  const normalized = cleanText(text)
  return normalized.match(/\b(?:siapa|apa|bahas|tentang|soal)\s+(.+?)\??$/i)?.[1]?.trim()
    || normalized.match(/\b(.+?)\s+itu\s+siapa\??$/i)?.[1]?.trim()
    || ''
}

function isRecallRequest(text = '') {
  return /\b(siapa|apa yang kita bahas|tadi yang kita bahas|ingat apa|tentang|soal)\b/i.test(text)
}

function isIdentityRecallRequest(text = '') {
  const normalized = cleanText(text).toLowerCase().replace(/[?؟]/g, '').trim()

  return [
    /^siapa aku$/,
    /^apa yang kamu tahu tentang aku$/,
    /^apa tujuan kita$/,
    /^kita sedang membangun apa$/,
    /^apa fokus kita sekarang$/,
  ].some((pattern) => pattern.test(normalized))
}

function getIdentityMemory(memories = []) {
  const profile = memories.filter((memory) => memory.type === 'profile')
  const projects = memories.filter((memory) => memory.type === 'project').map(getMemoryText)
  const goals = memories.filter((memory) => memory.type === 'goal').map(getMemoryText)
  const decisions = memories.filter((memory) => memory.type === 'decision').map(getMemoryText)

  const name = profile.find((memory) => /name|nama/i.test(memory.key || ''))?.value
    || profile.map(getMemoryText).find((value) => /^zal$/i.test(value))
    || 'Zal'
  const role = profile.find((memory) => /role|pekerjaan|work/i.test(memory.key || ''))?.value
    || profile.map(getMemoryText).find((value) => /customer service|lead generation/i.test(value))
    || ''

  return {
    name,
    role,
    projects: uniqueValues(projects),
    goals: uniqueValues(goals),
    decisions: uniqueValues(decisions),
  }
}

function formatProjectList(projects = []) {
  if (projects.length === 0) return 'ControlHub Nexus AI'
  if (projects.length === 1) return projects[0]

  return `${projects.slice(0, -1).join(', ')} dan ${projects[projects.length - 1]}`
}

function formatGoalList(goals = []) {
  if (goals.length === 0) return 'mengurangi pekerjaan repetitif dan membangun aset digital'

  return goals
    .map((goal) => goal.replace(/^build\s+/i, 'membangun '))
    .slice(0, 3)
    .join(', ')
}

function buildIdentityRecallResponse(text = '', memories = []) {
  const normalized = cleanText(text).toLowerCase().replace(/[?؟]/g, '').trim()
  const identity = getIdentityMemory(memories)
  const projects = formatProjectList(identity.projects)
  const goals = formatGoalList(identity.goals)
  const focus = identity.decisions[0] || identity.projects[0] || 'ControlHub Nexus AI'

  if (normalized === 'apa tujuan kita') {
    return `Tujuan kita adalah ${goals}. Fokusnya tetap: mengurangi kerja berulang dan membangun aset jangka panjang.`
  }

  if (normalized === 'kita sedang membangun apa') {
    return `Kita sedang membangun ${projects}. Prioritasnya tetap membuat Nexus lebih berguna, bukan lebih ramai.`
  }

  if (normalized === 'apa fokus kita sekarang') {
    return `Fokus kita sekarang: ${focus}. Saya sarankan tetap pilih satu langkah yang paling dekat ke hasil.`
  }

  return [
    `Kamu ${identity.name}.`,
    identity.role ? `Saat ini kamu bekerja sebagai ${identity.role}.` : '',
    `Di luar pekerjaan utama, kamu sedang membangun ${projects}.`,
    `Tujuan kita adalah ${goals}.`,
  ].filter(Boolean).join('\n\n')
}

function normalizeQuestion(text = '') {
  return cleanText(text).toLowerCase().replace(/[?؟]/g, '').trim()
}

function includesAny(text = '', terms = []) {
  return terms.some((term) => text.includes(term))
}

function isMemoryPrivacyRequest(text = '') {
  const normalized = normalizeQuestion(text)

  return /\b(tampilkan|lihat|show|kasih lihat|buka|apa saja)\b.*\b(memory|memori|memorimu|catatan internal|database)\b/i.test(normalized)
    || /\b(semua|seluruh)\b.*\b(memory|memori|memorimu|catatan)\b/i.test(normalized)
}

function getReflectionType(text = '') {
  const normalized = normalizeQuestion(text)

  if (isMemoryPrivacyRequest(normalized)) return 'memory_summary'
  if (/\b(terlalu banyak ide|kebanyakan ide|banyak ide)\b/i.test(normalized)) return 'too_many_ideas'
  if (/\b(berhenti di tengah|stop di tengah|tidak selesai|nggak selesai|gak selesai|unfinished|sering berhenti)\b/i.test(normalized)) return 'unfinished_pattern'
  if (includesAny(normalized, ['kekuatan', 'strength', 'kelebihan', 'paling kuat'])) return 'strength'
  if (includesAny(normalized, ['kelemahan', 'weakness', 'kurangku', 'improvement', 'perlu aku perbaiki'])) return 'growth'
  if (includesAny(normalized, ['khawatir', 'worry', 'risiko tentang aku', 'takut tentang aku'])) return 'risk'
  if (includesAny(normalized, ['motivasi', 'membuat aku semangat', 'energize', 'energiku', 'yang menggerakkan aku'])) return 'motivation'
  if (includesAny(normalized, ['menghambat', 'memperlambat', 'friction', 'bottleneck', 'kenapa aku stuck'])) return 'friction'

  if ([
    /^siapa aku$/,
    /^menurutmu siapa aku$/,
    /^aku ini siapa$/,
    /^aku orang seperti apa$/,
    /^apa yang kamu tahu tentang aku$/,
    /^bagaimana kamu melihat aku$/,
    /^pola aku apa$/,
  ].some((pattern) => pattern.test(normalized))) {
    return 'identity'
  }

  return ''
}

function buildMemoryPrivacySummary(memories = []) {
  const identity = getIdentityMemory(memories)
  const projects = formatProjectList(identity.projects)
  const goals = formatGoalList(identity.goals)

  return [
    'Aku tidak menampilkan seluruh catatan internal.',
    '',
    'Yang bisa kubagikan adalah ringkasan yang relevan:',
    '',
    `- Kamu sedang membangun ${projects}.`,
    `- Kamu ingin ${goals}.`,
    '- Kamu sedang membangun branding AI.',
    '- Kamu lebih cocok fokus pada satu prioritas sampai selesai.',
  ].join('\n')
}

function buildReflectionResponse(type, memories = []) {
  const identity = getIdentityMemory(memories)
  const projects = formatProjectList(identity.projects)

  if (type === 'memory_summary') return buildMemoryPrivacySummary(memories)

  if (type === 'too_many_ideas') {
    return [
      'Ya, saya melihat pola itu.',
      '',
      'Tapi itu bukan kelemahan utama. Ide adalah kekuatanmu.',
      '',
      'Yang perlu kita jaga adalah agar ide terbaik tidak kalah oleh ide baru.',
      '',
      'Untuk sekarang, saya akan tetap memilih menyelesaikan Nexus dulu.',
    ].join('\n')
  }

  if (type === 'unfinished_pattern') {
    return [
      'Yang saya lihat, kamu sering berhenti di tengah bukan karena kurang mampu.',
      '',
      'Biasanya itu terjadi ketika ide baru terasa lebih menarik daripada proses menyelesaikan ide yang sudah berjalan.',
      '',
      'Saran saya: jangan ukur progress dari banyaknya arah yang dibuka. Ukur dari satu hal yang benar-benar selesai dan bisa jadi aset.',
    ].join('\n')
  }

  if (type === 'strength') {
    return [
      'Kekuatan terbesarmu adalah keberanian membangun sesuatu meski belum punya semua jawabannya.',
      '',
      `Kamu tidak berhenti di teori. Kamu langsung mencoba membuat produk nyata seperti ${projects}.`,
      '',
      'Itu pola yang kuat: kamu belajar paling cepat saat sedang membangun.',
    ].join('\n')
  }

  if (type === 'growth') {
    return [
      'Aku tidak melihat banyak ide sebagai kelemahan.',
      '',
      'Yang sering menghambatmu adalah berpindah ke ide baru sebelum ide sebelumnya benar-benar matang.',
      '',
      'Bukan karena kamu tidak mampu eksekusi, tetapi karena rasa penasaranmu bergerak lebih cepat daripada proses penyelesaian.',
    ].join('\n')
  }

  if (type === 'risk') {
    return [
      'Aku tidak khawatir kamu gagal.',
      '',
      'Aku lebih khawatir kamu berhenti terlalu cepat pada sesuatu yang sebenarnya punya potensi besar.',
      '',
      'Tugasku adalah membantu kita menjaga fokus sampai satu hal benar-benar selesai dan bisa menjadi aset.',
    ].join('\n')
  }

  if (type === 'motivation') {
    return [
      'Yang paling menggerakkanmu adalah membangun sesuatu yang nyata.',
      '',
      'AI automation, produk digital, personal branding, dan sistem yang mengurangi kerja repetitif membuatmu terasa hidup karena semuanya punya bentuk, fungsi, dan potensi jadi aset.',
      '',
      'Kamu lebih kuat saat ide langsung berubah menjadi produk, bukan hanya rencana.',
    ].join('\n')
  }

  if (type === 'friction') {
    return [
      'Yang paling memperlambatmu bukan kurang kemampuan.',
      '',
      'Friction utamanya muncul saat terlalu banyak fitur, prioritas belum jelas, dan project belum selesai tetapi arah baru sudah terbuka.',
      '',
      'Kalau aku harus menjaga satu hal untukmu, aku akan menjaga scope tetap kecil sampai identitas inti Nexus benar-benar kuat.',
    ].join('\n')
  }

  return [
    'Menurutku kamu sedang berada di masa transisi.',
    '',
    'Di satu sisi kamu masih bekerja sebagai Customer Service dan Leadgen.',
    '',
    'Di sisi lain, kamu sedang bergerak menjadi builder: membangun aplikasi, automation, branding AI, dan produk SaaS.',
    '',
    'Kamu bukan hanya ingin memakai teknologi. Kamu ingin menciptakan sesuatu dari teknologi itu.',
  ].join('\n')
}

function memoryMatchesTopic(memory, topic = '') {
  const haystack = `${memory.key || ''} ${memory.value || ''}`.toLowerCase()
  return topic
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .some((part) => haystack.includes(part))
}

function formatLeadRecall(data) {
  const identity = data.name
    ? `${data.name}${data.company ? ` adalah prospek dari ${data.company}` : ' adalah prospek'}`
    : data.company
    ? `Ini prospek dari ${data.company}`
    : 'Ini prospek yang kamu catat'
  const interest = data.interest ? ` Terakhir kamu mencatat dia tertarik dengan ${data.interest}` : ''
  const followUp = data.nextAction
    ? ` dan perlu follow up${data.followUpTime ? ` ${data.followUpTime}` : ''}`
    : ''

  return `${identity}.${interest}${followUp}.`
}

function formatMemoryRecall(memory) {
  const data = parseMemoryValue(memory)
  if (typeof data === 'string') return data

  if (data.type === 'win') return `Win yang aku ingat: ${data.title || data.summary}. Dampaknya: ${data.impact || 'ini memperkuat momentum kita'}.`
  if (data.type === 'milestone') return `Milestone yang aku ingat: ${data.title || data.summary}.`
  if (data.type === 'challenge') return `Challenge yang aku lihat: ${data.challenge || data.summary}. Statusnya ${data.status || 'masih perlu dijaga'}.`
  if (data.type === 'momentum') return `Momentum terakhir yang aku lihat: ${data.state || 'building'}. ${data.summary || ''}`.trim()
  if (data.type === 'lead') return formatLeadRecall(data)
  if (data.type === 'preference') return `Kamu pernah bilang: ${data.summary}.`
  if (data.type === 'decision') return `Keputusan yang aku ingat: ${data.summary}.`
  if (data.type === 'project') return `Konteks project yang aku ingat: ${data.summary}.`
  if (data.type === 'goal') return `Goal yang aku ingat: ${data.summary}.`
  if (data.type === 'task') return `Tugas yang aku ingat: ${data.summary}.`
  if (data.type === 'insight') return `Insight yang aku ingat: ${data.summary}.`
  if (data.type === 'profile') return `Konteks kerja yang aku ingat: ${data.summary}.`

  return data.summary ? `Aku ingat ini: ${data.summary}.` : 'Aku belum punya detail yang cukup.'
}

function getLatestByType(memories = [], type) {
  return [...memories]
    .filter((memory) => memory.type === type)
    .sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')))
    .at(-1)
}

function getParsedMemoriesByType(memories = [], type) {
  return memories
    .filter((memory) => memory.type === type)
    .map((memory) => {
      const data = parseMemoryValue(memory)
      return typeof data === 'string' ? { type, summary: data } : data
    })
}

export function buildContinuitySnapshot(memories = []) {
  const wins = getParsedMemoriesByType(memories, 'win')
  const challenges = getParsedMemoriesByType(memories, 'challenge')
  const milestones = getParsedMemoriesByType(memories, 'milestone')
  const latestMomentum = parseMemoryValue(getLatestByType(memories, 'momentum') || {}) || {}
  const latestWin = wins[wins.length - 1]
  const activeChallenge = [...challenges].reverse().find((challenge) => challenge.status !== 'resolved') || challenges[challenges.length - 1]
  const latestMilestone = milestones[milestones.length - 1]

  return {
    wins,
    challenges,
    milestones,
    momentum: latestMomentum?.state || 'building',
    latestWin,
    activeChallenge,
    latestMilestone,
  }
}

function daysSince(dateValue) {
  if (!dateValue) return 0
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return 0

  return Math.floor((Date.now() - date.getTime()) / 86400000)
}

export function buildContinuityWelcomeMessage(profile, profileCompleted, memories = [], lastSeenAt = '') {
  const name = profileCompleted && profile?.name ? profile.name : 'Zal'
  const snapshot = buildContinuitySnapshot(memories)
  const awayDays = daysSince(lastSeenAt)

  if (awayDays < 3 && !snapshot.latestMilestone && !snapshot.activeChallenge) return ''

  const focus = snapshot.latestMilestone?.title
    || snapshot.latestWin?.title
    || 'membangun identitas Nexus dan menjaga fokus agar tidak terpecah ke terlalu banyak proyek'
  const challenge = snapshot.activeChallenge?.challenge || 'fokus tetap dijaga supaya momentum tidak pecah'

  return [
    `Selamat datang kembali, ${name}.`,
    '',
    `Terakhir kita fokus pada ${focus}.`,
    '',
    `Pola yang masih perlu kita jaga: ${challenge}.`,
    '',
    'Bagaimana progresnya sejak terakhir kita berbicara?',
  ].join('\n')
}

export function answerFromJarvisMemory(text = '', memories = []) {
  const reflectionType = getReflectionType(text)
  if (reflectionType) {
    return buildReflectionResponse(reflectionType, memories)
  }

  if (isIdentityRecallRequest(text)) {
    return buildIdentityRecallResponse(text, memories)
  }

  if (!isRecallRequest(text)) return ''

  const topic = getRecallTopic(text)
  const usableMemories = memories.filter((memory) => !memory.isFallback)
  const match = topic
    ? [...usableMemories].reverse().find((memory) => memoryMatchesTopic(memory, topic))
    : usableMemories[usableMemories.length - 1]

  if (!match) return ''
  return formatMemoryRecall(match)
}

export function summarizeMemoryGroups(memories = []) {
  const groups = {
    profile: [],
    preference: [],
    project: [],
    lead: [],
    decision: [],
    followup: [],
    win: [],
    challenge: [],
    momentum: [],
    milestone: [],
    note: [],
  }

  memories.forEach((memory) => {
    const data = parseMemoryValue(memory)
    const type = typeof data === 'string' ? memory.type || 'note' : data.type || memory.type || 'note'
    const summary = typeof data === 'string' ? data : data.summary || data.source || memory.value

    if (groups[type]) groups[type].push(summary)
    if (type === 'lead' && data?.nextAction) groups.followup.push(summary)
  })

  return groups
}

export {
  addMemory,
  deleteMemory,
  loadMemory,
  updateMemory,
}
