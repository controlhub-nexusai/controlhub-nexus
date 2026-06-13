import { logMvpMode } from './mvpMode'

const CONFIDENCE_THRESHOLD = 0.52

const DEFAULT_FAQS = [
  {
    id: 'faq-hours',
    question: 'What are your operating hours?',
    answer: 'We operate Monday-Friday from 08:00 to 17:00.',
    category: 'Operations',
  },
  {
    id: 'faq-location',
    question: 'Where is your location?',
    answer: 'Our main service desk is available online. For branch visits, contact support to confirm the nearest location.',
    category: 'Operations',
  },
  {
    id: 'faq-pricing',
    question: 'How much does the service cost?',
    answer: 'Pricing depends on the selected package. Our admin team can share the latest package details and consultation options.',
    category: 'Pricing',
  },
  {
    id: 'faq-register',
    question: 'How do I register?',
    answer: 'You can register by filling out the customer form, confirming your contact details, and waiting for admin verification.',
    category: 'Registration',
  },
  {
    id: 'faq-documents',
    question: 'What documents should I bring?',
    answer: 'Please bring your identity document, registration proof, and any supporting files related to your service request.',
    category: 'General',
  },
]

const DEFAULT_KNOWLEDGE_BASE = [
  {
    id: 'kb-support',
    title: 'Support escalation policy',
    content: 'Questions about account access, payment exceptions, complaints, or unclear requirements should be escalated to a human operator.',
    category: 'Support',
  },
  {
    id: 'kb-registration',
    title: 'Registration workflow',
    content: 'Registration requires customer name, contact number, preferred service, and document verification before the service can be scheduled.',
    category: 'Registration',
  },
]

const DEFAULT_CONVERSATIONS = [
  {
    id: 'conv-1',
    customer_name: 'Maya',
    message: 'What are your operating hours?',
    ai_response: 'We operate Monday-Friday from 08:00 to 17:00.',
    status: 'resolved',
    created_at: new Date().toISOString(),
  },
  {
    id: 'conv-2',
    customer_name: 'Andre',
    message: 'Can I get a special enterprise package?',
    ai_response: 'This needs a human operator because pricing exceptions require review.',
    status: 'escalated',
    created_at: new Date().toISOString(),
  },
]

const DEFAULT_TICKETS = [
  {
    id: 'TCK-1001',
    conversation_id: 'conv-2',
    customer_name: 'Andre',
    question: 'Can I get a special enterprise package?',
    assigned_admin: 'Unassigned',
    status: 'Open',
  },
]

function tokenize(text = '') {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2)
}

function scoreMatch(question, sourceText) {
  const queryTokens = tokenize(question)
  const sourceTokens = new Set(tokenize(sourceText))

  if (queryTokens.length === 0 || sourceTokens.size === 0) return 0

  const hits = queryTokens.filter((token) => sourceTokens.has(token)).length
  return hits / queryTokens.length
}

function findBestMatch(question, faqs = [], knowledgeBase = []) {
  const faqMatches = faqs.map((faq) => ({
    type: 'faq',
    source: faq,
    answer: faq.answer,
    confidence: scoreMatch(question, `${faq.question} ${faq.answer} ${faq.category}`),
  }))

  const kbMatches = knowledgeBase.map((article) => ({
    type: 'knowledge_base',
    source: article,
    answer: article.content,
    confidence: scoreMatch(question, `${article.title} ${article.content} ${article.category}`),
  }))

  return [...faqMatches, ...kbMatches].sort((a, b) => b.confidence - a.confidence)[0] || null
}

function normalizeConversation(row) {
  return {
    id: row.id,
    customer_name: row.customer_name || 'Customer',
    message: row.message || '',
    ai_response: row.ai_response || '',
    status: row.status || 'resolved',
    created_at: row.created_at || new Date().toISOString(),
  }
}

function normalizeTicket(row) {
  return {
    id: row.id,
    conversation_id: row.conversation_id,
    customer_name: row.customer_name || 'Customer',
    question: row.question || '',
    assigned_admin: row.assigned_admin || 'Unassigned',
    status: row.status || 'Open',
  }
}

function safeSelect(_table, _columns, fallback) {
  logMvpMode()
  return fallback
}

function safeInsert(_table, _payload, fallback) {
  logMvpMode()
  return fallback
}

