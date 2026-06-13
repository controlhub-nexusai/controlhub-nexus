import { GoogleGenerativeAI } from '@google/generative-ai'
import { nexusSystemPrompt } from '../prompts/nexusSystemPrompt'
import { buildNexusContext } from './contextBuilder'
import { buildDailyGreeting, buildUserContext } from './personalizationService'

const GEMINI_MODEL = 'gemini-3.1-flash-lite'
const MISSING_GEMINI_KEY_MESSAGE = 'Missing VITE_GEMINI_API_KEY'
const GEMINI_BUSY_MESSAGE = 'Nexus sedang sibuk sementara. Coba lagi sebentar lagi.'

function getGeminiApiKey() {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY

  if (import.meta.env.DEV) {
    console.info('[Nexus Gemini] VITE_GEMINI_API_KEY loaded:', Boolean(apiKey))
  }

  if (!apiKey) {
    throw new Error(MISSING_GEMINI_KEY_MESSAGE)
  }

  return apiKey
}

function formatTaskList(tasks) {
  if (tasks.length === 0) return '* Belum ada tugas'

  return tasks
    .map((task) => `* ${task.title} (${task.category}, ${task.priority}, ${task.status})`)
    .join('\n')
}

function formatMemoryList(memories = []) {
  if (memories.length === 0) return '* Belum ada memory'

  return memories
    .map((memory) => `* ${memory.key}: ${memory.value}`)
    .join('\n')
}

function asSentence(text = '') {
  return text.endsWith('.') ? text : `${text}.`
}

function buildDailyBriefing(context, profile) {
  const userContext = buildUserContext(profile)

  if (!profile || profile.isFallback) {
    return [
      userContext.greeting,
      userContext.recommendation,
    ].join('\n')
  }

  if (context.currentTasks.length > 0) {
    return `${asSentence(buildDailyGreeting(profile))} Ada ${context.pendingTasks.length} tugas aktif hari ini.`
  }

  return 'Belum ada tugas aktif.'
}

function buildFinalPrompt(message, tasks, memories = [], profile) {
  const context = buildNexusContext(tasks)
  const userContext = buildUserContext(profile)

  return `SYSTEM:
${nexusSystemPrompt}

DAILY BRIEFING:
${buildDailyBriefing(context, profile)}

USER CONTEXT:
Greeting: ${userContext.greeting}
Role: ${userContext.role || '-'}
Project: ${userContext.project || '-'}
Focus: ${userContext.focus || '-'}
Recommendation: ${userContext.recommendation}

CONTEXT:
Current Tasks:
${formatTaskList(context.currentTasks)}

Completed Tasks:
${formatTaskList(context.completedTasks)}

Pending Tasks:
${formatTaskList(context.pendingTasks)}

Priority Tasks:
${formatTaskList(context.priorityTasks)}

Memory:
${formatMemoryList(memories)}

USER:
${message}

Jawab sebagai Nexus AI, personal AI assistant. Gunakan Bahasa Indonesia yang natural kecuali user menulis dalam Bahasa Inggris.
Gunakan Memory untuk menjawab pertanyaan tentang user, pekerjaan, project, goal, dan platform.
Maksimal 1-2 kalimat pendek. Action-focused. Jangan mengajar, jangan memberi esai, jangan membuat intro chatbot.`
}

function isHighDemandError(error) {
  const message = error.message || ''
  return message.includes('503')
    || message.toLowerCase().includes('high demand')
    || message.toLowerCase().includes('overloaded')
    || message.toLowerCase().includes('service unavailable')
}

export async function generateNexusResponse(message, tasks, memories = [], profile) {
  const apiKey = getGeminiApiKey()
  const prompt = buildFinalPrompt(message, tasks, memories, profile)
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL })

  try {
    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 160,
      },
    })

    return result.response.text() || 'Saya belum bisa membuat respons sekarang.'
  } catch (error) {
    if (isHighDemandError(error)) {
      throw new Error(GEMINI_BUSY_MESSAGE)
    }

    throw new Error(`Request Gemini gagal menggunakan ${GEMINI_MODEL}. Jika model ini belum tersedia untuk API key atau region kamu, cek akses model di Google AI Studio. ${error.message || 'Periksa API key dan akses model kamu.'}`)
  }
}
