import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { generateNexusResponse } from '../../services/geminiService'
import { parseTaskIntent } from '../../services/taskIntentParser'
import { COMMAND_INTENTS, routeCommand } from '../../services/commandRouter'
import { extractTask } from '../../services/taskParser'
import { buildDailyPlanResponse, generateDailyPlan } from '../../services/dailyPlanningService'
import { buildDailyReviewResponse, generateDailyReview } from '../../services/dailyReviewService'
import { buildWeeklyReviewResponse, generateWeeklyReview } from '../../services/weeklyReviewService'
import {
  buildDailyBriefingCards,
  buildDailyBriefingCommandResponse,
  getDailyBriefingCommand,
} from '../../services/dailyBriefingIntelligence'
import { evaluateJudgment } from '../../services/judgmentEngine'
import { generateExecutiveBriefing } from '../../services/executiveBriefingService'
import { buildFocusResponse, generateFocusTask } from '../../services/focusService'
import { generateContentIdea } from '../../services/contentGenerator'
import { buildNexusScore, buildPriorityCoach, getActiveTasks, getGoalSupport, getPriorityTasks } from '../../services/nexusAssistant'
import { buildDailyGreeting, buildUserContext } from '../../services/personalizationService'
import {
  formatReminderTime,
  getUpcomingTasks,
} from '../../utils/reminderEngine'
import JarvisChat from './JarvisChat'
import QuickReplies from './QuickReplies'
import VoiceButton from './VoiceButton'
import {
  getJarvisOpeningMessage,
  getJarvisPrompt,
  isLateWorkWindow,
  softenRecommendation,
} from '../../services/jarvis/jarvisPersonality'
import {
  answerFromJarvisMemory,
  buildContinuityWelcomeMessage,
  buildMemorySavedResponse,
  createJarvisMemoryFromText,
  isMemoryCaptureRequest,
} from '../../services/jarvis/jarvisMemory'

const TASK_TIME_ACTIONS = ['09:00 Pagi', '12:00 Siang', '18:00 Sore', 'Pilih Jam Lain']
const CONTENT_PLATFORM_ACTIONS = ['Instagram', 'X', 'YouTube']
const PENDING_TASK_KEY = 'nexus.pendingTask'
const LAST_SEEN_KEY = 'nexus.lastSeenAt'
const THINKING_MESSAGES = [
  'Nexus sedang mengetik...',
  'Nexus sedang berpikir...',
  'Mengecek prioritas...',
  'Aku cek sebentar...',
  'Sebentar, aku rapikan konteksnya...',
]

const THINKING_DELAYS = {
  simple: [800, 1500],
  medium: [1500, 3000],
  strategic: [3000, 6000],
}
const STATE_SAVE_FAILED = 'Belum berhasil saya simpan karena terjadi kesalahan saat memperbarui data.'

function getCurrentTime() {
  const time = new Date().toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: 'Asia/Jakarta',
  })

  return `${time} WIB`
}

function getRandomThinkingMessage() {
  return THINKING_MESSAGES[Math.floor(Math.random() * THINKING_MESSAGES.length)]
}