export async function loadCustomerServiceWorkspace() {
  const [faqs, knowledgeBase, conversations, tickets] = [
    safeSelect('faq', 'id,question,answer,category', DEFAULT_FAQS),
    safeSelect('knowledge_base', 'id,title,content,category,created_by', DEFAULT_KNOWLEDGE_BASE),
    safeSelect('conversations', 'id,customer_name,message,ai_response,status,created_at', DEFAULT_CONVERSATIONS),
    safeSelect('tickets', 'id,conversation_id,assigned_admin,status', DEFAULT_TICKETS),
  ]

  return {
    faqs,
    knowledgeBase,
    conversations: conversations.map(normalizeConversation),
    tickets: tickets.map((ticket) => normalizeTicket({
      ...ticket,
      customer_name: ticket.customer_name,
      question: ticket.question,
    })),
  }
}

export async function createFaq(faq) {
  const payload = {
    question: faq.question,
    answer: faq.answer,
    category: faq.category || 'General',
  }

  const fallback = {
    id: `faq-${Date.now()}`,
    ...payload,
  }

  return Promise.resolve(safeInsert('faq', payload, fallback))
}

export async function createKnowledgeArticle(article) {
  const payload = {
    title: article.title,
    content: article.content,
    category: article.category || 'General',
    created_by: article.created_by,
  }

  const fallback = {
    id: `kb-${Date.now()}`,
    ...payload,
  }

  return Promise.resolve(safeInsert('knowledge_base', payload, fallback))
}

export async function answerCustomerQuestion({ customerName, question, faqs, knowledgeBase }) {
  const bestMatch = findBestMatch(question, faqs, knowledgeBase)
  const confidence = bestMatch?.confidence || 0
  const isResolved = Boolean(bestMatch && confidence >= CONFIDENCE_THRESHOLD)
  const aiResponse = isResolved
    ? bestMatch.answer
    : 'Saya belum punya jawaban yang cukup yakin. Saya buatkan tiket untuk human support.'

  const conversationFallback = normalizeConversation({
    id: `conv-${Date.now()}`,
    customer_name: customerName || 'Customer',
    message: question,
    ai_response: aiResponse,
    status: isResolved ? 'resolved' : 'escalated',
    created_at: new Date().toISOString(),
  })

  const conversation = normalizeConversation(safeInsert('conversations', {
    customer_name: customerName || 'Customer',
    message: question,
    ai_response: aiResponse,
    status: conversationFallback.status,
  }, conversationFallback))

  let ticket = null
  if (!isResolved) {
    ticket = await createEscalationTicket({
      conversationId: conversation.id,
      customerName: conversation.customer_name,
      question,
    })
  }

  return {
    conversation,
    ticket,
    confidence,
    matchType: bestMatch?.type || 'none',
    category: bestMatch?.source?.category || 'General',
  }
}

export async function createEscalationTicket({ conversationId, customerName, question }) {
  const ticketId = `TCK-${Date.now().toString().slice(-6)}`
  const fallback = {
    id: ticketId,
    conversation_id: conversationId,
    customer_name: customerName || 'Customer',
    question,
    assigned_admin: 'Unassigned',
    status: 'Open',
  }

  const saved = safeInsert('tickets', {
    id: ticketId,
    conversation_id: conversationId,
    assigned_admin: null,
    status: 'Open',
  }, fallback)

  return normalizeTicket({
    ...fallback,
    ...saved,
  })
}

export function buildCustomerServiceAnalytics({ conversations = [], tickets = [], faqs = [], knowledgeBase = [] }) {
  const today = new Date().toISOString().slice(0, 10)
  const todayQuestions = conversations.filter((conversation) =>
    (conversation.created_at || '').slice(0, 10) === today
  )
  const aiResolved = conversations.filter((conversation) => conversation.status === 'resolved')
  const escalated = conversations.filter((conversation) => conversation.status === 'escalated')
  const total = conversations.length || 1
  const categories = [...faqs, ...knowledgeBase].reduce((acc, item) => {
    acc[item.category || 'General'] = (acc[item.category || 'General'] || 0) + 1
    return acc
  }, {})

  return {
    totalQuestionsToday: todayQuestions.length,
    aiResolved: aiResolved.length,
    humanEscalations: tickets.length || escalated.length,
    resolutionRate: Math.round((aiResolved.length / total) * 100),
    humanResolutionRate: Math.round((escalated.length / total) * 100),
    knowledgeCount: faqs.length + knowledgeBase.length,
    topQuestions: conversations.slice(0, 5).map((conversation) => conversation.message),
    mostAskedCategories: Object.entries(categories)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4),
    dailyVolume: conversations.length,
    weeklyVolume: conversations.length,
  }
}

export { CONFIDENCE_THRESHOLD, DEFAULT_FAQS, DEFAULT_KNOWLEDGE_BASE }
