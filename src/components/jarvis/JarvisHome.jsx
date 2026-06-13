import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { generateNexusResponse } from '../../services/geminiService'
import { parseTaskIntent } from '../../services/taskIntentParser'
import { COMMAND_INTENTS, routeCommand } from '../../services/commandRouter'
import { extractTask } from '../../services/taskParser'
import { buildDailyPlanResponse, generateDailyPlan } from '../../services/dailyPlanningService'
import { buildDailyReviewResponse, generateDailyReview } from '../../services/dailyReviewService'
import { buildWeeklyReviewResponse, generateWeeklyReview } from '../../services/weeklyReviewService'
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

const TASK_TIME_ACTIONS = ['09:00 Pagi', '12:00 Siang', '18:00 Sore', 'Pilih Jam Lain']
const CONTENT_PLATFORM_ACTIONS = ['Instagram', 'X', 'YouTube']
const PENDING_TASK_KEY = 'nexus.pendingTask'
const THINKING_MESSAGES = [
  'Jarvis sedang mengetik...',
  '🧠 Jarvis sedang berpikir...',
  '📋 Mengecek prioritas...',
  'Aku cek sebentar...',
  'Sebentar, aku rapikan konteksnya...',
]

const THINKING_DELAYS = {
  simple: [800, 1500],
  medium: [1500, 3000],
  strategic: [3000, 6000],
}

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
    return Math.random() > 0.5 ? '🧠 Jarvis sedang berpikir...' : '📋 Mengecek prioritas...'
  }

  return getRandomThinkingMessage()
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

function buildNexusWelcomeMessage(profile, profileCompleted) {
  return getJarvisOpeningMessage(profile, profileCompleted)
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
    '✅ Draft berhasil dibuat.',
    '',
    '📂 Disimpan ke Content Workspace.',
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
      'Hari ini masih cukup kosong di data Jarvis.',
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

function isMemoryCaptureRequest(text = '') {
  return /\b(ingat|simpan|catat|minta|butuh|perlu|follow up|proposal|minggu depan|besok)\b/i.test(text)
    && !/^(buat|bikin|tambahkan|add)\s+(task|lead|konten|content)/i.test(text)
}

function buildMemorySavedResponse(text = '') {
  const reminderHint = /\b(besok|minggu depan|nanti|deadline|tanggal|pagi|siang|sore|malam)\b/i.test(text)

  return [
    'Oke, aku simpan.',
    '',
    reminderHint
      ? 'Aku akan ingatkan saat waktunya mendekat.'
      : 'Nanti aku pakai ini sebagai konteks.',
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
    .replace(/\b(follow up|followup|hubungi|lead|client|customer|meeting|dengan|ke)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()
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

  const [messages, setMessages] = useState([
    {
      role: 'ai',
      type: 'daily-briefing',
      text: buildNexusWelcomeMessage(userProfile, profileCompleted),
      time: getCurrentTime(),
    },
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isThinking, setIsThinking] = useState(false)
  const [thinkingText, setThinkingText] = useState(THINKING_MESSAGES[0])
  const [pendingTask, setPendingTask] = useState(loadPendingTask)
  const [pendingContentDraft, setPendingContentDraft] = useState(null)
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

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, isThinking])

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
            text: buildNexusWelcomeMessage(userProfile, profileCompleted),
          }
          : message
      )
    )
  }, [profileCompleted, tasksLoading, userProfile])

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

      const handledPendingContentDraft = await handlePendingContentDraft(trimmed)
      if (handledPendingContentDraft) return

      const handledPendingTask = await handlePendingTask(trimmed)
      if (handledPendingTask) return

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
        await onAddMemory(`note_${Date.now()}`, trimmed, 'note')
        setMessages((prev) => [
          ...prev,
          {
            role: 'ai',
            text: buildMemorySavedResponse(trimmed),
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

        const createdLead = await onAddLead(route.payload)
        setMessages((prev) => [
          ...prev,
          {
            role: 'ai',
            text: buildLeadCreatedResponse(createdLead),
            time: getCurrentTime(),
          },
        ])
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
        ? 'Nexus AI belum dikonfigurasi. Tambahkan VITE_GEMINI_API_KEY ke file .env, lalu restart dev server.'
        : `Saya belum bisa menghubungi Nexus AI saat ini. ${error.message || 'Coba lagi sebentar lagi.'}`

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
      important: buildWhatDidIMissReply({ tasks, leads, content: localContent }),
      leads: buildReviewLeadsReply(leads),
      content: buildCreateContentReply(),
      summary: buildDailySummaryReply(tasks, leads, localContent),
      missed: buildWhatDidIMissReply({ tasks, leads, content: localContent }),
      tomorrow: buildTomorrowPlanReply({ tasks, leads, content: localContent }),
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
      pushAssistantMessage(`Bagus. Tugas "${topPriority.title}" berhasil diselesaikan.`)
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
      <div className="jarvis-status">
        <span>
          <span className="status-dot"></span>
          NEXUS ACTIVE
        </span>
        <span>Memory Active</span>
      </div>

      <div className="jarvis-greeting">
        <strong>{buildNexusWelcomeMessage(userProfile, profileCompleted).split('\n')[0]}</strong>
        <span>{getJarvisPrompt()}</span>
      </div>

      <JarvisChat
        messages={messages}
        isThinking={isThinking}
        thinkingText={thinkingText}
        scrollRef={scrollRef}
        getCurrentTime={getCurrentTime}
        onQuickAction={sendMessage}
      />

      <QuickReplies onSelect={handleQuickReply} />

      <form className="chat-input-row fixed-chat-input" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Ngobrol dengan Jarvis..."
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