function randomBetween(min, max) {
  return Math.floor(min + Math.random() * (max - min + 1))
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function getThinkingDepth(text = '') {
  const normalized = text.toLowerCase()

  if (/strategi|rencana|planning|besok|minggu|prioritas|briefing|ringkas|review|keputusan|apa yang penting|ketinggalan/i.test(normalized)) {
    return 'strategic'
  }

  if (/task|lead|prospek|konten|content|follow up|proposal|cek|fokus|buat|simpan|ingat|catat/i.test(normalized)) {
    return 'medium'
  }

  return 'simple'
}

function getThinkingDelay(text = '') {
  const [min, max] = THINKING_DELAYS[getThinkingDepth(text)]
  return randomBetween(min, max)
}

function getThinkingMessage(text = '') {
  const depth = getThinkingDepth(text)

  if (depth === 'strategic') {
    return Math.random() > 0.5 ? 'Nexus sedang berpikir...' : 'Mengecek prioritas...'
  }

  return getRandomThinkingMessage()
}

function getWordCount(text = '') {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function isConversationIntent(text = '') {
  const normalized = text.trim().toLowerCase()

  return getWordCount(normalized) < 3
    && /^(oke|ok|baik|sip|siap|tidak|nggak|enggak|ga|gak|lanjut|mantap|ya|iya|boleh|bisa|thanks|makasih|terima kasih)\b/i.test(normalized)
}

function buildConversationResponse(text = '') {
  const normalized = text.trim().toLowerCase()

  if (/^(tidak|nggak|enggak|ga|gak)\b/.test(normalized)) {
    return 'Saya tahan dulu arahnya. Kalau harus tetap menjaga momentum, kita cukup pilih satu hal kecil yang paling dekat selesai.'
  }
  if (/^(lanjut)\b/.test(normalized)) {
    return 'Kita lanjut, tapi tetap satu jalur. Langkah berikutnya: selesaikan bagian yang paling dekat memberi hasil.'
  }
  if (/^(thanks|makasih|terima kasih)\b/.test(normalized)) {
    return 'Sama-sama. Yang penting sekarang bukan menambah ide, tapi menjaga langkah berikutnya tetap jelas.'
  }
  if (/^(mantap|sip|siap)\b/.test(normalized)) {
    return 'Siap. Kita jaga momentum ini dengan satu langkah kecil yang bisa selesai, bukan membuka cabang baru.'
  }

  return 'Oke. Saya akan bantu jaga percakapan ini tetap mengarah ke keputusan, bukan sekadar respons.'
}

function formatFocusCountdown(seconds = 0) {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
}

function isExecutiveBriefingRequest(text = '') {
  return /executive briefing|briefing hari ini|ringkas prioritas|apa yang penting hari ini/i.test(text)
}

function buildExecutiveBriefingResponse(briefing) {
  return [
    'Aku sudah lihat yang penting.',
    '',
    'Peluang:',
    briefing.biggestOpportunity,
    '',
    'Risiko:',
    briefing.biggestRisk,
    '',
    'Langkah berikutnya:',
    briefing.nextBestAction,
  ].join('\n')
}

function getStoredLastSeenAt() {
  if (typeof window === 'undefined') return ''
  return window.localStorage.getItem(LAST_SEEN_KEY) || ''
}

function storeLastSeenAt() {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(LAST_SEEN_KEY, new Date().toISOString())
}

function buildNexusWelcomeMessage(profile, profileCompleted, memories = [], lastSeenAt = '') {
  return buildContinuityWelcomeMessage(profile, profileCompleted, memories, lastSeenAt)
    || getJarvisOpeningMessage(profile, profileCompleted)
}

function formatTaskCategory(category) {
  const labels = {
    content: 'Content',
    personal: 'Personal',
    work: 'Work',
    youtube: 'YouTube',
  }

  return labels[category] || category || 'General'
}

function formatTaskTitle(title = '') {
  return title
    .replace(/\binstagram\b/gi, 'Instagram')
    .replace(/\byoutube\b/gi, 'YouTube')
    .replace(/\bwhatsapp\b/gi, 'WhatsApp')
}

function formatTaskDue(task) {
  const labels = {
    today: 'Hari ini',
    tomorrow: 'Besok',
  }

  const dateLabel = labels[task.dueDate] || task.dueDate
  if (dateLabel && task.dueTime) return `${dateLabel}, ${task.dueTime} WIB`
  if (dateLabel) return dateLabel
  if (task.dueTime) return `${task.dueTime} WIB`

  return 'Belum dijadwalkan'
}

function formatDueDateText(dueDate) {
  if (dueDate === 'today') return 'hari ini'
  if (dueDate === 'tomorrow') return 'besok'

  return dueDate || 'hari ini'
}

function formatReminderText(task) {
  return `${formatDueDateText(task.dueDate)} pukul ${task.dueTime} WIB`
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

function resolveDueDateValue(dueDate) {
  if (dueDate === 'today') return getJakartaDate(0)
  if (dueDate === 'tomorrow') return getJakartaDate(1)

  return dueDate || null
}

function parseTimeAnswer(text) {
  const normalized = text
    .trim()
    .toLowerCase()
    .replace(/\bwib\b/g, '')
    .replace(/\blain\b/g, '')
    .trim()
  const colonMatch = normalized.match(/\b(\d{1,2})(?:[.:](\d{2}))\b/)
  const hourMatch = normalized.match(/\b(?:jam\s*)?(\d{1,2})\s*(pagi|siang|sore|malam)?\b/)
  const match = colonMatch || hourMatch
  if (!match) return null

  const hour = Number(match[1])
  const minute = colonMatch ? match[2] : '00'
  const period = colonMatch ? undefined : match[2]
  if (hour > 23 || Number(minute) > 59) return null

  let normalizedHour = hour
  if ((period === 'malam' || period === 'sore') && normalizedHour < 12) normalizedHour += 12
  if (period === 'siang' && normalizedHour < 11) normalizedHour += 12
  if (period === 'pagi' && normalizedHour === 12) normalizedHour = 0

  return `${String(normalizedHour).padStart(2, '0')}:${minute}`
}

function buildDraftTask(parsedTask, extractedTask) {
  const dueDate = extractedTask.dueDate || (extractedTask.dueTime ? 'today' : undefined)

  return {
    ...parsedTask,
    dueDate,
    dueDateValue: resolveDueDateValue(dueDate),
    dueTime: extractedTask.dueTime,
  }
}

function toTaskPayload(task, reminderMinutes = 30) {
  return {
    title: task.title,
    category: task.category,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDateValue,
    dueTime: task.dueTime,
    reminderMinutes,
  }
}

function hasScheduleSignal(task) {
  return Boolean(task.dueDate || task.dueTime)
}

function getProfileName(profile, memories = []) {
  return profile?.name || ''
}

function buildAcknowledgement(profile, memories = []) {
  const name = getProfileName(profile, memories)
  return name ? `Baik ${name}.` : 'Baik.'
}

function asSentence(text = '') {
  return text.endsWith('.') ? text : `${text}.`
}

function buildTimeClarification(task, profile) {
  return [
    buildAcknowledgement(profile),
    '',
    `${formatTaskTitle(task.title)} akan dijadwalkan ${formatDueDateText(task.dueDate)}.`,
    '',
    'Pilih waktu pengingat:',
  ].join('\n')
}

function buildTimeSelectedConfirmation(task) {
  return [
    'Siap.',
    '',
    'Saya akan mengingatkan',
    `${formatReminderText(task)}.`,
    '',
    'Task berhasil dibuat.',
  ].join('\n')
}

function buildImmediateScheduleConfirmation(task, memories, profile) {
  const goalSupport = getGoalSupport(task, memories)
  const lines = [
    buildAcknowledgement(profile, memories),
    '',
    `${formatTaskTitle(task.title)} dijadwalkan`,
    `${formatReminderText(task)}.`,
  ]

  if (goalSupport) {
    lines.push('', goalSupport.message)
  }

  return lines.join('\n')
}

function loadPendingTask() {
  if (typeof window === 'undefined') return null

  try {
    const savedTask = window.localStorage.getItem(PENDING_TASK_KEY)
    return savedTask ? JSON.parse(savedTask) : null
  } catch {
    return null
  }
}

function buildTaskSuggestion(task) {
  if (task.priority === 'high') {
    return 'Saya sarankan ini masuk antrean pertama supaya tidak mengganggu prioritas lain.'
  }

  if (task.category === 'content') {
    return task.dueDate === 'tomorrow'
      ? 'Fokus selesaikan draft sebelum siang agar masih ada ruang untuk revisi dan publikasi.'
      : 'Mulai dari outline singkat dulu, lalu lanjutkan ke draft supaya prosesnya tetap ringan.'
  }

  if (task.category === 'work') {
    return 'Kerjakan dengan konteks terakhir yang tersedia, lalu catat follow-up berikutnya setelah selesai.'
  }

  if (task.dueDate === 'today') {
    return 'Letakkan di slot kerja terdekat agar tidak menumpuk di akhir hari.'
  }

  return 'Saya akan simpan ini sebagai tugas aktif dan bantu jaga prioritasnya saat kamu review daftar tugas.'
}

function countActiveTasks(tasks, createdTask) {
  const byId = new Map()
  tasks.forEach((task) => {
    if (task.id) byId.set(task.id, task)
  })
  if (createdTask.id) byId.set(createdTask.id, createdTask)

  return Array.from(byId.values()).filter((task) => task.status !== 'completed').length
}

function buildTaskCreatedResponse(task, memories, tasks, profile) {
  const userName = getProfileName(profile, memories)
  const activeTaskCount = Number.isFinite(task.activeTaskCount)
    ? task.activeTaskCount
    : countActiveTasks(tasks, task)
  const goalSupport = getGoalSupport(task, memories)

  const lines = [
    userName ? `Siap ${userName}.` : 'Siap.',
    '',
    'Saya sudah menambahkan tugas baru.',
    '',
    `Tugas: ${formatTaskTitle(task.title)}`,
    `Jadwal: ${formatTaskDue(task)}`,
    `Kategori: ${formatTaskCategory(task.category)}`,
    '',
    userName
      ? `${userName}, ada ${activeTaskCount} tugas aktif hari ini.`
      : `Ada ${activeTaskCount} tugas aktif hari ini.`,
  ]

  if (goalSupport) {
    lines.push('', goalSupport.message)
  }

  lines.push(
    '',
    'Saran:',
    buildTaskSuggestion(task)
  )

  return lines.join('\n')
}

function formatLeadStatus(status) {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

function buildLeadCreatedResponse(lead) {
  return [
    'Lead baru sudah disimpan.',
    '',
    `${lead.name} — ${formatLeadStatus(lead.status || 'new')}`,
    `Source: ${lead.source || 'Manual'}`,
  ].join('\n')
}

function buildGeneratedContentCreatedResponse(generated) {
  return [
    'Draft berhasil dibuat.',
    '',
    'Disimpan ke Content Workspace.',
  ].join('\n')
}

function buildHomeSummary(tasks, profile, priorityCoach) {
  const userContext = buildUserContext(profile)
  const greeting = buildDailyGreeting(profile)
  const activeTasks = getActiveTasks(tasks)
  const highPriorityTasks = activeTasks.filter((task) => task.priority === 'high')
  const reminderCount = activeTasks.filter((task) => task.dueTime).length
  const focusTask = priorityCoach.priorities[0] || getPriorityTasks(tasks)[0]

  if (!profile || profile.isFallback) {
    return [
      userContext.greeting,
      '',
      userContext.recommendation,
    ].join('\n')
  }

  if (activeTasks.length === 0) {
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
      'Hari ini:',
      'Belum ada tugas aktif.',
      '',
      'Fokus:',
      'Tentukan satu target utama.',
    ].join('\n')
  }

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
    'Hari ini:',
    `• ${activeTasks.length} tugas aktif`,
    `• ${highPriorityTasks.length} prioritas tinggi`,
    `• ${reminderCount} reminder`,
    '',
    'Fokus:',
    focusTask?.title || 'Review prioritas hari ini.',
  ].join('\n')
}

function buildTaskSummaryResponse(tasks, profile) {
  const total = tasks.length
  const completed = tasks.filter((task) => task.status === 'completed').length
  const active = tasks.filter((task) => task.status !== 'completed').length
  const highPriority = tasks.filter((task) => task.status !== 'completed' && task.priority === 'high').length
  const focusTask = getHighImpactTask(tasks)

  if (total === 0) {
    return [
      'Belum ada task yang aktif.',
      '',
      'Mau mulai dari satu hal kecil?',
    ].join('\n')
  }

  const name = profile?.name
  return [
    name ? `${name}, masih ada beberapa hal yang berjalan.` : 'Masih ada beberapa hal yang berjalan.',
    '',
    completed > 0 ? `${completed} sudah selesai.` : 'Belum ada yang ditandai selesai.',
    active > 0 ? `${active} masih aktif.` : 'Tidak ada task aktif sekarang.',
    '',
    highPriority > 0 && focusTask
      ? `Kalau pilih satu, aku mulai dari ${formatTaskTitle(focusTask.title)}.`
      : 'Menurutku cukup pilih satu fokus pendek dulu.',
  ].join('\n')
}

function buildReminderSummaryResponse(tasks = []) {
  const reminders = getUpcomingTasks(tasks, { limit: 5, windowHours: 48 })
    .filter((task) => task.dueTime)

  if (reminders.length === 0) {
    return 'Belum ada reminder 48 jam ke depan.'
  }

  return [
    'Reminder terdekat:',
    '',
    ...reminders.map((task) => `• ${formatReminderTime(task.dueTime)} — ${task.title}`),
  ].join('\n')
}

function normalizeStatus(value = '') {
  return String(value).toLowerCase().replace(/[_-]/g, ' ').trim()
}

function getLeadLabel(lead = {}) {
  return lead.name || lead.company || 'this lead'
}

function getLeadPriorityRank(lead = {}) {
  const status = normalizeStatus(lead.status)
  if (/follow\s*up/.test(status)) return 1
  if (status === 'new') return 2
  if (status === 'contacted') return 3
  return 8
}

function getMostImportantLead(leads = []) {
  return [...leads]
    .filter((lead) => !['won', 'lost', 'closed'].includes(normalizeStatus(lead.status)))
    .sort((a, b) => getLeadPriorityRank(a) - getLeadPriorityRank(b))[0] || null
}

function getReadyContent(content = []) {
  return content.find((item) =>
    ['approved', 'ready', 'ready to publish', 'ready_to_publish'].includes(normalizeStatus(item.status))
  ) || null
}

function getDraftContent(content = []) {
  return content.find((item) =>
    ['draft', 'review', 'needs review'].includes(normalizeStatus(item.status))
  ) || null
}

function getHighImpactTask(tasks = []) {
  return tasks.find((task) =>
    task.status !== 'completed' && normalizeStatus(task.priority) === 'high'
  ) || tasks.find((task) => task.status !== 'completed') || null
}

function buildFocusTodayReply({ tasks = [], leads = [], content = [] }) {
  const lead = getMostImportantLead(leads)
  if (lead) {
    const company = lead.company ? ` dari ${lead.company}` : ''
    return softenRecommendation([
      `Kalau aku jadi kamu, aku akan mulai dari ${getLeadLabel(lead)}${company}.`,
      '',
      'Impact-nya paling besar hari ini.',
    ].join('\n'))
  }

  const task = getHighImpactTask(tasks)
  if (task) {
    return softenRecommendation([
      `Menurutku mulai dari ${formatTaskTitle(task.title)} dulu.`,
      '',
      'Satu hal ini cukup untuk membuka momentum.',
    ].join('\n'))
  }

  const contentItem = getReadyContent(content) || getDraftContent(content)
  if (contentItem) {
    return softenRecommendation([
      `Aku akan lanjutkan ${contentItem.title || 'draft konten'} dulu.`,
      '',
      'Jangan buka terlalu banyak hal dulu.',
    ].join('\n'))
  }

  return softenRecommendation([
    'Belum ada yang benar-benar mendesak.',
    '',
    'Pilih satu hal kecil saja dulu.',
  ].join('\n'))
}

function buildReviewLeadsReply(leads = []) {
  const lead = getMostImportantLead(leads)

  if (!lead) {
    return [
      'Aku belum melihat prospek yang perlu dikejar sekarang.',
      '',
      'Kalau ada nama baru, cukup bilang saja.',
    ].join('\n')
  }

  const status = formatLeadStatus(normalizeStatus(lead.status || 'new'))
  const company = lead.company ? ` di ${lead.company}` : ''
  return [
    `Yang paling perlu dicek: ${getLeadLabel(lead)}${company}.`,
    '',
    `Statusnya ${status}.`,
    '',
    'Aku sarankan follow up singkat dulu.',
  ].join('\n')
}

function buildCreateContentReply() {
  return [
    'Mau buat konten untuk platform apa?',
    '',
    'Instagram, X, atau YouTube?',
  ].join('\n')
}

function buildWhatDidIMissReply({ tasks = [], leads = [], content = [] }) {
  const overdueTask = tasks.find((task) => task.status !== 'completed' && (
    task.dueDate === 'overdue' || task.isOverdue
  ))

  if (overdueTask) {
    return [
      `Yang jangan kelewat: ${formatTaskTitle(overdueTask.title)}.`,
      '',
      'Kelihatannya sudah lewat waktu.',
      'Cukup bereskan satu ini dulu.',
    ].join('\n')
  }

  const lead = getMostImportantLead(leads)
  if (lead) {
    return [
      `Aku akan cek ${getLeadLabel(lead)} dulu.`,
      '',
      'Prospek ini masih butuh follow up.',
    ].join('\n')
  }

  const contentItem = getReadyContent(content) || getDraftContent(content)
  if (contentItem) {
    return [
      `Ada konten yang bisa dilanjutkan: ${contentItem.title || 'draft konten'}.`,
      '',
      'Tidak perlu mulai dari nol.',
    ].join('\n')
  }

  return [
    'Tidak ada yang terlalu mendesak.',
    '',
    'Menurutku cukup pilih satu fokus pendek.',
  ].join('\n')
}

function buildDailySummaryReply(tasks = [], leads = [], content = []) {
  const completed = tasks.filter((task) => task.status === 'completed').length
  const active = tasks.filter((task) => task.status !== 'completed').length
  const lead = getMostImportantLead(leads)
  const contentItem = getReadyContent(content) || getDraftContent(content)

  if (completed === 0 && active === 0 && !lead && !contentItem) {
    return [
      'Hari ini masih cukup kosong di data Nexus.',
      '',
      'Kalau ada hal penting, ceritakan saja.',
      'Aku simpan konteksnya.',
    ].join('\n')
  }

  return [
    'Ringkasnya begini.',
    '',
    completed > 0 ? `${completed} hal sudah selesai.` : 'Belum ada yang ditandai selesai.',
    active > 0 ? 'Masih ada beberapa hal yang belum selesai.' : 'Tidak ada task aktif yang menonjol.',
    '',
    lead ? `Yang perlu dijaga: ${getLeadLabel(lead)}.` : 'Prospek terlihat aman sementara.',
  ].join('\n')
}

function buildTomorrowPlanReply({ tasks = [], leads = [], content = [] }) {
  const oneThing = buildFocusTodayReply({ tasks, leads, content })

  return [
    'Bisa.',
    '',
    'Untuk besok, aku akan taruh satu hal ini di depan:',
    '',
    oneThing,
  ].join('\n')
}

function isContentDraftRequest(text = '') {
  return /\b(buat(?:kan)?|bikin)\s+draft(?:nya)?\b/i.test(text)
}

function normalizeContentPlatform(text = '') {
  const normalized = text.trim().toLowerCase()
  if (normalized === 'instagram' || normalized === 'ig') return 'Instagram'
  if (normalized === 'x' || normalized === 'twitter') return 'X'
  if (normalized === 'youtube' || normalized === 'yt') return 'YouTube'

  return ''
}

function isContentPriority(task = {}) {
  const text = `${task.title || ''} ${task.category || ''}`.toLowerCase()
  return task.category === 'content' || /\b(konten|content|instagram|youtube|caption|thread)\b/i.test(text)
}

function isLeadPriority(task = {}) {
  const text = `${task.title || ''} ${task.category || ''}`.toLowerCase()
  return task.category === 'work' || /\b(follow up|followup|lead|client|customer|hubungi)\b/i.test(text)
}

function normalizeLookupText(value = '') {
  return value
    .toLowerCase()
    .replace(/\b(follow up|followup|hubungi|lead|client|customer|meeting|dengan|ke|hapus|delete|buang|konten|content|draft|task|tugas|selesai|done|contacted|dihubungi)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenizeLookup(value = '') {
  return normalizeLookupText(value)
    .split(/\s+/)
    .filter((token) => token.length > 1)
}

function getMatchScore(query = '', itemText = '') {
  const queryTokens = tokenizeLookup(query)
  const item = normalizeLookupText(itemText)
  if (!queryTokens.length || !item) return 0

  const hits = queryTokens.filter((token) => item.includes(token)).length
  return hits / queryTokens.length
}

function findBestMatch(query = '', items = [], getText = (item) => item.title || item.name || '') {
  const scored = items
    .map((item) => ({
      item,
      score: getMatchScore(query, getText(item)),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)

  return scored[0]?.score >= 0.34 ? scored[0].item : null
}

function capitalizeHumanName(value = '') {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

function cleanLeadNameCandidate(value = '') {
  return value
    .replace(/\s+(dan|dengan|untuk)\s+.*$/i, '')
    .replace(/\b(sebagai|jadi)\s+(lead|prospek|client|klien)\b.*$/i, '')
    .replace(/\b(besok|hari ini|jam\s*\d{1,2}(?:[.:]\d{2})?\s*(pagi|siang|sore|malam)?|follow\s*up|followup|hubungi|kontak)\b.*$/i, '')
    .replace(/[.,!?]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractLeadActionDetails(text = '') {
  const patterns = [
    /\b(?:tambahkan|tambah|add|masukkan|simpan)\s+(.+?)\s+(?:sebagai|jadi)\s+(?:lead|prospek|client|klien)\b/i,
    /\b(?:tambahkan|tambah|add|masukkan|simpan)\s+(?:lead|prospek|client|klien)\s+(.+)$/i,
    /\b(?:lead|prospek|client|klien)\s+(?:baru\s+)?(?:bernama\s+|nama(?:nya)?\s+)?(.+)$/i,
  ]

  const match = patterns.map((pattern) => text.match(pattern)).find(Boolean)
  const rawName = cleanLeadNameCandidate(match?.[1] || '')
  if (!rawName) return null

  return {
    name: capitalizeHumanName(rawName),
    source: /\binstagram|ig\b/i.test(text) ? 'Instagram' : 'Manual',
    status: /\b(contacted|sudah dihubungi)\b/i.test(text) ? 'contacted' : 'new',
    notes: text,
  }
}

function hasFollowUpSignal(text = '') {
  return /\b(follow\s*up|followup|hubungi|kontak|ingatkan)\b/i.test(text)
}

function isFollowUpTaskCreateRequest(text = '') {
  return hasFollowUpSignal(text)
    && /\b(buat(?:kan)?|bikin|jadwalkan|ingatkan|tambahkan|tambah|create)\b/i.test(text)
    && !/\b(sudah|telah|tandai|mark|set)\b/i.test(text)
}

function extractFollowUpName(text = '') {
  const match = text.match(/\b(?:follow\s*up|followup|hubungi|kontak)\s+(.+)$/i)
  const rawName = cleanLeadNameCandidate(match?.[1] || '')
  return rawName ? capitalizeHumanName(rawName) : ''
}

function extractFollowUpSchedule(text = '') {
  const dueDate = /\bbesok\b/i.test(text)
    ? 'tomorrow'
    : /\bhari ini\b/i.test(text)
      ? 'today'
      : undefined

  return {
    dueDate,
    dueDateValue: resolveDueDateValue(dueDate),
    dueTime: parseTimeAnswer(text),
  }
}

function buildFollowUpTask(text = '', lead = {}) {
  const schedule = extractFollowUpSchedule(text)
  return {
    title: `Follow up ${lead.name}`,
    category: 'work',
    status: 'pending',
    priority: 'medium',
    ...schedule,
  }
}

function formatFollowUpScheduleText(task = {}) {
  const dateText = task.dueDate === 'tomorrow'
    ? 'besok'
    : task.dueDate === 'today'
      ? 'hari ini'
      : ''
  const timeText = task.dueTime
    ? `jam ${Number(task.dueTime.slice(0, 2))}${task.dueTime.endsWith(':00') ? '' : `:${task.dueTime.slice(3)}`}`
    : ''

  return [dateText, timeText].filter(Boolean).join(' ')
}

function verifyLeadExists(createdLead, expectedName) {
  return Boolean(
    createdLead?.id
    && normalizeLookupText(createdLead.name) === normalizeLookupText(expectedName)
  )
}

function verifyTaskExists(createdTask, expectedTitle) {
  return Boolean(
    createdTask?.id
    && normalizeLookupText(createdTask.title) === normalizeLookupText(expectedTitle)
  )
}

function getContentActionItems(generatedContent = [], contentIdeas = []) {
  return [
    ...generatedContent.map((item) => ({
      ...item,
      source: 'generated',
      actionTitle: item.title || 'Untitled draft',
      actionKind: 'content',
    })),
    ...contentIdeas.map((item) => ({
      ...item,
      source: 'idea',
      actionTitle: item.title || 'Untitled content',
      actionKind: 'content',
    })),
  ]
}

function isDraftContent(item = {}) {
  return ['draft', 'drafted', 'idea', 'pending'].includes(String(item.status || '').toLowerCase())
}

function isDeleteContentRequest(text = '') {
  return /\b(hapus|delete|buang)\b/i.test(text)
    && /\b(draft|konten|content|instagram|youtube|caption|post)\b/i.test(text)
}

function isDeleteAllRequest(text = '') {
  return /\b(semua|seluruh|all)\b/i.test(text)
}

function isCriticalActionRequest(text = '') {
  return /\b(reset workspace|delete all memory|hapus semua memory|hapus semua memori|delete all tasks|hapus semua task|hapus semua tugas|delete everything|hapus semuanya|reset semuanya)\b/i.test(text)
}

function isMarkTaskDoneRequest(text = '') {
  return /\b(task|tugas)\b/i.test(text)
    && /\b(tandai|mark|jadikan|set|selesaikan|complete|selesai|done|completed)\b/i.test(text)
}

function isDeleteTaskRequest(text = '') {
  return /\b(hapus|delete|buang)\b/i.test(text)
    && /\b(task|tugas)\b/i.test(text)
}

function isMarkLeadContactedRequest(text = '') {
  return /\b(tandai|mark|set|sudah)\b/i.test(text)
    && /\b(lead|prospek|client|klien)\b/i.test(text)
    && /\b(contacted|dihubungi|hubungi|follow up|followup)\b/i.test(text)
}

function isDeleteLeadRequest(text = '') {
  return /\b(hapus|delete|buang)\b/i.test(text)
    && /\b(lead|prospek|client|klien)\b/i.test(text)
}

function findRelatedLead(task, leads = []) {
  const taskText = normalizeLookupText(task?.title)
  if (!taskText) return null

  return leads.find((lead) => {
    const leadName = normalizeLookupText(lead.name)
    return leadName && (taskText.includes(leadName) || leadName.includes(taskText))
  }) || null
}

function findRelatedContent(task, generatedContent = []) {
  const taskText = normalizeLookupText(task?.title)
  if (!taskText) return null

  return generatedContent.find((item) => {
    const title = normalizeLookupText(item.title)
    return title && (taskText.includes(title) || title.includes(taskText))
  }) || null
}

export default function JarvisHome({
  tasks,
  leads = [],
  contentIdeas = [],
  generatedContent = [],
  memories,
  userProfile,
  onAddTask,
  onAddLead,
  onAddContentIdea,
  onAddGeneratedContent,
  onAddMemory,
  onToggleTask,
  onDeleteTask,
  onDeleteLead,
  onDeleteContentIdea,
  onDeleteGeneratedContent,
  onMarkLeadContacted,
  onMarkContentDrafted,
  tasksLoading,
  onShowTasks,
  onShowLeads,
  onShowContent,
  onShowSettings,
  profileCompleted = false,
  onboardingReady = true,
}) {
  const upcomingTasks = useMemo(() =>
    getUpcomingTasks(tasks, { limit: 8, windowHours: 48 })
      .filter((task) => task.dueTime)
      .slice(0, 4),
  [tasks])
  const priorityCoach = buildPriorityCoach(tasks)
  const nexusScore = buildNexusScore(tasks)
  const homeSummary = buildHomeSummary(tasks, userProfile, priorityCoach)
  const topPriority = priorityCoach.priorities[0]
  const relatedLead = topPriority ? findRelatedLead(topPriority, leads) : null
  const relatedContent = topPriority ? findRelatedContent(topPriority, contentIdeas) : null
  const planningInputs = useMemo(() => ({
    tasks,
    leads,
    content: generatedContent,
    reminders: upcomingTasks,
    profile: userProfile,
  }), [tasks, leads, generatedContent, upcomingTasks, userProfile])
  const focusInputs = useMemo(() => ({
    tasks,
    leads,
    content: generatedContent,
    reminders: upcomingTasks,
  }), [tasks, leads, generatedContent, upcomingTasks])
  const briefingInputs = useMemo(() => ({
    tasks,
    leads,
    content: [...generatedContent, ...contentIdeas],
    memories,
  }), [contentIdeas, generatedContent, leads, memories, tasks])
  const reviewInputs = useMemo(() => ({
    tasks,
    leads,
    content: generatedContent,
    reminders: upcomingTasks,
  }), [tasks, leads, generatedContent, upcomingTasks])
  const weeklyReviewInputs = reviewInputs
  const executiveBriefing = useMemo(() => generateExecutiveBriefing({
    tasks,
    leads,
    content: [...generatedContent, ...contentIdeas],
    reminders: upcomingTasks,
    profile: userProfile,
  }), [contentIdeas, generatedContent, leads, tasks, upcomingTasks, userProfile])
  const contentReadyCount = useMemo(() => generatedContent.filter((item) =>
    ['approved', 'ready', 'ready_to_publish'].includes(String(item.status || '').toLowerCase())
  ).length, [generatedContent])
  const dailyBriefingCards = useMemo(() => buildDailyBriefingCards(briefingInputs), [briefingInputs])
  const [lastSeenAt] = useState(getStoredLastSeenAt)

  const [messages, setMessages] = useState([
    {
      role: 'ai',
      type: 'daily-briefing',
      text: buildNexusWelcomeMessage(userProfile, profileCompleted, memories, lastSeenAt),
      time: getCurrentTime(),
    },
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isThinking, setIsThinking] = useState(false)
  const [thinkingText, setThinkingText] = useState(THINKING_MESSAGES[0])
  const [pendingTask, setPendingTask] = useState(loadPendingTask)
  const [pendingContentDraft, setPendingContentDraft] = useState(null)
  const [pendingAction, setPendingAction] = useState(null)
  const [pendingConfirmation, setPendingConfirmation] = useState(null)
  const [focusTask, setFocusTask] = useState(() => generateFocusTask(focusInputs))
  const [selectedFocusMinutes, setSelectedFocusMinutes] = useState(() => generateFocusTask(focusInputs).duration)
  const [focusSession, setFocusSession] = useState({
    active: false,
    remainingSeconds: 0,
  })
  const [dailyPlan, setDailyPlan] = useState(() => generateDailyPlan(planningInputs))
  const [dailyReview, setDailyReview] = useState(() => generateDailyReview(reviewInputs))
  const [isReviewExpanded, setIsReviewExpanded] = useState(false)
  const [weeklyReview, setWeeklyReview] = useState(() => generateWeeklyReview(weeklyReviewInputs))
  const [isWeeklyReviewExpanded, setIsWeeklyReviewExpanded] = useState(false)
  const scrollRef = useRef(null)
  const messagesEndRef = useRef(null)
  const isProgrammaticScrollRef = useRef(false)
  const [isPinnedToLatest, setIsPinnedToLatest] = useState(true)

  const scrollToLatest = useCallback((behavior = 'smooth') => {
    const container = scrollRef.current
    const end = messagesEndRef.current
    if (!container || !end) return

    isProgrammaticScrollRef.current = true
    container.scrollTo({
      top: Math.max(0, container.scrollHeight - container.clientHeight),
      behavior,
    })
    setIsPinnedToLatest(true)

    window.setTimeout(() => {
      isProgrammaticScrollRef.current = false
    }, behavior === 'smooth' ? 360 : 0)
  }, [])

  const handleChatScroll = useCallback(() => {
    if (isProgrammaticScrollRef.current) return

    const container = scrollRef.current
    if (!container) return

    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight
    setIsPinnedToLatest(distanceFromBottom < 72)
  }, [])

  useEffect(() => {
    if (!isPinnedToLatest) return
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => scrollToLatest('smooth'))
    })
  }, [messages, isThinking, isTyping, isPinnedToLatest, scrollToLatest])

  const createFocusTask = useCallback(() => {
    const nextFocusTask = generateFocusTask(focusInputs)
    setFocusTask(nextFocusTask)
    setSelectedFocusMinutes(nextFocusTask.duration)
    return nextFocusTask
  }, [focusInputs])

  useEffect(() => {
    const nextFocusTask = generateFocusTask(focusInputs)
    setFocusTask(nextFocusTask)
    setSelectedFocusMinutes(nextFocusTask.duration)
  }, [focusInputs])

  useEffect(() => {
    if (!focusSession.active) return undefined

    const timer = window.setInterval(() => {
      setFocusSession((current) => {
        if (!current.active) return current
        if (current.remainingSeconds <= 1) {
          return {
            active: false,
            remainingSeconds: 0,
          }
        }

        return {
          ...current,
          remainingSeconds: current.remainingSeconds - 1,
        }
      })
    }, 1000)

    return () => window.clearInterval(timer)
  }, [focusSession.active])

  const startFocusSession = useCallback(() => {
    setFocusSession({
      active: true,
      remainingSeconds: selectedFocusMinutes * 60,
    })
  }, [selectedFocusMinutes])

  const createDailyPlan = useCallback(() => {
    const plan = generateDailyPlan(planningInputs)
    setDailyPlan(plan)
    return plan
  }, [planningInputs])

  useEffect(() => {
    setDailyPlan(generateDailyPlan(planningInputs))
  }, [planningInputs])

  const createDailyReview = useCallback(() => {
    const review = generateDailyReview(reviewInputs)
    setDailyReview(review)
    return review
  }, [reviewInputs])

  useEffect(() => {
    setDailyReview(generateDailyReview(reviewInputs))
  }, [reviewInputs])

  const createWeeklyReview = useCallback(() => {
    const review = generateWeeklyReview(weeklyReviewInputs)
    setWeeklyReview(review)
    return review
  }, [weeklyReviewInputs])

  useEffect(() => {
    setWeeklyReview(generateWeeklyReview(weeklyReviewInputs))
  }, [weeklyReviewInputs])

  useEffect(() => {
    if (typeof window === 'undefined') return

    if (!pendingTask) {
      window.localStorage.removeItem(PENDING_TASK_KEY)
      return
    }

    window.localStorage.setItem(PENDING_TASK_KEY, JSON.stringify(pendingTask))
  }, [pendingTask])

  useEffect(() => {
    if (tasksLoading) return

    setMessages((current) =>
      current.map((message, index) =>
        index === 0 && message.type === 'daily-briefing'
          ? {
            ...message,
            text: buildNexusWelcomeMessage(userProfile, profileCompleted, memories, lastSeenAt),
          }
          : message
      )
    )
  }, [lastSeenAt, memories, profileCompleted, tasksLoading, userProfile])

  useEffect(() => {
    storeLastSeenAt()
  }, [messages.length])

  const createScheduledTask = async (task, reminderMinutes = 30) => {
    const createdTask = await onAddTask(toTaskPayload(task, reminderMinutes))
    return {
      ...task,
      ...createdTask,
      dueDate: task.dueDate,
      dueTime: task.dueTime,
      reminderMinutes,
    }
  }

  const executeLeadCreation = async (text, leadPayload) => {
    if (!onAddLead) {
      setMessages((prev) => [...prev, { role: 'ai', text: STATE_SAVE_FAILED, time: getCurrentTime() }])
      return true
    }

    try {
      const payload = leadPayload || extractLeadActionDetails(text)
      if (!payload?.name) return false

      const createdLead = await onAddLead(payload)
      if (!verifyLeadExists(createdLead, payload.name)) {
        throw new Error('Lead verification failed.')
      }

      const shouldCreateFollowUp = hasFollowUpSignal(text)
      if (!shouldCreateFollowUp) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'ai',
            text: `${createdLead.name} sudah saya tambahkan sebagai lead.`,
            time: getCurrentTime(),
            action: {
              label: 'Lihat Lead',
              onClick: onShowLeads,
            },
          },
        ])
        return true
      }

      const followUpTask = buildFollowUpTask(text, createdLead)
      const createdTask = await createScheduledTask(followUpTask)
      if (!verifyTaskExists(createdTask, followUpTask.title)) {
        throw new Error('Follow-up task verification failed.')
      }

      const scheduleText = formatFollowUpScheduleText(followUpTask)
      setMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          text: [
            `${createdLead.name} sudah saya tambahkan sebagai lead.`,
            `Task follow up${scheduleText ? ` ${scheduleText}` : ''} juga sudah dibuat.`,
          ].join('\n'),
          time: getCurrentTime(),
          action: {
            label: 'Lihat Task',
            onClick: onShowTasks,
          },
        },
      ])
      return true
    } catch (error) {
      console.error('[Nexus State] Lead creation failed:', error)
      setMessages((prev) => [...prev, { role: 'ai', text: STATE_SAVE_FAILED, time: getCurrentTime() }])
      return true
    }
  }

  const executeFollowUpTaskCreation = async (text) => {
    if (!isFollowUpTaskCreateRequest(text)) return false

    try {
      const mentionedName = extractFollowUpName(text)
      const matchedLead = findBestMatch(mentionedName || text, leads, (lead) => `${lead.name || ''} ${lead.company || ''}`)
      const leadName = matchedLead?.name || mentionedName
      if (!leadName) return false

      const followUpTask = buildFollowUpTask(text, { name: leadName })
      const createdTask = await createScheduledTask(followUpTask)
      if (!verifyTaskExists(createdTask, followUpTask.title)) {
        throw new Error('Follow-up task verification failed.')
      }

      const scheduleText = formatFollowUpScheduleText(followUpTask)
      setMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          text: `Task follow up ${leadName}${scheduleText ? ` ${scheduleText}` : ''} sudah dibuat.`,
          time: getCurrentTime(),
          action: {
            label: 'Lihat Task',
            onClick: onShowTasks,
          },
        },
      ])
      return true
    } catch (error) {
      console.error('[Nexus State] Follow-up task creation failed:', error)
      setMessages((prev) => [...prev, { role: 'ai', text: STATE_SAVE_FAILED, time: getCurrentTime() }])
      return true
    }
  }

  const executeStateCommand = async (text) => {
    const leadDetails = extractLeadActionDetails(text)
    if (leadDetails) return executeLeadCreation(text, leadDetails)

    return executeFollowUpTaskCreation(text)
  }

  const saveGeneratedDraft = async (generated) => {
    if (!onAddGeneratedContent) {
      showUnavailable()
      return
    }

    await onAddGeneratedContent({
      platform: generated.platform,
      title: generated.title,
      content: JSON.stringify(generated),
      status: 'draft',
    })

    setMessages((prev) => [
      ...prev,
      {
        role: 'ai',
        text: buildGeneratedContentCreatedResponse(generated),
        time: getCurrentTime(),
      },
    ])

    if (onShowContent) {
      window.setTimeout(onShowContent, 350)
    }
  }

  const deleteContentItem = async (item) => {
    if (!item) throw new Error('Content not found.')
    if (item.source === 'generated') {
      if (!onDeleteGeneratedContent) throw new Error('Generated content delete is unavailable.')
      await onDeleteGeneratedContent(item.id)
      return
    }

    if (!onDeleteContentIdea) throw new Error('Content idea delete is unavailable.')
    await onDeleteContentIdea(item.id)
  }

  const resolveContentTarget = (text, candidates = getContentActionItems(generatedContent, contentIdeas).filter(isDraftContent)) => {
    const directMatch = findBestMatch(text, candidates, (item) => `${item.title || ''} ${item.platform || ''}`)
    if (directMatch) return { target: directMatch }
    if (candidates.length === 1) return { target: candidates[0] }
    if (candidates.length > 1) return { needsClarification: true, candidates }
    return { notFound: true }
  }

  const resolveTaskTarget = (text, candidates = tasks.filter((task) => task.status !== 'completed')) => {
    const directMatch = findBestMatch(text, candidates, (task) => task.title || '')
    if (directMatch) return { target: directMatch }
    if (candidates.length === 1) return { target: candidates[0] }
    if (candidates.length > 1) return { needsClarification: true, candidates }
    return { notFound: true }
  }

  const resolveLeadTarget = (text, candidates = leads) => {
    const directMatch = findBestMatch(text, candidates, (lead) => `${lead.name || ''} ${lead.company || ''}`)
    if (directMatch) return { target: directMatch }
    if (candidates.length === 1) return { target: candidates[0] }
    if (candidates.length > 1) return { needsClarification: true, candidates }
    return { notFound: true }
  }

  const getActionLabel = (item) => item.actionTitle || item.title || item.name || item.company || 'Untitled'

  const askActionClarification = (type, candidates, prompt) => {
    setPendingAction({ type, candidates })
    setMessages((prev) => [
      ...prev,
      {
        role: 'ai',
        text: prompt,
        time: getCurrentTime(),
        quickActions: candidates.slice(0, 6).map(getActionLabel),
      },
    ])
  }

  const executeActionTarget = async (type, target) => {
    if (type === 'delete_content') {
      await deleteContentItem(target)
      return 'Sudah saya hapus draft itu dari Content.'
    }

    if (type === 'delete_all_content') {
      await Promise.all(target.map(deleteContentItem))
      return target.length === 1
        ? 'Sudah saya hapus draft itu dari Content.'
        : `Sudah saya hapus ${target.length} draft dari Content.`
    }

    if (type === 'mark_task_done') {
      if (!onToggleTask) throw new Error('Task update is unavailable.')
      await onToggleTask(target.id, target.status)
      return `Sudah saya tandai task "${target.title}" selesai.`
    }

    if (type === 'delete_task') {
      if (!onDeleteTask) throw new Error('Task delete is unavailable.')
      await onDeleteTask(target.id)
      return `Sudah saya hapus task "${target.title}".`
    }

    if (type === 'mark_lead_contacted') {
      if (!onMarkLeadContacted) throw new Error('Lead update is unavailable.')
      await onMarkLeadContacted(target.id)
      return `Sudah saya tandai ${target.name || target.company || 'lead itu'} sebagai contacted.`
    }

    if (type === 'delete_lead') {
      if (!onDeleteLead) throw new Error('Lead delete is unavailable.')
      await onDeleteLead(target.id)
      return `Sudah saya hapus lead ${target.name || target.company || 'itu'}.`
    }

    throw new Error('Unknown action.')
  }

  const requestActionConfirmation = ({ type, target, summary, successText, failText }) => {
    setPendingConfirmation({
      type,
      target,
      successText,
      failText,
    })
    setMessages((prev) => [
      ...prev,
      {
        role: 'ai',
        text: summary,
        time: getCurrentTime(),
        quickActions: ['Ya, Hapus', 'Batal'],
      },
    ])
  }

  const isDestructiveAction = (type) =>
    ['delete_content', 'delete_all_content', 'delete_task', 'delete_lead'].includes(type)

  const buildDeleteConfirmation = (type, target) => {
    if (type === 'delete_all_content') {
      return {
        summary: [
          `Saya menemukan ${target.length} draft.`,
          '',
          'Apakah kamu yakin ingin menghapus semuanya?',
        ].join('\n'),
        successText: target.length === 1
          ? 'Sudah saya hapus draft itu dari Content.'
          : `Sudah saya hapus ${target.length} draft dari Content.`,
        failText: 'Belum berhasil saya hapus. Ada masalah saat memperbarui data.',
      }
    }

    if (type === 'delete_content') {
      return {
        summary: [
          `Saya menemukan draft: ${getActionLabel(target)}.`,
          '',
          'Apakah kamu yakin ingin menghapus draft ini?',
        ].join('\n'),
        successText: 'Sudah saya hapus draft itu dari Content.',
        failText: 'Belum berhasil saya hapus. Ada masalah saat memperbarui data.',
      }
    }

    if (type === 'delete_task') {
      return {
        summary: [
          `Saya menemukan task: ${getActionLabel(target)}.`,
          '',
          'Apakah kamu yakin ingin menghapus task ini?',
        ].join('\n'),
        successText: `Sudah saya hapus task "${target.title}".`,
        failText: 'Belum berhasil saya hapus. Ada masalah saat memperbarui data.',
      }
    }

    if (type === 'delete_lead') {
      return {
        summary: [
          `Saya menemukan lead: ${getActionLabel(target)}.`,
          '',
          'Apakah kamu yakin ingin menghapus lead ini?',
        ].join('\n'),
        successText: `Sudah saya hapus lead ${target.name || target.company || 'itu'}.`,
        failText: 'Belum berhasil saya hapus. Ada masalah saat memperbarui data.',
      }
    }

    return null
  }

  const confirmDestructiveAction = (type, target) => {
    const confirmation = buildDeleteConfirmation(type, target)
    if (!confirmation) return false

    requestActionConfirmation({
      type,
      target,
      ...confirmation,
    })
    return true
  }

  const handlePendingConfirmation = async (text) => {
    if (!pendingConfirmation) return false

    if (pendingConfirmation.requiredText) {
      if (text.trim() !== pendingConfirmation.requiredText) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'ai',
            text: `Saya belum akan menjalankan aksi kritis ini. Ketik ${pendingConfirmation.requiredText} persis jika ingin melanjutkan.`,
            time: getCurrentTime(),
          },
        ])
        return true
      }

      setPendingConfirmation(null)
      setMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          text: 'Saya belum menjalankan reset. Aksi kritis ini belum diaktifkan di sistem.',
          time: getCurrentTime(),
        },
      ])
      return true
    }

    if (/^(batal|cancel|jangan|tidak|nggak|ga|gak)\b/i.test(text.trim())) {
      setPendingConfirmation(null)
      setMessages((prev) => [...prev, { role: 'ai', text: 'Saya batalkan. Tidak ada data yang dihapus.', time: getCurrentTime() }])
      return true
    }

    if (!/^(ya,\s*)?hapus\b|^ya\b|^confirm\b|^lanjut\b/i.test(text.trim())) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          text: 'Saya belum akan menjalankan aksi ini sebelum kamu konfirmasi.',
          time: getCurrentTime(),
          quickActions: ['Ya, Hapus', 'Batal'],
        },
      ])
      return true
    }

    try {
      const response = pendingConfirmation.successText || await executeActionTarget(pendingConfirmation.type, pendingConfirmation.target)
      if (pendingConfirmation.successText) {
        await executeActionTarget(pendingConfirmation.type, pendingConfirmation.target)
      }
      setPendingConfirmation(null)
      setMessages((prev) => [...prev, { role: 'ai', text: response, time: getCurrentTime() }])
    } catch (error) {
      console.error('[Nexus Action] Confirmed action failed:', error)
      const failText = pendingConfirmation.failText || 'Belum berhasil saya hapus. Ada masalah saat memperbarui data.'
      setPendingConfirmation(null)
      setMessages((prev) => [...prev, { role: 'ai', text: failText, time: getCurrentTime() }])
    }

    return true
  }

  const handlePendingAction = async (text) => {
    if (!pendingAction) return false

    const match = findBestMatch(text, pendingAction.candidates, (item) =>
      `${getActionLabel(item)} ${item.platform || item.company || ''}`
    )

    if (!match) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          text: 'Saya belum menemukan pilihan yang cocok.',
          time: getCurrentTime(),
          quickActions: pendingAction.candidates.slice(0, 6).map(getActionLabel),
        },
      ])
      return true
    }

    if (isDestructiveAction(pendingAction.type)) {
      confirmDestructiveAction(pendingAction.type, match)
      setPendingAction(null)
      return true
    }

    try {
      const response = await executeActionTarget(pendingAction.type, match)
      setPendingAction(null)
      setMessages((prev) => [...prev, { role: 'ai', text: response, time: getCurrentTime() }])
    } catch (error) {
      console.error('[Nexus Action] Pending action failed:', error)
      setMessages((prev) => [...prev, { role: 'ai', text: 'Belum berhasil saya perbarui. Ada masalah saat memperbarui data.', time: getCurrentTime() }])
    }

    return true
  }

  const executeChatAction = async (text) => {
    const actionConfig = (() => {
      if (isCriticalActionRequest(text)) return { type: 'critical', resolve: () => ({ critical: true }) }
      if (isDeleteContentRequest(text) && isDeleteAllRequest(text)) {
        return {
          type: 'delete_all_content',
          resolve: () => {
            const candidates = getContentActionItems(generatedContent, contentIdeas).filter(isDraftContent)
            return candidates.length > 0 ? { target: candidates } : { notFound: true }
          },
          notFound: 'Saya belum menemukan draft yang cocok.',
          fail: 'Belum berhasil saya hapus. Ada masalah saat memperbarui data.',
        }
      }
      if (isDeleteContentRequest(text)) return { type: 'delete_content', resolve: () => resolveContentTarget(text), clarify: 'Draft yang mana yang ingin dihapus?', notFound: 'Saya belum menemukan draft yang cocok.', fail: 'Belum berhasil saya hapus. Ada masalah saat memperbarui data.' }
      if (isMarkTaskDoneRequest(text)) return { type: 'mark_task_done', resolve: () => resolveTaskTarget(text), clarify: 'Task yang mana yang ingin ditandai selesai?', notFound: 'Saya belum menemukan task yang cocok.', fail: 'Belum berhasil saya perbarui. Ada masalah saat memperbarui data.' }
      if (isDeleteTaskRequest(text)) return { type: 'delete_task', resolve: () => resolveTaskTarget(text, tasks), clarify: 'Task yang mana yang ingin dihapus?', notFound: 'Saya belum menemukan task yang cocok.', fail: 'Belum berhasil saya hapus. Ada masalah saat memperbarui data.' }
      if (isMarkLeadContactedRequest(text)) return { type: 'mark_lead_contacted', resolve: () => resolveLeadTarget(text), clarify: 'Lead yang mana yang sudah dihubungi?', notFound: 'Saya belum menemukan lead yang cocok.', fail: 'Belum berhasil saya perbarui. Ada masalah saat memperbarui data.' }
      if (isDeleteLeadRequest(text)) return { type: 'delete_lead', resolve: () => resolveLeadTarget(text), clarify: 'Lead yang mana yang ingin dihapus?', notFound: 'Saya belum menemukan lead yang cocok.', fail: 'Belum berhasil saya hapus. Ada masalah saat memperbarui data.' }
      return null
    })()

    if (!actionConfig) return false

    const result = actionConfig.resolve()
    if (result.critical) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          text: [
            'Ini termasuk aksi kritis.',
            '',
            'Saya tidak akan menjalankannya dari chat tanpa konfirmasi eksplisit.',
            '',
            'Ketik RESET WORKSPACE jika kamu benar-benar ingin melanjutkan.',
          ].join('\n'),
          time: getCurrentTime(),
        },
      ])
      setPendingConfirmation({
        type: 'critical_unavailable',
        requiredText: 'RESET WORKSPACE',
      })
      return true
    }

    if (result.notFound) {
      setMessages((prev) => [...prev, { role: 'ai', text: actionConfig.notFound, time: getCurrentTime() }])
      return true
    }
    if (result.needsClarification) {
      askActionClarification(actionConfig.type, result.candidates, actionConfig.clarify)
      return true
    }

    if (isDestructiveAction(actionConfig.type)) {
      confirmDestructiveAction(actionConfig.type, result.target)
      return true
    }

    try {
      const response = await executeActionTarget(actionConfig.type, result.target)
      setMessages((prev) => [...prev, { role: 'ai', text: response, time: getCurrentTime() }])
    } catch (error) {
      console.error(`[Nexus Action] ${actionConfig.type} failed:`, error)
      setMessages((prev) => [...prev, { role: 'ai', text: actionConfig.fail, time: getCurrentTime() }])
    }

    return true
  }

  const handlePendingContentDraft = async (trimmed) => {
    if (!pendingContentDraft) return false

    const platform = normalizeContentPlatform(trimmed)
    if (!platform) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          text: 'Pilih platform draft yang ingin dibuat.',
          time: getCurrentTime(),
          quickActions: CONTENT_PLATFORM_ACTIONS,
        },
      ])
      return true
    }

    const generated = await generateContentIdea(`${platform} ${pendingContentDraft.prompt}`)
    setPendingContentDraft(null)
    await saveGeneratedDraft(generated)
    return true
  }

  const handlePendingTask = async (trimmed) => {
    if (!pendingTask) return false

    if (pendingTask.step === 'awaiting_time') {
      if (/^pilih jam/i.test(trimmed)) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'ai',
            text: 'Silakan ketik jam pengingatnya. Contoh: 09:30 atau jam 3 sore.',
            time: getCurrentTime(),
          },
        ])
        return true
      }

      const dueTime = parseTimeAnswer(trimmed)
      if (!dueTime) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'ai',
            text: 'Saya belum menangkap jamnya. Pilih salah satu opsi atau ketik seperti 09:00 WIB.',
            time: getCurrentTime(),
            quickActions: TASK_TIME_ACTIONS,
          },
        ])
        return true
      }

      const scheduledTask = {
        ...pendingTask,
        dueTime,
      }
      const createdTask = await createScheduledTask(scheduledTask)
      setPendingTask(null)
      setMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          text: buildTimeSelectedConfirmation(createdTask),
          time: getCurrentTime(),
          action: {
            label: 'Lihat Task',
            onClick: onShowTasks,
          },
        },
      ])
      return true
    }

    return false
  }

  const sendMessage = async (text) => {
    const trimmed = text.trim()
    if (!trimmed || isTyping) return

    setIsPinnedToLatest(true)
    window.requestAnimationFrame(() => scrollToLatest('smooth'))

    const userMessage = {
      role: 'user',
      text: trimmed,
      time: getCurrentTime(),
    }
    const nextMessages = [...messages, userMessage]

    setMessages(nextMessages)
    setInput('')
    setIsTyping(true)
    setThinkingText(getThinkingMessage(trimmed))
    setIsThinking(true)

    let routedType = 'chat'

    try {
      await sleep(getThinkingDelay(trimmed))

      const handledPendingConfirmation = await handlePendingConfirmation(trimmed)
      if (handledPendingConfirmation) return

      const handledPendingContentDraft = await handlePendingContentDraft(trimmed)
      if (handledPendingContentDraft) return

      const handledPendingTask = await handlePendingTask(trimmed)
      if (handledPendingTask) return

      const handledPendingAction = await handlePendingAction(trimmed)
      if (handledPendingAction) return

      if (isConversationIntent(trimmed)) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'ai',
            text: buildConversationResponse(trimmed),
            time: getCurrentTime(),
          },
        ])
        return
      }

      const handledChatAction = await executeChatAction(trimmed)
      if (handledChatAction) return

      const handledStateCommand = await executeStateCommand(trimmed)
      if (handledStateCommand) return

      const briefingCommand = getDailyBriefingCommand(trimmed)
      if (briefingCommand) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'ai',
            text: buildDailyBriefingCommandResponse(briefingCommand, briefingInputs),
            time: getCurrentTime(),
          },
        ])
        return
      }

      const memoryReply = answerFromJarvisMemory(trimmed, memories)
      if (memoryReply) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'ai',
            text: memoryReply,
            time: getCurrentTime(),
          },
        ])
        return
      }

      const judgment = evaluateJudgment(trimmed, briefingInputs)
      if (judgment) {
        if (onAddMemory && isMemoryCaptureRequest(trimmed)) {
          const continuityDraft = createJarvisMemoryFromText(trimmed)
          if (['challenge', 'momentum'].includes(continuityDraft?.data?.type)) {
            await onAddMemory(continuityDraft.key, continuityDraft.value, continuityDraft.type)
          }
        }

        setMessages((prev) => [
          ...prev,
          {
            role: 'ai',
            text: judgment.response,
            time: getCurrentTime(),
          },
        ])
        return
      }

      if (isContentDraftRequest(trimmed)) {
        setPendingContentDraft({ prompt: trimmed })
        setMessages((prev) => [
          ...prev,
          {
            role: 'ai',
            text: 'Pilih platform draft yang ingin dibuat.',
            time: getCurrentTime(),
            quickActions: CONTENT_PLATFORM_ACTIONS,
          },
        ])
        return
      }

      if (isExecutiveBriefingRequest(trimmed)) {
        const briefing = generateExecutiveBriefing({
          tasks,
          leads,
          content: [...generatedContent, ...contentIdeas],
          reminders: upcomingTasks,
          profile: userProfile,
        })

        setMessages((prev) => [
          ...prev,
          {
            role: 'ai',
            text: buildExecutiveBriefingResponse(briefing),
            time: getCurrentTime(),
          },
        ])
        return
      }

      if (onAddMemory && isMemoryCaptureRequest(trimmed)) {
        const memoryDraft = createJarvisMemoryFromText(trimmed)
        if (!memoryDraft) {
          setMessages((prev) => [
            ...prev,
            {
              role: 'ai',
              text: 'Baik.',
              time: getCurrentTime(),
            },
          ])
          return
        }

        await onAddMemory(memoryDraft.key, memoryDraft.value, memoryDraft.type)
        setMessages((prev) => [
          ...prev,
          {
            role: 'ai',
            text: buildMemorySavedResponse(memoryDraft),
            time: getCurrentTime(),
          },
        ])
        return
      }

      const route = routeCommand(trimmed, {
        tasks,
        memories,
      })
      routedType = route.type

      if (route.intent === COMMAND_INTENTS.FOCUS_MODE) {
        const nextFocusTask = createFocusTask()
        setMessages((prev) => [
          ...prev,
          {
            role: 'ai',
            text: buildFocusResponse(nextFocusTask),
            time: getCurrentTime(),
          },
        ])
        return
      }

      if (route.intent === COMMAND_INTENTS.PRIORITY_CHECK) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'ai',
            text: buildPriorityCoach(tasks).text,
            time: getCurrentTime(),
          },
        ])
        return
      }

      if (route.intent === COMMAND_INTENTS.TASK_SUMMARY) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'ai',
            text: buildTaskSummaryResponse(tasks, userProfile),
            time: getCurrentTime(),
            action: {
              label: 'Lihat Task',
              onClick: onShowTasks,
            },
          },
        ])
        return
      }

      if (route.intent === COMMAND_INTENTS.REMINDER_SUMMARY) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'ai',
            text: buildReminderSummaryResponse(tasks),
            time: getCurrentTime(),
            action: {
              label: 'Lihat Task',
              onClick: onShowTasks,
            },
          },
        ])
        return
      }

      if (route.intent === COMMAND_INTENTS.DAILY_PLAN) {
        const plan = createDailyPlan()
        setMessages((prev) => [
          ...prev,
          {
            role: 'ai',
            text: buildDailyPlanResponse(plan),
            time: getCurrentTime(),
          },
        ])
        return
      }

      if (route.intent === COMMAND_INTENTS.DAILY_REVIEW) {
        const review = createDailyReview()
        setMessages((prev) => [
          ...prev,
          {
            role: 'ai',
            text: buildDailyReviewResponse(review),
            time: getCurrentTime(),
          },
        ])
        return
      }

      if (route.intent === COMMAND_INTENTS.WEEKLY_REVIEW) {
        const review = createWeeklyReview()
        setMessages((prev) => [
          ...prev,
          {
            role: 'ai',
            text: buildWeeklyReviewResponse(review),
            time: getCurrentTime(),
          },
        ])
        return
      }

      if (route.type === 'lead') {
        if (!route.payload.name) {
          setMessages((prev) => [
            ...prev,
            {
              role: 'ai',
              text: 'Nama lead-nya siapa?',
              time: getCurrentTime(),
            },
          ])
          return
        }

        await executeLeadCreation(trimmed, route.payload)
        return
      }

      if (route.type === 'content') {
        const generated = await generateContentIdea(route.payload.prompt || trimmed)

        await saveGeneratedDraft(generated)
        return
      }

      if (route.type === 'task') {
        const commandTask = route.payload || {}
        const parsedIntent = parseTaskIntent(trimmed)
        const extractedTask = extractTask(trimmed)
        const parsedTask = {
          title: commandTask.title || parsedIntent?.title || extractedTask.title,
          category: commandTask.category || parsedIntent?.category || 'personal',
          status: commandTask.status || 'pending',
          priority: commandTask.priority || parsedIntent?.priority || 'medium',
        }
        const draftTask = buildDraftTask(parsedTask, {
          dueDate: commandTask.dueDate || extractedTask.dueDate,
          dueTime: commandTask.dueTime || extractedTask.dueTime,
        })

        if (hasScheduleSignal(draftTask) && !draftTask.dueTime) {
          setPendingTask({
            step: 'awaiting_time',
            title: draftTask.title,
            category: draftTask.category,
            status: draftTask.status,
            priority: draftTask.priority,
            dueDate: draftTask.dueDate,
            dueDateValue: draftTask.dueDateValue,
          })
          setMessages((prev) => [
            ...prev,
            {
              role: 'ai',
              text: buildTimeClarification(draftTask, userProfile),
              time: getCurrentTime(),
              quickActions: TASK_TIME_ACTIONS,
            },
          ])
          return
        }

        if (hasScheduleSignal(draftTask)) {
          const createdTask = await createScheduledTask(draftTask)
          setMessages((prev) => [
            ...prev,
            {
              role: 'ai',
              text: buildImmediateScheduleConfirmation(createdTask, memories, userProfile),
              time: getCurrentTime(),
              action: {
                label: 'Lihat Task',
                onClick: onShowTasks,
              },
            },
          ])
          return
        }

        const createdTask = await onAddTask(parsedTask)
        setMessages((prev) => [
          ...prev,
          {
            role: 'ai',
            text: buildTaskCreatedResponse(createdTask, memories, tasks, userProfile),
            time: getCurrentTime(),
            action: {
              label: 'Lihat Task',
              onClick: onShowTasks,
            },
          },
        ])
        return
      }

      if (route.payload.needsClarification) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'ai',
            text: route.payload.message,
            time: getCurrentTime(),
          },
        ])
        return
      }

      const reply = await generateNexusResponse(trimmed, tasks, memories, userProfile)
      setMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          text: reply,
          time: getCurrentTime(),
        },
      ])
    } catch (error) {
      if (routedType !== 'chat') {
        console.error(`[Nexus Chat] ${routedType} command failed:`, error)
      }

      const errorText = routedType === 'task'
        ? 'Task belum tersimpan.'
        : routedType === 'lead'
        ? 'Lead belum tersimpan.'
        : routedType === 'content'
        ? 'Ide konten belum tersimpan.'
        : error.message === 'Missing VITE_GEMINI_API_KEY'
        ? 'Nexus belum dikonfigurasi. Tambahkan VITE_GEMINI_API_KEY ke file .env, lalu restart dev server.'
        : `Saya belum bisa menghubungi Nexus saat ini. ${error.message || 'Coba lagi sebentar lagi.'}`

      setMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          text: errorText,
          time: getCurrentTime(),
        },
      ])
    } finally {
      setIsTyping(false)
      setIsThinking(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    sendMessage(input)
  }

  const handleQuickReply = async (type) => {
    if (isTyping) return

    const labels = {
      focus: 'Fokus hari ini',
      important: 'Ada yang penting?',
      leads: 'Cek prospek',
      content: 'Buat konten',
      summary: 'Ringkas hari ini',
      missed: 'Aku ketinggalan apa?',
      tomorrow: 'Rencanakan besok',
    }
    const localContent = [...generatedContent, ...contentIdeas]
    const responses = {
      focus: buildFocusTodayReply({ tasks, leads, content: localContent }),
      important: buildDailyBriefingCommandResponse('missed', briefingInputs),
      leads: buildReviewLeadsReply(leads),
      content: buildCreateContentReply(),
      summary: buildDailyBriefingCommandResponse('today_summary', briefingInputs),
      missed: buildDailyBriefingCommandResponse('missed', briefingInputs),
      tomorrow: buildDailyBriefingCommandResponse('tomorrow_focus', briefingInputs),
    }

    if (type === 'content') {
      setPendingContentDraft({ prompt: 'Create content' })
    }

    const userText = labels[type] || 'Fokus hari ini'
    const responseText = responses[type] || responses.focus

    setIsTyping(true)
    setThinkingText(getThinkingMessage(userText))
    setIsThinking(true)
    setMessages((prev) => [
      ...prev,
      {
        role: 'user',
        text: userText,
        time: getCurrentTime(),
      },
    ])

    await sleep(getThinkingDelay(userText))

    setMessages((prev) => [
      ...prev,
      {
        role: 'ai',
        text: responseText,
        time: getCurrentTime(),
        quickActions: type === 'content' ? CONTENT_PLATFORM_ACTIONS : undefined,
      },
    ])
    setIsTyping(false)
    setIsThinking(false)
  }

  const pushAssistantMessage = (text) => {
    setMessages((prev) => [
      ...prev,
      {
        role: 'ai',
        text,
        time: getCurrentTime(),
      },
    ])
  }

  const showUnavailable = () => {
    pushAssistantMessage('Fitur ini akan segera tersedia.')
  }

  const handleCompletePriorityTask = async () => {
    if (!topPriority || !onToggleTask) {
      showUnavailable()
      return
    }

    try {
      await onToggleTask(topPriority.id, topPriority.status)
      pushAssistantMessage(`Tugas "${topPriority.title}" sudah selesai.`)
    } catch {
      pushAssistantMessage('Aksi belum berhasil. Coba lagi sebentar lagi.')
    }
  }

  const handleMarkLeadFollowedUp = async () => {
    if (!relatedLead || !onMarkLeadContacted) {
      showUnavailable()
      return
    }

    try {
      await onMarkLeadContacted(relatedLead.id)
      pushAssistantMessage(`${relatedLead.name} ditandai sudah follow up.`)
    } catch {
      pushAssistantMessage('Aksi belum berhasil. Coba lagi sebentar lagi.')
    }
  }

  const handleMarkContentDrafted = async () => {
    if (!relatedContent || !onMarkContentDrafted) {
      showUnavailable()
      return
    }

    try {
      await onMarkContentDrafted(relatedContent.id)
      pushAssistantMessage(`Draft "${relatedContent.title}" sudah ditandai dibuat.`)
    } catch {
      pushAssistantMessage('Aksi belum berhasil. Coba lagi sebentar lagi.')
    }
  }

  const insightActions = (() => {
    if (!topPriority) return []

    if (isContentPriority(topPriority)) {
      return [
        { label: 'Buat Draft', onClick: handleMarkContentDrafted },
        { label: 'Jadwalkan Konten', onClick: showUnavailable },
        { label: 'Lihat Content', onClick: onShowContent || showUnavailable },
      ]
    }

    if (isLeadPriority(topPriority)) {
      return [
        { label: 'Draft Pesan', onClick: showUnavailable },
        { label: 'Tandai Sudah Follow Up', onClick: handleMarkLeadFollowedUp },
        { label: 'Lihat Lead', onClick: onShowLeads || showUnavailable },
      ]
    }

    return [
      { label: 'Tandai Selesai', onClick: handleCompletePriorityTask },
      { label: 'Jadwalkan Ulang', onClick: showUnavailable },
      { label: 'Lihat Task', onClick: onShowTasks || showUnavailable },
    ]
  })()

  return (
    <section className="chat-panel nexus-home">
      <header className="nexus-command-center">
        <div className="jarvis-status">
          <span>
            <span className="status-dot"></span>
            NEXUS ACTIVE
          </span>
          <span>Memory Active</span>
        </div>

        <div className="jarvis-greeting">
          <strong>{buildNexusWelcomeMessage(userProfile, profileCompleted, memories, lastSeenAt).split('\n')[0]}</strong>
          <span>{getJarvisPrompt()}</span>
        </div>

        <section className="daily-briefing-section" aria-label="Daily Briefing">
          {dailyBriefingCards.map((card) => (
            <button
              type="button"
              className="daily-briefing-action-card"
              key={card.id}
              onClick={() => sendMessage(card.command)}
              disabled={isTyping}
            >
              <span>{card.title}</span>
              <strong>{card.value}</strong>
              <small>{card.detail}</small>
            </button>
          ))}
        </section>
      </header>

      <JarvisChat
        messages={messages}
        isThinking={isThinking}
        thinkingText={thinkingText}
        scrollRef={scrollRef}
        messagesEndRef={messagesEndRef}
        onScroll={handleChatScroll}
        showLatestButton={!isPinnedToLatest}
        onScrollToLatest={() => scrollToLatest('smooth')}
        getCurrentTime={getCurrentTime}
        onQuickAction={sendMessage}
      />

      <QuickReplies onSelect={handleQuickReply} />

      <form className="chat-input-row fixed-chat-input" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Ngobrol dengan Nexus..."
          value={input}
          disabled={isTyping}
          onChange={(e) => setInput(e.target.value)}
        />
        <VoiceButton disabled={isTyping} />
        <button type="submit" className="send-btn" aria-label="Send message" disabled={isTyping}>➤</button>
      </form>
    </section>
  )
}
